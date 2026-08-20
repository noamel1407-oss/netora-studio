/**
 * Drives the Netora symbol's trip through the page.
 *
 * Section elements register themselves by id; scrolling produces a continuous
 * `stage` float (0 = hero, 1 = work, 2 = reviews, 3 = contact) which the scene
 * interpolates between keyframes. Kept outside React state on purpose: it is
 * read every frame and must never trigger a re-render.
 */

export type Keyframe = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
};

/**
 * Order matches STAGE_IDS. Positions are tuned so the symbol never sits behind
 * running text — it owns the empty half of each composition instead.
 */
export const DESKTOP_KEYFRAMES: Keyframe[] = [
  // Hero — stays inside the right orb column; never crosses the headline.
  { position: [1.56, 0.04, 0.12], rotation: [0.18, -0.72, 0.08], scale: 1.14, opacity: 1 },
  // Work — leaves the frame so the laptop can own the scene.
  { position: [2.6, 0.9, -3.2], rotation: [0.22, -1.05, 0.14], scale: 0.22, opacity: 0 },
  // Reviews — fully gone. Trails must not cross the coverflow.
  { position: [0.2, -0.4, -6], rotation: [0.08, 0.3, 0], scale: 0.12, opacity: 0 },
  // Contact — parked in the visual slot above the headline, never on the form.
  { position: [-1.38, 0.78, -0.08], rotation: [0.12, 0.5, 0.04], scale: 0.38, opacity: 1 },
  // Footer — out of the way, never a washed-out ghost.
  { position: [-0.2, -1.9, -2.4], rotation: [0.06, 0.2, 0], scale: 0.22, opacity: 0 },
];

export const MOBILE_KEYFRAMES: Keyframe[] = [
  // Hero — sits in the orb under the headline, above the CTA.
  { position: [0, -0.18, 0], rotation: [0.14, -0.52, 0.05], scale: 0.55, opacity: 1 },
  { position: [0.8, 1.6, -2.8], rotation: [0.12, -0.6, 0.08], scale: 0.18, opacity: 0 },
  { position: [0, 0.1, -5], rotation: [0.06, 0.2, 0], scale: 0.1, opacity: 0 },
  // Contact — sized and raised to sit inside the reserved orb slot between the
  // headline and the form, never across the first field.
  { position: [0, 0.48, -0.35], rotation: [0.1, 0.4, 0.04], scale: 0.3, opacity: 1 },
  { position: [0, -1.5, -2.4], rotation: [0.04, 0.16, 0], scale: 0.16, opacity: 0 },
];

export const STAGE_IDS = ['hero', 'work', 'reviews', 'contact', 'footer'] as const;

type State = {
  /** Continuous position along STAGE_IDS. */
  stage: number;
  /** Normalised cursor, -1..1 on both axes. Zero on touch devices. */
  pointerX: number;
  pointerY: number;
  /** False once the 3D sections have scrolled away, so rendering can stop. */
  inView: boolean;
};

export const journey: State = { stage: 0, pointerX: 0, pointerY: 0, inView: true };

const anchors = new Map<string, HTMLElement>();

export function registerStage(id: string, element: HTMLElement | null) {
  if (element) anchors.set(id, element);
  else anchors.delete(id);
  // Anchors mount after the tracker starts, so re-measure whenever one appears.
  if (typeof window !== 'undefined') requestAnimationFrame(() => recompute());
}

/** Scroll offset at which a section is considered "centred". */
function anchorOffset(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  const top = box.top + window.scrollY;
  return top + box.height / 2 - window.innerHeight / 2;
}

function recompute() {
  const offsets = STAGE_IDS.map((id) => {
    const element = anchors.get(id);
    return element ? anchorOffset(element) : null;
  });

  const known = offsets.map((offset, index) => ({ offset, index })).filter((entry) => entry.offset !== null) as {
    offset: number;
    index: number;
  }[];

  if (known.length === 0) return;

  const y = window.scrollY;

  if (y <= known[0].offset) {
    journey.stage = known[0].index;
  } else if (y >= known[known.length - 1].offset) {
    journey.stage = known[known.length - 1].index;
  } else {
    for (let i = 0; i < known.length - 1; i += 1) {
      const from = known[i];
      const to = known[i + 1];
      if (y >= from.offset && y <= to.offset) {
        const span = to.offset - from.offset || 1;
        const t = (y - from.offset) / span;
        journey.stage = from.index + (to.index - from.index) * t;
        break;
      }
    }
  }

  // Stop rendering once the last 3D section is well above the viewport.
  const last = anchors.get(STAGE_IDS[STAGE_IDS.length - 1]);
  journey.inView = last ? last.getBoundingClientRect().bottom > -window.innerHeight * 0.5 : true;
}

/** Interpolates the keyframe list at the current continuous stage value. */
export function sampleKeyframes(frames: Keyframe[], stage: number, out: Keyframe): Keyframe {
  const clamped = Math.max(0, Math.min(frames.length - 1, stage));
  const lower = Math.floor(clamped);
  const upper = Math.min(frames.length - 1, lower + 1);
  const raw = clamped - lower;
  // Ease the blend so sections settle rather than arriving at constant speed.
  const t = raw * raw * (3 - 2 * raw);

  const a = frames[lower];
  const b = frames[upper];

  for (let i = 0; i < 3; i += 1) {
    out.position[i] = a.position[i] + (b.position[i] - a.position[i]) * t;
    out.rotation[i] = a.rotation[i] + (b.rotation[i] - a.rotation[i]) * t;
  }
  out.scale = a.scale + (b.scale - a.scale) * t;
  out.opacity = a.opacity + (b.opacity - a.opacity) * t;
  return out;
}

let listening = 0;

/** Starts scroll/pointer tracking; returns a matching teardown. */
export function trackJourney(options: { pointer: boolean }) {
  listening += 1;

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      recompute();
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    journey.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    journey.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
  };

  const onPointerLeave = () => {
    journey.pointerX = 0;
    journey.pointerY = 0;
  };

  recompute();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (options.pointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
  }

  return () => {
    listening -= 1;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    if (listening === 0) {
      journey.pointerX = 0;
      journey.pointerY = 0;
    }
  };
}
