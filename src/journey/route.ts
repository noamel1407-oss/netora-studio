/* ==========================================================================
   The route past the first platform: SHAY → TIMEMATIC → the corridor → contact.

   Five canonical anchors under `reference/transitions/` fix this stretch of the
   journey, and their roles are not open to interpretation:

     01  SHAY exit — the exterior route toward TIMEMATIC
     02  the TIMEMATIC portfolio stop — the camera halts while the work is shown
     03  the TIMEMATIC exit composition — screen left, the real corridor right
     04  inside the corridor — its canonical camera position and architecture
     05  the corridor exit — the exterior route out to contact

   They are followed in that order and in no other, and this module is the only
   place that order lives.

   ## The screens are not doors

   Two of these plates carry a website on a wall: SHAY's display panel in 01,
   and TIMEMATIC's screen in 02 and 03. Both are surfaces — glass mounted on
   marble — and the camera never travels into either. The way out of each
   building is its architecture: the plaza in 01, the corridor in 03. The stop
   at 02 is the one leg pointed at a screen, and it is pointed at it because it
   has halted in front of it. `SURFACES` records where those screens sit, and
   `screenBreaches()` is the standing assertion that none of them has become a
   doorway. It runs in development, because the cheapest moment to catch a
   camera aimed through a website is the moment the number is changed.

   ## Where the numbers come from

   Everything below is measured off the anchors by `npm run assets:anchors`,
   not estimated. Three findings from that pass do real work here:

   - **The rails converge on each plate's aim.** Traced row by row, the gold
     inlay in 01 runs from x≈0.49 at the bottom of the frame, bows out to
     x≈0.41 and comes back to the TIMEMATIC doorway at x≈0.42. The corridor's
     two floor lines in 04 converge on x≈0.50. Both sets of rails in 05 bend
     toward the contact rotunda. The aim points are not chosen compositions:
     they are where the road already goes.
   - **The camera is at one height throughout.** Every aim lands between 0.47
     and 0.55 of its own frame — the same eye level in five different places.
     That is what makes these five pictures one walk rather than five views,
     and it is why nothing on this route tilts.
   - **02 and 03 are one room, and the move between them is solved.** See
     `leave` on the stop below.

   The plates are painted with their own gold rails, lit by their own sunset,
   so nothing here draws a route on top of one. `GoldPath` exists in the first
   act because the city artwork stops short of the floating platform and the
   road had to be carried the rest of the way. On this stretch the road is
   already under the reader's feet in every frame.
   ========================================================================== */

export type Vec2 = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

const clamp01 = (value: number) => clamp(value, 0, 1);

/** Smooth start, smooth stop. A scrubbed camera must not overshoot. */
const smooth = (t: number) => t * t * (3 - 2 * t);

const span = (value: number, from: number, to: number) =>
  to <= from ? (value >= to ? 1 : 0) : clamp01((value - from) / (to - from));

/* --------------------------------------------------------------------------
   Surfaces the camera may look at and must never enter.
   -------------------------------------------------------------------------- */

/**
 * Screen rectangles, normalised to their plate. Measured by
 * `npm run assets:anchors`, not drawn.
 *
 * These are no-go regions rather than layout, so where the measurement and the
 * eye disagree the wider of the two wins. 02 and 03 are the tool's numbers
 * exactly. 01 is deliberately a little larger than what it reports: SHAY's
 * panel is seen at an angle with planting across its foot, so the detector
 * clips its darker edges, and a no-go zone that is slightly too big costs
 * nothing while one that is slightly too small costs the only rule this route
 * has.
 */
export const SURFACES: Record<string, Rect[]> = {
  /* SHAY's display panel, on the marble beside its arch. */
  '01': [{ x0: 0.664, y0: 0.358, x1: 0.766, y1: 0.6 }],
  /* TIMEMATIC's screen, straight on. */
  '02': [{ x0: 0.361, y0: 0.323, x1: 0.634, y1: 0.613 }],
  /* ...and the same screen from the exit composition, over on the left. */
  '03': [{ x0: 0.112, y0: 0.23, x1: 0.488, y1: 0.634 }],
};

/* --------------------------------------------------------------------------
   The legs.

   `at` / `leaves` / `gone` are fractions of the promenade's own scroll length,
   and they overlap on purpose: a leg starts its push while the one in front of
   it is still leaving, so the reader is never shown a plate waiting to be
   handed something. It is the rule the vault door is handed over by — a layer
   is only dropped once there is almost nothing of it left on screen.
   -------------------------------------------------------------------------- */

export type Threshold = 'shadow' | 'glare' | 'none';

export type Leg = {
  id: string;
  /** The anchor this leg is, by its canonical number. */
  anchor: string;
  /** The plate under `public/media/`. */
  plate: string;
  /** What the camera travels toward while this plate holds the screen. */
  aim: Vec2;
  /** The push, as a scale on the plate: where it starts, where it gets to. */
  zoom: [number, number];
  /** Takes the screen / starts leaving / is gone. */
  at: number;
  leaves: number;
  gone: number;
  /**
   * A window where the camera is genuinely still. The approach completes at
   * its start, which is what makes the stop a stop rather than a slow bit.
   */
  still?: [number, number];
  /**
   * The departure, where it is not simply more of the approach — a camera
   * that arrives on one thing and then leaves toward another.
   */
  leave?: { origin: Vec2; scale: number };
  /** What the eye does crossing into the next leg. */
  threshold: Threshold;
  /** Described for anyone who cannot see it. */
  description: string;
};

export const LEGS: Leg[] = [
  {
    id: 'shay-to-timematic',
    anchor: '01',
    plate: '/media/route-01-shay-to-timematic.webp',
    /* The TIMEMATIC entrance, where this plaza's rails converge. The camera
       follows the road rather than striking out across the square. */
    aim: { x: 0.418, y: 0.525 },
    zoom: [1, 2.4],
    at: 0,
    leaves: 0.175,
    gone: 0.22,
    /* Out of the sunset and in under the arch. */
    threshold: 'shadow',
    description:
      'המצלמה יוצאת מחזית SHAY ונוסעת על פסי הזהב שברחבת השיש אל שער הכניסה של TIMEMATIC.',
  },
  {
    id: 'timematic-stop',
    anchor: '02',
    plate: '/media/route-02-timematic-portfolio-stop.webp',
    /* The screen: the one place on the whole route where the camera is looking
       at the work rather than at the way on. It stops here — it does not
       approach through here. */
    aim: { x: 0.4975, y: 0.468 },
    zoom: [1, 1.055],
    at: 0.175,
    leaves: 0.455,
    gone: 0.51,
    /* The stop, and it is the longest single thing on the route. This anchor's
       whole purpose is that the camera halts while the project is presented,
       and a lens that keeps creeping through it has not halted. What moves in
       this window is the presentation, not the camera. */
    still: [0.315, 0.455],
    /*
     * Then the truck out to the exit composition — a second move rather than
     * more of the first: the camera leaves the work and turns toward the way
     * on.
     *
     * Both numbers are solved from the anchors rather than eased by feel.
     * Anchors 02 and 03 are the same hall, so two features appear in both: the
     * screen (centre 0.498,0.468 → 0.300,0.432) and the corridor's lit far end
     * (0.747,0.556 → 0.690,0.545). One scale about one origin has to carry
     * both. Solving that pair gives 1.535 about (0.867,0.535); checking it back
     * against the corridor lands within 0.007 of frame in x and 0.022 in y.
     * The origin sits just off the right edge at eye level, which is simply
     * where the corridor is.
     */
    leave: { origin: { x: 0.867, y: 0.535 }, scale: 1.535 },
    /* Nothing is crossed. Same room, same light, one continuous move. */
    threshold: 'none',
    description:
      'המצלמה נעצרת מול המסך הגדול באולם TIMEMATIC, שבו מוצג האתר, ואז נעה ימינה אל מוצא האולם.',
  },
  {
    id: 'timematic-to-corridor',
    anchor: '03',
    plate: '/media/route-03-timematic-to-corridor.webp',
    /* The corridor's own convergence, over on the right. The website is on the
       left of this frame and stays there: it is the wall being walked away
       from, not the way out. */
    aim: { x: 0.69, y: 0.545 },
    zoom: [1, 2.1],
    at: 0.455,
    leaves: 0.64,
    gone: 0.688,
    /* Off the hall's lit floor and into the corridor's shade. */
    threshold: 'shadow',
    description:
      'הרכב היציאה מ־TIMEMATIC: מסך האתר משמאל, והמסדרון הפיזי מימין הוא ההמשך של המסלול.',
  },
  {
    id: 'corridor-interior',
    anchor: '04',
    plate: '/media/route-04-corridor-interior.webp',
    /* The arch at the far end, at eye level, on the axis the floor lines
       converge along. */
    aim: { x: 0.495, y: 0.52 },
    zoom: [1, 2.8],
    at: 0.64,
    leaves: 0.85,
    gone: 0.898,
    /* Out of the corridor into the full sunset: here the eye is overtaken by
       light rather than by darkness, so this threshold opens instead of
       closing. */
    threshold: 'glare',
    description:
      'מעבר במסדרון השיש — על קירותיו לוחות הנחושת STRATEGY, DESIGN, EXPERIENCE — אל הקשת שבקצהו.',
  },
  {
    id: 'corridor-to-contact',
    anchor: '05',
    plate: '/media/route-05-corridor-to-contact.webp',
    /* The contact rotunda. Both sets of rails on this plaza bend toward it. */
    aim: { x: 0.561, y: 0.546 },
    /* The gentlest push on the route. The journey has arrived; it should not
       be seen to charge the last thing it wanted. */
    zoom: [1, 1.34],
    at: 0.85,
    leaves: 1,
    gone: 1,
    threshold: 'none',
    description:
      'יציאה מהמסדרון אל טיילת השיש, ופסי הזהב מובילים אל ביתן הקשר שמעבר לרחבה.',
  },
];

/**
 * How long the eye takes to clear, as a fraction of how long it took to close.
 * Adaptation is not symmetric — coming out of a threshold is quicker than
 * going into one — and this is also what keeps a white-out from turning into
 * half a screen of scrolling with nothing in it.
 */
const ADAPT_OUT_IN = 0.6;

/**
 * The legs with their neighbours resolved, and the two windows that follow
 * from them.
 *
 * `pushes` is the one that matters most, and it is why it is derived rather
 * than typed out per leg. **A leg does not start moving until the plate in
 * front of it has gone and the threshold has cleared.** Otherwise a leg is
 * already a third of the way into its push by the time anyone can see it, and
 * the composition its anchor fixes — the canonical camera position inside the
 * corridor, the exit composition in the hall — is one nobody is ever shown.
 * Every anchor on this route is reached at the framing it was approved at,
 * and that is what this line is for.
 */
const TIMELINE = LEGS.map((leg, index) => {
  const previous = LEGS[index - 1] as Leg | undefined;
  const cleared = previous
    ? previous.threshold === 'none'
      ? previous.gone
      : previous.gone + ADAPT_OUT_IN * (previous.gone - previous.leaves)
    : leg.at;

  return {
    leg,
    next: LEGS[index + 1] as Leg | undefined,
    previous,
    /** When this leg's own camera move begins. */
    pushes: previous ? cleared : leg.at,
    /** When the eye has finished adjusting to it. */
    cleared,
  };
});

/** The leg the reader is standing in, for anything that needs to name it. */
export function legAt(progress: number): Leg {
  let current = LEGS[0];
  for (const leg of LEGS) if (progress >= leg.at) current = leg;
  return current;
}

/* --------------------------------------------------------------------------
   The camera.

   A leg's transform is a scale about a point, which is what a dolly is when
   the thing being dollied is a flat plate: everything grows away from where
   the camera is heading. Both parts are emitted about the element's own origin
   (`transform-origin: 0 0`) for the reason the first act gives — a default
   origin of 50% 50% turns every off-centre move into a displacement nobody
   asked for.
   -------------------------------------------------------------------------- */

/** A scale about a point, as the (scale, translate) pair CSS wants. */
type Move = { s: number; tx: number; ty: number };

const IDENTITY: Move = { s: 1, tx: 0, ty: 0 };

const about = (s: number, origin: Vec2, width: number, height: number): Move => ({
  s,
  tx: (1 - s) * origin.x * width,
  ty: (1 - s) * origin.y * height,
});

/** `a` and then `b`, as one move. */
const then = (a: Move, b: Move): Move => ({
  s: a.s * b.s,
  tx: b.s * a.tx + b.tx,
  ty: b.s * a.ty + b.ty,
});

export type Plate = {
  /** Composed scale. */
  scale: number;
  /** Composed translation, in CSS px. */
  x: number;
  y: number;
  /** 1 while the plate holds the screen, 0 once it is gone. */
  opacity: number;
  /** Worth compositing at all: a leg not yet reached, or long left behind. */
  live: boolean;
  /** The eye still adjusting to this plate, 1 → 0, after a threshold. */
  adaptIn: number;
  /** The eye being taken by the next place, 0 → 1, into a threshold. */
  adaptOut: number;
};

/** Where a leg stands, before anything in front of it is taken into account. */
function moveOf(index: number, progress: number, width: number, height: number): Move {
  const { leg, pushes } = TIMELINE[index];
  /* A stop is a stop: the approach completes where the stop begins, and holds
     there until the departure. Nothing eases through a halt. */
  const arrivedBy = leg.still ? leg.still[0] : leg.leaves;
  const t = smooth(span(progress, pushes, arrivedBy));
  return about(leg.zoom[0] + (leg.zoom[1] - leg.zoom[0]) * t, leg.aim, width, height);
}

/**
 * Where the plate of leg `index` stands at a given point in the promenade.
 *
 * The leg underneath matters for exactly one reason. Where a leg departs by a
 * solved registration — the truck out of the TIMEMATIC stop — that
 * registration maps this plate onto the *next plate's own framing*, and the
 * next plate is not sitting still: it has begun its own push. So the departure
 * is composed on top of the next leg's move rather than replacing it. The two
 * then agree exactly at the moment of the swap however far the next leg has
 * got, and the camera's velocity carries across the seam instead of dipping to
 * zero in the middle of a truck.
 *
 * The leg in front matters for the other one: the eye's adaptation. A
 * threshold is one continuous event across two plates — it closes over the
 * plate being left and opens off the plate being arrived at — so the arrival
 * ramp starts exactly where the departure ramp finished, and the swap happens
 * underneath the darkest (or brightest) part of it.
 */
export function plateAt(index: number, progress: number, width: number, height: number): Plate {
  const { leg, next, previous } = TIMELINE[index];

  let move = moveOf(index, progress, width, height);

  if (leg.leave && progress > leg.leaves) {
    const away = smooth(span(progress, leg.leaves, leg.gone));
    const registration = about(
      1 + (leg.leave.scale - 1) * away,
      leg.leave.origin,
      width,
      height,
    );
    const carried = next ? moveOf(index + 1, progress, width, height) : IDENTITY;
    move = then(then(move, registration), carried);
  }

  /*
   * Dropped only at the very end of its departure. By then the plate is two or
   * three times the frame, and what is left of it on screen is the inside of
   * the opening the route is passing through — which is what the plate
   * underneath is showing. Fading it any earlier is the crossfade this whole
   * handoff exists to avoid.
   */
  const departs = leg.gone > leg.leaves;
  /*
   * How much of the departure the swap itself is allowed to take. Under a
   * threshold it can be unhurried — the wash is over the frame and nothing of
   * the swap is visible through it. Where there is no threshold (the truck out
   * of the stop, which is one continuous move inside one room) the two plates
   * are in solved register but not at identical scales, so any overlap shows
   * as a soft double on hard edges. There it is kept as short as it can be.
   */
  const swap = leg.threshold === 'none' ? 0.88 : 0.72;
  const opacity = departs
    ? 1 - span(progress, leg.leaves + (leg.gone - leg.leaves) * swap, leg.gone)
    : 1;

  /* The threshold out of this leg, and the tail of the one it was reached
     through — the same event, continued past the swap. */
  const adaptOut = leg.threshold === 'none' || !departs ? 0 : span(progress, leg.leaves, leg.gone);
  const adaptIn =
    previous && previous.threshold !== 'none'
      ? 1 - span(progress, previous.gone, TIMELINE[index].cleared)
      : 0;

  /* Five full-frame plates is four more than the compositor needs at once. */
  const live = progress >= leg.at - 0.02 && (!departs || progress <= leg.gone);

  return { scale: move.s, x: move.tx, y: move.ty, opacity, live, adaptIn, adaptOut };
}

/* --------------------------------------------------------------------------
   The invariant.

   The one rule this route cannot break is that the camera never travels into a
   website. It is easy to break by accident — nudging an aim a few points
   toward a nicer composition is exactly how a screen becomes a door — so it is
   checked rather than remembered.

   Two things are wrong, and they are different things:

   - A *travelling* leg aimed at a screen is heading into it. Only a leg that
     has stopped may look straight at one.
   - Any leg that pushes far enough for a screen to pass the edges of the frame
     has gone through it, whatever it was aimed at.
   -------------------------------------------------------------------------- */

/** How far outside a screen a travelling aim has to sit, as a fraction of frame. */
const CLEARANCE = 0.03;

export type Breach = {
  leg: string;
  anchor: string;
  reason: 'aimed-through' | 'travelled-through';
  detail: string;
};

/**
 * Every leg that has turned a portfolio screen into a doorway. An empty list
 * is the only correct answer.
 */
export function screenBreaches(): Breach[] {
  const breaches: Breach[] = [];

  for (const leg of LEGS) {
    const surfaces = SURFACES[leg.anchor] ?? [];
    const stops = Boolean(leg.still);
    /* Everything the plate is scaled by while this leg is on screen. */
    const reach = leg.zoom[1] * (leg.leave?.scale ?? 1);

    for (const surface of surfaces) {
      const aimed =
        leg.aim.x > surface.x0 - CLEARANCE &&
        leg.aim.x < surface.x1 + CLEARANCE &&
        leg.aim.y > surface.y0 - CLEARANCE &&
        leg.aim.y < surface.y1 + CLEARANCE;

      if (aimed && !stops) {
        breaches.push({
          leg: leg.id,
          anchor: leg.anchor,
          reason: 'aimed-through',
          detail: `aim ${leg.aim.x}, ${leg.aim.y} is on a screen and this leg is travelling`,
        });
      }

      const widest = (surface.x1 - surface.x0) * reach;
      const tallest = (surface.y1 - surface.y0) * reach;
      if (widest >= 1 || tallest >= 1) {
        breaches.push({
          leg: leg.id,
          anchor: leg.anchor,
          reason: 'travelled-through',
          detail: `a screen reaches ${widest.toFixed(2)}× the frame at this leg's ${reach.toFixed(2)}× push`,
        });
      }
    }
  }

  return breaches;
}
