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
  /**
   * Travel progress: 0 at the statement's departure, 1 at the arrival, and on
   * past it — the route runs 1 → 2. It is the camera's own position in the
   * journey, so anything that reads it to decide how far along the world it is
   * gets an answer that keeps being true after act one ends.
   */
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
  /*
   * Act two. Nothing in act one can reach this line: its own travel is
   * `travelOf()`, which is clamped to [0, 1] at source, so the branch is
   * unreachable from everything that existed before it. The body below is
   * untouched — that is the point of putting the fork here rather than
   * threading a mode through it.
   */
  if (travel > 1) return routeCameraAt(travel, scene);

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

/* ==========================================================================
   THE ROUTE, ACT 1 — SHAY's platform out to the TIMEMATIC stop.

   Anchors 01 and 02 only. The corridor and contact are a later act and are
   deliberately not here: this stretch has to be right before anything is built
   past it.

   One world, one camera, one path. This extends the space above rather than
   standing beside it — same Vec3 coordinates, same `project()`, same
   `cameraAt()`. What changes is only that the camera keeps going after it has
   reached SHAY. Act one of the site occupies travel [0, 1] and is untouched by
   any of this; the route is travel [1, 2].

   ## The frame settles

   Act one's vanishing point is the *city painting's* — `framingFor()` solves
   it from world-city.webp, and on a 1440x900 frame it lands at 67% across and
   59% down. Everything act one places agrees with it, which is the whole point
   of it.

   The route walks away from that painting and into architecture, and the
   anchors frame from the middle: their horizon sits at about 52% and their
   subjects on the centre line. So once the platform is behind the lens the
   frame settles from the painting's point to the architecture's. That is a
   lens shift — a uniform translation of the projected image, no rotation and
   no change of perspective — and it is what lets the anchors' compositions be
   reproduced at all. Placing the geometry off-centre instead cannot work:
   `framingFor()` solves per viewport, so the offset would only be right on one
   screen.

   ## No yaw

   Measured, not assumed: `npm run measure:yaw`. A translating camera projects
   a plane at constant depth at uniform scale, so TIMEMATIC's display must hold
   a constant height across its own width. Fitted over 521 columns the slope is
   0.00266 +/- 0.01366 (t = 0.2) — and the same measurement on anchor 02, where
   the camera is provably square to that wall, returns 0.02748 +/- 0.02258. The
   test is smaller than the control's own error. The method could have seen a
   turn of about eleven degrees; there is none.
   ========================================================================== */

/** The ground act one's plaza already stands on. */
export const GROUND = 900;

const spanOf = (value: number, from: number, to: number) =>
  to <= from ? (value >= to ? 1 : 0) : clamp01((value - from) / (to - from));

/**
 * The architecture, as world-space boxes. Greybox: masses and openings, not
 * buildings.
 *
 * Solved from the anchors rather than chosen. Anchor 02 fixes the stop: its
 * display spans 0.273 of the frame and the hall's walls reach its edges, so
 * putting the far wall at depth -2000 (k = 1/3) makes the frame 4320 units
 * wide there — hence a 4320-wide hall and an 1180-wide display. The display's
 * measured aspect, 1.67 wide to tall, then fixes its height at 707.
 *
 * Anchor 01 fixes the approach. TIMEMATIC's front reads at about 0.22 of the
 * frame from across the plaza, and a 4320-wide facade only reads that small
 * from some 12000 units away — which is why the building stands where it does
 * and why the plaza in front of it is long. The first greybox had it at -14500
 * and half the width, and the camera was at its door before any of the plaza
 * had been crossed.
 */
export const ROUTE = {
  /** Where the route comes down off the platform and onto the ground. */
  plaza: { from: -7600, to: -19900 },

  /** TIMEMATIC's front. One opening, on the approach axis. */
  facade: {
    z: -19900,
    x: [-2160, 2160] as [number, number],
    top: -5400,
    door: { x: [-700, 700] as [number, number], top: -1000 },
  },

  /** The hall behind it, and the wall the work hangs on. */
  hall: { from: -19900, to: -24400, x: [-2160, 2160] as [number, number], top: -1250 },
  wall: { z: -24400 },
  display: { x: [-590, 590] as [number, number], y: [-493, 214] as [number, number] },
};

/** Where the camera halts in front of the work. Nothing moves between these. */
export const ROUTE_STOP: [number, number] = [1.85, 2];

/**
 * How much of the frame's width the work fills once the camera has stopped.
 * Measured off anchor 02, and it is the *composition* rather than a distance,
 * for the reason act one describes its own arrival the same way: object sizes
 * take the scene's uniform scale and depths do not, so a stop fixed at a
 * distance reads 10% smaller on a short window than on a tall one. Solving the
 * distance from how large the work should read makes the arrival the same
 * composition on every screen.
 */
const WORK_READS = 0.273;

/** The depth the stop sits at, so that the work reads at `WORK_READS`. */
function stopDepthFor(scene: Scene): number {
  const wide = (ROUTE.display.x[1] - ROUTE.display.x[0]) * scene.s;
  return depthFor((WORK_READS * scene.width) / wide);
}

/** Act two's own progress, mapped onto the journey's travel. */
export const routeTravelOf = (progress: number) => 1 + clamp01(progress);

/** Camera keyframes, in world position. `t` is journey travel, 1 -> 2. */
const ROUTE_KEYS: { t: number; x: number; z: number }[] = [
  /* Exactly where act one leaves the camera: `cameraAt(1)` is x -492, z 4785,
     and a camera's world position is the negative of its dolly. Act one eases
     out to zero velocity, so the route picks up from rest and no join is felt. */
  { t: 1.0, x: 492, z: -4785 },
  /* Down onto the plaza. The platform passes the lens around here. */
  { t: 1.12, x: 400, z: -7000 },
  /* Across it, lining up on the entrance. */
  { t: 1.35, x: 0, z: -12500 },
  { t: 1.6, x: 0, z: -18000 },
  /* Through the facade's opening. */
  { t: 1.72, x: 0, z: -20600 },
  /* And the stop: square to the display. Its distance is filled in per
     viewport by `stopDepthFor` — see `WORK_READS`. */
  { t: 1.85, x: 0, z: 0 },
  { t: 2.0, x: 0, z: 0 },
];

/** The keys, with the stop's distance solved for this viewport. */
function keysFor(scene: Scene) {
  const stop = ROUTE.wall.z - stopDepthFor(scene);
  return ROUTE_KEYS.map((key) => (key.t >= ROUTE_STOP[0] ? { ...key, z: stop } : key));
}

/** The frame settles from the painting's vanishing point to the middle. */
/* Finished before the first anchor is reached, and started only once the
   platform is behind the lens — a frame that is still settling while the
   reader is looking at a composition is a composition they are not seeing. */
const VP_SETTLES: [number, number] = [1.075, 1.15];
const ROUTE_VP = { x: 0.5, y: 0.52 };

/**
 * Where the plaza's air runs out.
 *
 * Between `ROUTE_KEYS` 1.6 (z -18000) and 1.72 (z -20600) the camera reaches
 * TIMEMATIC's front at `ROUTE.facade.z` — around 1.7. That is the moment the
 * open city stops being what the lens is looking through.
 */
const AIR_CLEARS = 1.7;

/**
 * The warm air the camera is moving through, as the layer's opacity.
 *
 * Act one gathers it: the haze thickens with the distance covered, and at the
 * arrival it stands at half. Act two spends it, because the route crosses the
 * plaza and goes inside, and air that belongs to the open city cannot still be
 * in front of the lens once a building's interior is.
 *
 * Act one's half of this is `travel * 0.5` exactly as it has always been —
 * this function only gives the other half somewhere to live.
 */
export function airAt(travel: number): number {
  if (travel <= 1) return clamp01(travel) * 0.5;
  return 0.5 * (1 - clamp01((travel - 1) / (AIR_CLEARS - 1)));
}

function keyframeAt(t: number, scene: Scene): { x: number; z: number } {
  const keys = keysFor(scene);
  const at = clamp(t, keys[0].t, keys[keys.length - 1].t);

  for (let i = 1; i < keys.length; i += 1) {
    const a = keys[i - 1];
    const b = keys[i];
    if (at > b.t) continue;
    /* A held pair is a held camera: nothing eases through a stop. */
    if (b.t === a.t || (a.x === b.x && a.z === b.z)) return { x: a.x, z: a.z };
    const k = smooth((at - a.t) / (b.t - a.t));
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  }

  const last = keys[keys.length - 1];
  return { x: last.x, z: last.z };
}

/**
 * The camera on the route. Same units, same meaning, same projection as act
 * one — `camera.z` is the dolly and a camera's world position is its negative,
 * which is why the keyframes read as places rather than as amounts.
 */
function routeCameraAt(travel: number, scene: Scene): Camera {
  const at = keyframeAt(travel, scene);
  const z = -at.z;
  const x = -at.x * scene.sx;

  /* Act one leaves the lens tilted down 28px; the route levels it off as it
     crosses the plaza, because everything after is architecture seen square. */
  const tiltY = -28 * scene.sy * (1 - smooth(clamp01((travel - 1) / 0.28)));

  const settled = smooth(spanOf(travel, VP_SETTLES[0], VP_SETTLES[1]));
  const vp = {
    x: scene.vp.x + (ROUTE_VP.x * scene.width - scene.vp.x) * settled,
    y: scene.vp.y + (ROUTE_VP.y * scene.height - scene.vp.y) * settled,
  };

  /* The city matte is left behind rather than dollied into: past act one the
     camera is heading into architecture that occludes it, and the projection
     would divide by nothing once the dolly reached the backdrop's own depth.
     It takes the frame's settle with it, so the painting and the world do not
     slide against each other while it is still on screen. */
  const held = cameraAt(1, scene);

  return {
    /* The camera's real position in the journey. Returning act one's arrival
       here instead left everything reading `t` frozen at the platform for the
       whole route — which is how `--air` came to sit at 0.500 from SHAY to the
       TIMEMATIC stop. */
    t: travel,
    z,
    x,
    tiltY,
    vp,
    bg: {
      scale: held.bg.scale,
      x: held.bg.x + (vp.x - scene.vp.x),
      y: tiltY + (vp.y - scene.vp.y),
    },
  };
}
