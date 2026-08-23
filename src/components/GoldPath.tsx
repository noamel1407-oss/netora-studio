import { useCallback, useMemo, useRef } from 'react';

import {
  PLATFORM,
  cameraAt,
  pathFor,
  pathHead,
  project,
  travelOf,
  type Camera,
  type Projected,
  type Scene,
  type Vec3,
} from '../journey/scene';
import { useJourney } from '../journey/progress';
import './GoldPath.css';

type Props = { scene: Scene };

/** Half-width of the rail in world units — it thins with distance by itself. */
const HALF_WIDTH = 23;
/** How much of the drawn length tapers away at the leading tip. */
const TIP = 26;

type Ribbon = { halo: string; shade: string; body: string; core: string; filaments: string };

const EMPTY: Ribbon = { halo: '', shade: '', body: '', core: '', filaments: '' };

/**
 * The gold path — the spine of the whole journey.
 *
 * It is not a line drawn over the picture: it is a curve standing in the same
 * world as the platform, projected every frame through the same camera, so it
 * foreshortens, thins with distance and swings past the lens exactly as the
 * architecture does. Scroll moves the light's leading edge forward along it;
 * scrolling back pulls it in again, because the head is a function of position,
 * not an animation that was started.
 *
 * Two layers: the stretch beyond the platform is painted under it, the stretch
 * this side of it over the top, which is what lets the route arrive at the
 * architecture rather than float in front of it.
 */
export function GoldPath({ scene }: Props) {
  const farRef = useRef<SVGSVGElement>(null);
  const nearRef = useRef<SVGSVGElement>(null);

  const samples = useMemo(() => pathFor(scene), [scene]);
  const halfWidth = HALF_WIDTH * scene.s;

  const onScroll = useCallback(
    (progress: number) => {
      const far = farRef.current;
      const near = nearRef.current;
      if (!far || !near) return;

      const camera = cameraAt(travelOf(progress), scene);
      /* The route ignites over the first breath of the travel rather than
         snapping on under the departing statement. */
      const ignition = Math.min(1, camera.t / 0.07).toFixed(3);
      far.style.opacity = ignition;
      near.style.opacity = ignition;

      const drawn = visibleRun(samples, camera);

      /* The split plane is the platform itself: everything past it is
         occluded by the marble, everything nearer runs over it. */
      const split = drawn.findIndex((point) => point.world.z > PLATFORM.z);
      const beyond = split === -1 ? drawn : drawn.slice(0, split + 1);
      const hither = split === -1 ? [] : drawn.slice(split);

      paint(far, ribbon(beyond, halfWidth, drawn.length - beyond.length));
      paint(near, ribbon(hither, halfWidth, 0));

      const tail = drawn[drawn.length - 1];
      const head = drawn[0];
      if (tail && head) {
        for (const svg of [far, near]) {
          const gradient = svg.querySelector('linearGradient');
          if (!gradient) continue;
          gradient.setAttribute('x1', String(Math.round(head.x)));
          gradient.setAttribute('y1', String(Math.round(head.y)));
          gradient.setAttribute('x2', String(Math.round(tail.x)));
          gradient.setAttribute('y2', String(Math.round(tail.y)));
        }
      }
    },
    [samples, scene, halfWidth],
  );

  useJourney(onScroll, true);

  const view = `0 0 ${Math.round(scene.width)} ${Math.round(scene.height)}`;

  return (
    <>
      <svg className="gold gold--far" ref={farRef} viewBox={view} aria-hidden="true" focusable="false">
        {defs('gold-far')}
        <path className="gold__halo" d="" />
        <path className="gold__shade" d="" />
        <path className="gold__filaments" d="" />
        <path className="gold__body" fill="url(#gold-far)" d="" />
        <path className="gold__core" d="" />
      </svg>

      <svg className="gold gold--near" ref={nearRef} viewBox={view} aria-hidden="true" focusable="false">
        {defs('gold-near')}
        <path className="gold__halo" d="" />
        <path className="gold__shade" d="" />
        <path className="gold__filaments" d="" />
        <path className="gold__body" fill="url(#gold-near)" d="" />
        <path className="gold__core" d="" />
      </svg>
    </>
  );
}

const defs = (id: string) => (
  <defs>
    <linearGradient id={id} gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#e0ab52" stopOpacity="0.7" />
      <stop offset="0.26" stopColor="#f7cf82" stopOpacity="0.97" />
      <stop offset="0.62" stopColor="#e8b962" stopOpacity="0.95" />
      <stop offset="1" stopColor="#cf9b45" stopOpacity="0.85" />
    </linearGradient>
  </defs>
);

function paint(svg: SVGSVGElement, shape: Ribbon) {
  const [halo, shade, filaments, body, core] = svg.querySelectorAll('path');
  halo?.setAttribute('d', shape.halo);
  shade?.setAttribute('d', shape.shade);
  filaments?.setAttribute('d', shape.filaments);
  body?.setAttribute('d', shape.body);
  core?.setAttribute('d', shape.core);
}

type Point = Projected & { world: Vec3 };

/**
 * The stretch of rail that is both lit and in front of the lens, ordered from
 * the leading edge back towards the camera.
 */
function visibleRun(samples: Vec3[], camera: Camera): Point[] {
  const head = pathHead(camera.t);
  const run: Point[] = [];

  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const world = samples[i];
    if (world.z < head) continue;
    const point = project(world, camera);
    if (!point.visible) break;
    run.push({ ...point, world });
  }

  return run;
}

/**
 * Turns the projected centre line into a closed ribbon. The width is the
 * projected width of a fixed physical rail, so it narrows into the distance on
 * its own, and tapers to nothing at the leading tip.
 */
function ribbon(points: Point[], halfWidth: number, tipOffset: number): Ribbon {
  if (points.length < 3) return EMPTY;

  const left: string[] = [];
  const right: string[] = [];
  const outerLeft: string[] = [];
  const outerRight: string[] = [];
  const haloLeft: string[] = [];
  const haloRight: string[] = [];
  const core: string[] = [];
  const filamentA: string[] = [];
  const filamentB: string[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];

    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;

    const fade = Math.min(1, (i + tipOffset) / TIP);
    const width = Math.max(0.4, halfWidth * point.k * (0.35 + 0.65 * fade));
    const gap = width * 2.6;

    const edge = width * 1.45;

    left.push(`${(point.x + nx * width).toFixed(1)} ${(point.y + ny * width).toFixed(1)}`);
    right.unshift(`${(point.x - nx * width).toFixed(1)} ${(point.y - ny * width).toFixed(1)}`);
    outerLeft.push(`${(point.x + nx * edge).toFixed(1)} ${(point.y + ny * edge).toFixed(1)}`);
    outerRight.unshift(`${(point.x - nx * edge).toFixed(1)} ${(point.y - ny * edge).toFixed(1)}`);
    haloLeft.push(`${(point.x + nx * gap).toFixed(1)} ${(point.y + ny * gap).toFixed(1)}`);
    haloRight.unshift(`${(point.x - nx * gap).toFixed(1)} ${(point.y - ny * gap).toFixed(1)}`);
    core.push(`${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
    filamentA.push(`${(point.x + nx * gap).toFixed(1)} ${(point.y + ny * gap).toFixed(1)}`);
    filamentB.push(`${(point.x - nx * gap).toFixed(1)} ${(point.y - ny * gap).toFixed(1)}`);
  }

  return {
    /* The light the rail spills into the air around it. Drawn as geometry on
       purpose: a blur filter over a viewport-sized SVG costs more per frame
       than everything else in the scene put together. */
    halo: `M${haloLeft.join('L')}L${haloRight.join('L')}Z`,
    /* A warm shadow just outside the rail: without it the metal reads as a
       sticker wherever the route crosses the platform's own pale marble. */
    shade: `M${outerLeft.join('L')}L${outerRight.join('L')}Z`,
    body: `M${left.join('L')}L${right.join('L')}Z`,
    core: `M${core.join('L')}`,
    /* Two hairlines running alongside — the rail's own reflection in the
       city's light, and the only decoration the route gets. */
    filaments: `M${filamentA.join('L')}M${filamentB.join('L')}`,
  };
}
