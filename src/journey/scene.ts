/* ==========================================================================
   The journey's shared geometry.

   Everything past the statement happens inside one camera: the city artwork
   is the matte painting at the back, and the gold path, the floating platform
   and its computer are objects standing in front of it. This module is the
   single description of that space — the projection here is deliberately the
   same formula the browser uses for `perspective`, so an SVG drawn from
   `project()` and a DOM element placed with `translate3d()` land on exactly
   the same pixel.
   ========================================================================== */

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

/** Must match `perspective` on `.travel__stage`. */
export const PERSPECTIVE = 1000;

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

const clamp01 = (value: number) => clamp(value, 0, 1);

/** Smooth start, smooth stop — no overshoot anywhere in a scrubbed camera. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/* --------------------------------------------------------------------------
   The journey, as fractions of its own scroll length. One tall scrubbed
   container runs the whole thing, so these are the only timing numbers in the
   experience: the door, the arrival in the city, the statement, and the travel
   out to the first platform all read off the same progress.
   -------------------------------------------------------------------------- */

export const JOURNEY = {
  /** The vault door's own scrub window. */
  doorFrom: 0.014,
  doorTo: 0.24,
  /** Where the doorway leaves the camera and the city takes the screen. */
  handoff: 0.24,
  /** The statement rises, holds, then leaves as the camera moves on. */
  statementIn: 0.285,
  statementOut: 0.42,
  /** The travel out to the first platform — it begins under the departure. */
  travelFrom: 0.375,
  travelTo: 0.955,
  /** From here the composition is held on the arrival. */
  arrival: 0.78,
};

export const travelOf = (progress: number) =>
  clamp01((progress - JOURNEY.travelFrom) / (JOURNEY.travelTo - JOURNEY.travelFrom));

/* --------------------------------------------------------------------------
   Where the city artwork's own perspective converges.

   world-city.webp already contains a gold light trail running away from the
   camera; everything built on top has to share its vanishing point, or the
   scene reads as two pictures rather than one place. The point below is that
   convergence measured in the image, and the maths is `object-fit: cover` +
   `object-position` — keep both in step with `.city__bg`.
   -------------------------------------------------------------------------- */

const CITY_ASPECT = 2560 / 1429;
const CITY_VP: Vec2 = { x: 0.655, y: 0.585 };
const CITY_FOCUS: Vec2 = { x: 0.5, y: 0.38 };

export function vanishingPoint(width: number, height: number): Vec2 {
  const cover = Math.max(width / CITY_ASPECT, height);
  const shown = { x: CITY_ASPECT * cover, y: cover };

  return {
    x: clamp((width - shown.x) * CITY_FOCUS.x + CITY_VP.x * shown.x, width * 0.3, width * 0.8),
    y: clamp((height - shown.y) * CITY_FOCUS.y + CITY_VP.y * shown.y, height * 0.3, height * 0.72),
  };
}

/* --------------------------------------------------------------------------
   Scene scale. The depth choreography is identical on every screen — only the
   lateral spread and the height of things follow the viewport, so a phone
   travels the same journey through a narrower frame.
   -------------------------------------------------------------------------- */

export type Scene = {
  /** Viewport in CSS px. */
  width: number;
  height: number;
  vp: Vec2;
  /** Position scale: x follows the width, y the height. */
  sx: number;
  sy: number;
  /** Object scale — uniform, so nothing is stretched. */
  s: number;
};

export function sceneFor(width: number, height: number): Scene {
  const sx = clamp(width / 1440, 0.26, 1.25);
  const sy = clamp(height / 900, 0.5, 1.25);

  return { width, height, vp: vanishingPoint(width, height), sx, sy, s: Math.min(sx, sy) };
}

/* --------------------------------------------------------------------------
   The platform's place in the world.

   Its depth is fixed: the approach is described by how large it reads on
   screen (0.155 → 0.55 of its true size), and the camera dolly is whatever
   distance produces that. Framing the move that way keeps the growth even
   under the eye instead of accelerating into the arrival.
   -------------------------------------------------------------------------- */

const K_START = 0.155;
const K_END = 0.47;

const depthFor = (k: number) => PERSPECTIVE - PERSPECTIVE / k;

/** Platform anchor = the centre of its top surface. */
export const PLATFORM = {
  x: -40,
  /** Below the horizon, by enough that its surface is read rather than edged. */
  y: 430,
  z: depthFor(K_START),
  width: 1800,
  depth: 1000,
  thickness: 140,
};

/**
 * Lateral truck. The artwork's vanishing point is well off centre and moves
 * with the viewport, so rather than a fixed distance this is whatever brings
 * the platform to the middle of the frame by the time the camera arrives —
 * the same composition on any screen, and a real parallax against the skyline
 * on the way there.
 */
function truckFor(scene: Scene) {
  const wanted = (scene.width / 2 - scene.vp.x) / K_END - PLATFORM.x * scene.sx;
  return clamp(wanted, -720, 0);
}

export type Camera = {
  /** Travel progress, 0 at the statement's departure, 1 at the arrival. */
  t: number;
  /** Dolly, in world px, positive = forward. */
  z: number;
  /** Truck, in world px. */
  x: number;
  /** Tilt, as the screen-space shift it produces. Applied in CSS, not here. */
  tiltY: number;
  vp: Vec2;
  /** Matte painting: the same move, at the distance of a skyline. */
  bg: { scale: number; x: number; y: number };
};

/** The city sits far enough back that the dolly only grazes it. */
const BG_DEPTH = 21000;

export function cameraAt(travel: number, scene: Scene): Camera {
  const t = clamp01(travel);
  const eased = smooth(t);
  const k = K_START + (K_END - K_START) * eased;

  const z = depthFor(k) - PLATFORM.z;
  const x = truckFor(scene) * eased;
  /* Dips a little as the camera picks up speed, then lifts to frame the
     platform — a tilt, so the skyline rides with it. */
  const tiltY = (24 * Math.sin(Math.PI * t) - 54 * eased) * scene.sy;
  const bgK = PERSPECTIVE / (PERSPECTIVE + BG_DEPTH);

  return {
    t,
    z,
    x,
    tiltY,
    vp: scene.vp,
    bg: { scale: BG_DEPTH / (BG_DEPTH - z), x: x * bgK, y: tiltY },
  };
}

/** How far a point ends up from the camera once the dolly is applied. */
export const depthOf = (z: number, camera: Camera) => z + camera.z;

export type Projected = { x: number; y: number; k: number; z: number; visible: boolean };

/**
 * The browser's own perspective projection. `tiltY` is deliberately absent:
 * the stage carries it as a 2D translate, which moves the SVG and the DOM
 * objects by the identical amount — a camera tilt, not a parallax.
 */
export function project(point: Vec3, camera: Camera): Projected {
  const z = point.z + camera.z;
  const k = PERSPECTIVE / (PERSPECTIVE - z);

  return {
    x: camera.vp.x + (point.x + camera.x) * k,
    y: camera.vp.y + point.y * k,
    k,
    z,
    /* Anything level with the lens, or behind it, has left the picture. */
    visible: z < PERSPECTIVE * 0.45 && k > 0,
  };
}

/* --------------------------------------------------------------------------
   The gold path.

   The first four points sit on the plaza, over the trail already painted into
   the artwork, so the light reads as that same route continuing rather than a
   new graphic laid on top. From there it lifts off the ground, meets the
   platform along its near-left edge, wraps behind it, and carries on into the
   distance — the direction the next project will arrive from.
   -------------------------------------------------------------------------- */

const PATH: Vec3[] = [
  /* On the plaza, over the trail the artwork already draws. */
  { x: -36, y: 900, z: -1406 },
  { x: 174, y: 888, z: -2003 },
  /* Lifting off the plaza and swinging left, out past the platform's edge. */
  { x: 116, y: 812, z: -3016 },
  { x: -478, y: 690, z: -3926 },
  { x: -1150, y: 596, z: -4380 },
  { x: -1180, y: 542, z: -4720 },
  /* Arriving at the near-left corner and running the length of the slab's
     front edge, level with the gold seam cut into it. */
  { x: -1000, y: 510, z: -4880 },
  { x: -520, y: 497, z: -4830 },
  { x: 200, y: 497, z: -4820 },
  { x: 800, y: 497, z: -4866 },
  /* Round the far corner... */
  { x: 1075, y: 486, z: -5150 },
  { x: 1160, y: 440, z: -5700 },
  /* ...and away, towards wherever the route goes next. */
  { x: 1150, y: 384, z: -6500 },
  { x: 1060, y: 318, z: -7600 },
]

/** Where the light has reached, in world depth, over the travel. */
const HEAD_FROM = -1900;
const HEAD_TO = -8100;

/**
 * The light runs ahead of the camera rather than with it: the route reaches
 * the platform around a third of the way through the travel, so the rest of
 * the approach is spent following a road that visibly already goes somewhere.
 */
export const pathHead = (travel: number) =>
  HEAD_FROM + (HEAD_TO - HEAD_FROM) * Math.pow(clamp01(travel), 0.7);

/** Catmull-Rom through the control points — a rail, not a polyline. */
function spline(points: Vec3[], samples: number): Vec3[] {
  const out: Vec3[] = [];
  const at = (i: number) => points[clamp(i, 0, points.length - 1)];

  for (let seg = 0; seg < points.length - 1; seg += 1) {
    const p0 = at(seg - 1);
    const p1 = at(seg);
    const p2 = at(seg + 1);
    const p3 = at(seg + 2);
    const steps = Math.max(2, Math.round(samples / (points.length - 1)));

    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const axis = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);

      out.push({
        x: axis(p0.x, p1.x, p2.x, p3.x),
        y: axis(p0.y, p1.y, p2.y, p3.y),
        z: axis(p0.z, p1.z, p2.z, p3.z),
      });
    }
  }

  out.push(points[points.length - 1]);
  return out;
}

/* Enough samples that the rail reads as a curve, few enough that redrawing it
   every frame stays cheap. */
const SAMPLES = spline(PATH, 130);

/** The rail, scaled into a given viewport. Sampled once per resize. */
export function pathFor(scene: Scene): Vec3[] {
  return SAMPLES.map((p) => ({ x: p.x * scene.sx, y: p.y * scene.sy, z: p.z }));
}
