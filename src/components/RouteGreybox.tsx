import { useCallback, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';

import { ProjectScreen } from './ProjectScreen';
import { GROUND, ROUTE, type Scene } from '../journey/scene';
import { useRoute } from '../journey/progress';
import { projects } from '../site.config';
import './RouteGreybox.css';

type Props = { scene: Scene };

/**
 * GREYBOX. Masses and openings, no architecture.
 *
 * This exists to prove one thing and nothing else: that SHAY → approach
 * TIMEMATIC → stop at its display → move *around* the display → into the
 * corridor → through it → out toward contact is one continuous physical camera
 * journey through one world. No materials, no lighting, no plaques, no
 * facade — those are the pass after this one, and only if the route reads.
 *
 * Every face here is real geometry standing in act one's own coordinate space,
 * placed by the same projection the floating platform is placed by, inside the
 * same `preserve-3d` subtree. Nothing is a picture of a place. The camera
 * grows things by approaching them, because `project()` divides by depth.
 *
 * ## The display
 *
 * `ACT2.wall` is one plane with exactly one hole in it, at `ACT2.opening`. The
 * display hangs on the solid part. The route crosses that plane once, through
 * the hole, 806–1795 units to the right of centre — so "the camera never
 * travels through the website" is not a rule anyone has to remember here. It
 * is a wall.
 *
 * The site itself is mapped onto that surface with the same `ProjectScreen`
 * the platform's monitor uses, so a real capture of TIMEMATIC dropped into
 * `public/media/` appears on it, and until then it carries the typographic
 * cover rather than a broken image.
 *
 * ## Why it is mounted only during act two
 *
 * Physically this architecture stands in the world the whole time, and at act
 * one's distances TIMEMATIC's facade would project to some 560px — plainly
 * visible from the city. That may well be right, and it is a question about
 * the journey rather than about the greybox: showing it would change every
 * frame of act one, which is the one thing this pass is not allowed to do. So
 * it is held until the route begins, and whether the city should see where it
 * is going is decided after the route itself is signed off.
 */
export function RouteGreybox({ scene }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const watch = useMemo(() => projects.find((project) => project.id === 'watch') ?? null, []);

  /* World units → the stage's pixels. Positions follow the viewport on each
     axis; sizes take the uniform scale, so nothing is stretched — the same
     split `ProjectPlatform` uses. */
  const place = useMemo(() => {
    const px = (x: number) => scene.vp.x + x * scene.sx;
    const py = (y: number) => scene.vp.y + y * scene.sy;
    /*
     * This world scales x by `sx`, y by `sy`, and z not at all — that is what
     * `px`/`py` above do and what every `translate3d`'s third argument does.
     * So an extent has to be scaled by the axis it lies along, and the uniform
     * `s` that suits a small object is wrong for anything spanning depth: at
     * `s` = 0.9 a floor band reached only nine tenths of the way to the next
     * one, which is exactly the seam that opened between them.
     */
    const across = (n: number) => `${(n * scene.sx).toFixed(2)}px`;
    const tall = (n: number) => `${(n * scene.sy).toFixed(2)}px`;
    const deep = (n: number) => `${n.toFixed(2)}px`;
    /* An object, rather than the enclosure. `sx` and `sy` differ by viewport,
       so a rectangle sized by them changes shape with the window — fine for a
       wall, which only has to meet its own corners, and wrong for anything
       with a shape of its own. Act one keeps `s` for exactly this. */
    const objectSize = (n: number) => `${(n * scene.s).toFixed(2)}px`;

    return {
      /** Something hanging on a wall, which keeps its own proportions. */
      panel: (x0: number, x1: number, y0: number, y1: number, z: number): CSSProperties => ({
        width: objectSize(x1 - x0),
        height: objectSize(y1 - y0),
        transform: `translate3d(${px(x0).toFixed(1)}px, ${py(y0).toFixed(1)}px, ${z}px)`,
      }),
      /** A plane facing the camera: the plane of a wall. */
      wall: (x0: number, x1: number, y0: number, y1: number, z: number): CSSProperties => ({
        width: across(x1 - x0),
        height: tall(y1 - y0),
        transform: `translate3d(${px(x0).toFixed(1)}px, ${py(y0).toFixed(1)}px, ${z}px)`,
      }),
      /** A plane underfoot or overhead, laid down the z axis. */
      deck: (x0: number, x1: number, z0: number, z1: number, y: number): CSSProperties => ({
        width: across(x1 - x0),
        /* Laid down the z axis by the rotate below, so its extent is depth. */
        height: deep(z0 - z1),
        /*
         * Anchored at its far end. `rotateX(90deg)` swings the element's own
         * +y — which points down the screen — round to +z, and +z is *toward*
         * the viewer. So a deck placed at its near edge grows the wrong way
         * and every floor ends up one band closer than it should be, which is
         * how the hall's floor came to stop short of the camera standing on
         * it.
         */
        transform: `translate3d(${px(x0).toFixed(1)}px, ${py(y).toFixed(1)}px, ${z1}px) rotateX(90deg)`,
      }),
      /** A plane stood on edge, running away from the camera. */
      side: (x: number, y0: number, y1: number, z0: number, z1: number): CSSProperties => ({
        width: deep(z0 - z1),
        height: tall(y1 - y0),
        transform: `translate3d(${px(x).toFixed(1)}px, ${py(y0).toFixed(1)}px, ${z0}px) rotateY(90deg)`,
      }),
    };
  }, [scene]);

  /* Held until the route begins — see the note above. Driven by style rather
     than by state so the scrub never re-renders React. */
  const onScroll = useCallback((progress: number) => {
    const root = rootRef.current;
    if (!root) return;
    root.style.visibility = progress > 0.0005 ? 'visible' : 'hidden';
  }, []);

  useRoute(onScroll);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root) root.style.visibility = 'hidden';
  }, []);

  const { facade, hall, wall, display, plaza } = ROUTE;

  /**
   * A run of depth, cut into pieces.
   *
   * By a fixed length rather than a fixed count, because what matters is how
   * long the *one* piece the camera is standing in happens to be: CSS clips a
   * plane that spans the lens, so that piece never draws, and its length is
   * the size of the hole it leaves at the bottom of the frame. At 250 units
   * the hole projects below the frame's edge and is never seen; at the 750 a
   * six-way split produced, a strip of the world showed through under the
   * floor.
   */
  const BAND = 250;
  const bands = (from: number, to: number) => {
    const count = Math.max(1, Math.ceil(Math.abs(to - from) / BAND));
    return Array.from({ length: count }, (_, i) => [
      from + ((to - from) * i) / count,
      from + ((to - from) * (i + 1)) / count,
    ] as [number, number]);
  };

  return (
    <div className="grey" ref={rootRef} aria-hidden="true">
      {/*
        The ground, in bands rather than as one slab.

        A plane that spans the camera is clipped by CSS at the perspective
        plane and simply stops being drawn, which took the floor out from under
        the frame at exactly the moment the camera was standing on it. Bands
        are individually either in front of the lens or behind it, so the ones
        ahead keep drawing while the ones passed drop out — which is also what
        gives a flat greybox floor something to read distance against.
      */}
      {bands(plaza.from, plaza.to).map(([from, to]) => (
        <i key={from} className="grey__face grey__face--floor" style={place.deck(-5200, 5200, from, to, GROUND)} />
      ))}

      {/* TIMEMATIC's front: a mass with one opening, on the approach axis. */}
      <i className="grey__face grey__face--mass" data-part="facade" style={place.wall(facade.x[0], facade.door.x[0], facade.top, GROUND, facade.z)} />
      <i className="grey__face grey__face--mass" data-part="facade" style={place.wall(facade.door.x[1], facade.x[1], facade.top, GROUND, facade.z)} />
      <i className="grey__face grey__face--mass" data-part="facade" style={place.wall(facade.door.x[0], facade.door.x[1], facade.top, facade.door.top, facade.z)} />

      {/* The hall. */}
      {bands(hall.from, hall.to).map(([from, to]) => (
        <i key={from} className="grey__face grey__face--floor" style={place.deck(hall.x[0], hall.x[1], from, to, GROUND)} />
      ))}
      {bands(hall.from, hall.to).map(([from, to]) => (
        <i key={`c${from}`} className="grey__face grey__face--ceil" style={place.deck(hall.x[0], hall.x[1], from, to, hall.top)} />
      ))}
      {bands(hall.from, hall.to).flatMap(([from, to]) => [
        <i key={`l${from}`} className="grey__face grey__face--side" style={place.side(hall.x[0], hall.top, GROUND, from, to)} />,
        <i key={`r${from}`} className="grey__face grey__face--side" style={place.side(hall.x[1], hall.top, GROUND, from, to)} />,
      ])}

      {/*
        The far wall. Solid, all the way across — the corridor that eventually
        opens in it is the next act's, and until it exists there is nothing
        through this wall at all. The display hangs on it.
      */}
      <i className="grey__face grey__face--mass" data-part="wall" style={place.wall(hall.x[0], hall.x[1], hall.top, GROUND, wall.z)} />

      {/* The display, standing in the world on that wall. The camera stops in
          front of it and never reaches it: the wall is 2000 units past where
          the camera halts, and nothing on the route goes further. */}
      <div
        className="grey__display"
        style={place.panel(display.x[0], display.x[1], display.y[0], display.y[1], wall.z + 20)}
      >
        <ProjectScreen
          src={watch?.thumbnail ?? null}
          title={watch?.title ?? 'TIMEMATIC'}
          subtitle={watch?.subtitle ?? ''}
        />
      </div>
</div>
  );
}
