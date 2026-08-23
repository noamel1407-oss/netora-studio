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
  /**
   * The route lights up while the doorway is still passing the lens, so the
   * city is never a held picture waiting for the next thing to begin.
   */
  railFrom: 0.245,
  /** The statement rises... */
  statementIn: 0.278,
  /** ...is settled and simply readable from here... */
  holdFrom: 0.352,
  /** ...and only then leaves, as the route takes the screen. */
  statementOut: 0.425,
  /** The camera picks up under the departure and runs to the container's end. */
  travelFrom: 0.44,
};

/** The camera's own progress: 0 as the statement leaves, 1 at the very end. */
export const travelOf = (progress: number) =>
  clamp01((progress - JOURNEY.travelFrom) / (1 - JOURNEY.travelFrom));

/**
 * The route's progress, which is not the camera's. The light runs down the
 * rail from under the statement onwards — the road exists before it is
 * travelled, and the camera catches up with it later.
 */
const RAIL_TO = 0.86;

export const railOf = (progress: number) =>
  clamp01((progress - JOURNEY.railFrom) / (RAIL_TO - JOURNEY.railFrom));

/**
 * How brightly the rail burns. It comes up under the city to about a third,
 * stays there while the statement has the screen — present, subordinate — and
 * only takes full prominence once the type has gone.
 */
export function railIntensity(progress: number): number {
  const { railFrom, statementIn, statementOut } = JOURNEY;
  if (progress <= railFrom) return 0;
  if (progress < statementIn) {
    return 0.3 * smooth((progress - railFrom) / (statementIn - railFrom));
  }
  if (progress < statementOut) {
    /* A hair brighter across the hold: alive, not animated. */
    return 0.3 + 0.06 * ((progress - statementIn) / (statementOut - statementIn));
  }
  return 0.36 + 0.64 * smooth(clamp01((progress - statementOut) / 0.075));
}

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
/** How the artwork is framed when nothing forces it otherwise. */
const CITY_FOCUS: Vec2 = { x: 0.5, y: 0.38 };
/**
 * Where the convergence is allowed to sit on screen. A narrow window crops the
 * artwork hard enough to push its vanishing point off the side, and a point
 * that has left the frame is no use to anything standing in front of it.
 */
const VP_BAND = { x: [0.34, 0.72], y: [0.32, 0.7] };

type Framing = { vp: Vec2; focus: Vec2 };

/**
 * The convergence point, and the framing that puts it there.
 *
 * The 3D space and the painting have to agree on where the world converges.
 * Clamping the point on its own breaks that agreement — the objects converge
 * somewhere the architecture behind them does not. So when the artwork's own
 * convergence falls outside the band, this pans the *artwork* instead: it
 * solves for the `object-position` that brings the point back, and returns
 * both, so the two are the same point by construction on any viewport.
 */
export function framingFor(width: number, height: number): Framing {
  const cover = Math.max(width / CITY_ASPECT, height);
  const shown = { x: CITY_ASPECT * cover, y: cover };
  /* Negative: how much of the artwork the viewport is cropping off. */
  const spare = { x: width - shown.x, y: height - shown.y };

  const solve = (
    axis: 'x' | 'y',
    extent: number,
    band: number[],
  ): { at: number; focus: number } => {
    const natural = spare[axis] * CITY_FOCUS[axis] + CITY_VP[axis] * shown[axis];
    const wanted = clamp(natural, band[0] * extent, band[1] * extent);

    /* Nothing cropped on this axis, so there is no pan to spend. */
    if (spare[axis] > -1) return { at: natural, focus: CITY_FOCUS[axis] };

    const focus = clamp((wanted - CITY_VP[axis] * shown[axis]) / spare[axis], 0, 1);
    return { at: spare[axis] * focus + CITY_VP[axis] * shown[axis], focus };
  };

  const x = solve('x', width, VP_BAND.x);
  const y = solve('y', height, VP_BAND.y);

  return { vp: { x: x.at, y: y.at }, focus: { x: x.focus, y: y.focus } };
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
  /** `object-position` for .city__bg that puts the artwork's VP at `vp`. */
  focus: Vec2;
  /** Position scale: x follows the width, y the height. */
  sx: number;
  sy: number;
  /** Object scale — uniform, so nothing is stretched. */
  s: number;
};

export function sceneFor(width: number, height: number): Scene {
  const sx = clamp(width / 1440, 0.26, 1.25);
  const sy = clamp(height / 900, 0.5, 1.25);
  const { vp, focus } = framingFor(width, height);

  return { width, height, vp, focus, sx, sy, s: Math.min(sx, sy) };
}

/* --------------------------------------------------------------------------
   The platform's place in the world.

   Its depth is fixed: the approach is described by how large it reads on
   screen (0.155 → 0.55 of its true size), and the camera dolly is whatever
   distance produces that. Framing the move that way keeps the growth even
   under the eye instead of accelerating into the arrival.
   -------------------------------------------------------------------------- */

const K_START = 0.155;
/** How large the platform reads once the camera has arrived. */
const K_ARRIVE = 0.47;
/** ...and after the hold, as the camera keeps going past it. */
const K_DRIFT = 0.6;

/** Travel progress at which the arrival composition is reached, and left. */
const ARRIVE_AT = 0.8;
const HOLD_TO = 0.88;

/** The journey progress the arrival composition sits at. */
export const ARRIVAL_PROGRESS = JOURNEY.travelFrom + ARRIVE_AT * (1 - JOURNEY.travelFrom);

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
  const wanted = (scene.width / 2 - scene.vp.x) / K_ARRIVE - PLATFORM.x * scene.sx;
  return clamp(wanted, -720, 0);
}

/**
 * The approach, the hold, and what comes after.
 *
 * The camera closes on the platform until the arrival composition, rests on it
 * — a real pause, not a moment of zero velocity — and then keeps going. That
 * last stretch is what stops the pinned stage from reading as a section that
 * ended: the world is still moving forward as it leaves.
 */
function scaleAt(t: number): number {
  if (t <= ARRIVE_AT) return K_START + (K_ARRIVE - K_START) * smooth(t / ARRIVE_AT);
  if (t <= HOLD_TO) return K_ARRIVE;
  return K_ARRIVE + (K_DRIFT - K_ARRIVE) * smooth((t - HOLD_TO) / (1 - HOLD_TO));
}

/* --------------------------------------------------------------------------
   Following the rail.

   The route runs left, meets the platform and swings right; a camera that
   ignored all of that would read as moving *past* a decorative line rather
   than being pulled along by it. So the truck takes its lateral position from
   the rail itself, some way ahead of where the camera has got to, at a gain
   low enough that the world sways rather than steers. It hands back over to
   the composed arrival before the platform is reached, so the final framing is
   the one that was signed off and not whatever the curve happens to do.
   -------------------------------------------------------------------------- */

/** How far ahead down the route the camera looks. */
const LOOK_AHEAD = 2400;
/** How much of the route's lateral offset the camera takes. */
const FOLLOW = 0.34;

/**
 * The rail's x by depth, built from the same samples the ribbon is drawn from.
 * `y` here carries the running deepest z, which makes the table monotonic —
 * the route doubles back a few units where it runs along the slab's edge, and
 * a depth has to have one answer.
 */
let railTrack: Vec2[] | null = null;

function trackOfRail(): Vec2[] {
  if (railTrack) return railTrack;

  const track: Vec2[] = [];
  let deepest = Number.POSITIVE_INFINITY;

  for (const point of SAMPLES) {
    deepest = Math.min(deepest, point.z);
    track.push({ x: point.x, y: deepest });
  }

  railTrack = track;
  return track;
}

function railXAt(z: number): number {
  const track = trackOfRail();
  const first = track[0];
  const last = track[track.length - 1];
  if (z >= first.y) return first.x;
  if (z <= last.y) return last.x;

  let low = 0;
  let high = track.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (track[mid].y > z) low = mid;
    else high = mid;
  }

  const a = track[low];
  const b = track[high];
  const span = a.y - b.y;
  return span > 0 ? a.x + ((a.y - z) / span) * (b.x - a.x) : a.x;
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
  /* The approach's own progress: it completes at the arrival and stays there,
     so the hold and the drift beyond it are a pure forward push. */
  const eased = smooth(clamp01(t / ARRIVE_AT));
  const k = scaleAt(t);
  const z = depthFor(k) - PLATFORM.z;

  /* Lateral: pulled along by the route, handing over to the composed arrival
     framing by the time the platform is reached. */
  const follow = -FOLLOW * railXAt(-z - LOOK_AHEAD) * scene.sx;
  const composed = smooth(clamp01((t - 0.54) / 0.26));
  const x = (follow * (1 - composed) + truckFor(scene) * composed) * eased;

  /* Dips a little as the camera picks up speed, then lifts to frame the
     platform — a tilt, so the skyline rides with it. Past the arrival it
     settles back down: the stage is being scrolled off by then, and a scene
     sinking against that lift reads as the camera moving rather than as a
     section being taken away. */
  const drift = smooth(clamp01((t - HOLD_TO) / (1 - HOLD_TO)));
  const tiltY =
    (24 * Math.sin(Math.PI * clamp01(t / ARRIVE_AT)) - 54 * eased + 26 * drift) * scene.sy;
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
 * The browser's own perspective projection, plus the tilt.
 *
 * The tilt is a shift of the whole projected image rather than anything in the
 * world, so the platform takes it as a 2D translate on the stage and the rail —
 * which is drawn outside that stage — takes it here. Same number, same
 * direction: a camera tilt, not a parallax.
 */
export function project(point: Vec3, camera: Camera): Projected {
  const z = point.z + camera.z;
  const k = PERSPECTIVE / (PERSPECTIVE - z);

  return {
    x: camera.vp.x + (point.x + camera.x) * k,
    y: camera.vp.y + camera.tiltY + point.y * k,
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
 * The light runs far ahead of the camera. It is well past the point where the
 * trail painted into the artwork fades out before the statement has finished
 * being read — which is the whole reason the route is legible under the type
 * at a third of its brightness: what the reader sees there is the rail going
 * somewhere the picture alone does not. By the time the statement leaves, the
 * road already reaches the platform.
 */
export const pathHead = (rail: number) =>
  HEAD_FROM + (HEAD_TO - HEAD_FROM) * Math.pow(clamp01(rail), 0.55);

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
