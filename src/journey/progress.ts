import { useLayoutEffect } from 'react';

import { travelOf } from './scene';

/**
 * One scrubbed journey, one number.
 *
 * VaultHero owns the only ScrollTrigger on the page and publishes its progress
 * here; the camera-driven parts of the scene subscribe. Keeping it to a single
 * published value is what stops the travel, the path and the platform from
 * drifting out of step with each other, and it means no component runs a
 * requestAnimationFrame loop of its own.
 */
type Listener = (progress: number) => void;

const listeners = new Set<Listener>();
let current = 0;

export function publishJourney(progress: number) {
  current = progress;
  for (const listener of listeners) listener(progress);
}

export const journeyProgress = () => current;

/** Runs `apply` on every scrub, and once on mount with the current position. */
export function useJourney(apply: Listener, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    listeners.add(apply);
    apply(current);
    return () => {
      listeners.delete(apply);
    };
  }, [apply, enabled]);
}

/* --------------------------------------------------------------------------
   Act two's own clock.

   A second bus rather than a second meaning for the first one. Everything
   built before this reads `useJourney` and expects 0 → 1 to mean act one from
   end to end; making that number mean something else once the container grew
   would be the quiet kind of change that breaks a journey nobody touched.
   -------------------------------------------------------------------------- */

const routeListeners = new Set<Listener>();
let route = 0;

export function publishRoute(progress: number) {
  route = progress;
  for (const listener of routeListeners) listener(progress);
}

export const routeProgress = () => route;

/** Runs `apply` on every scrub, and once on mount with the current position. */
export function useRoute(apply: Listener, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    routeListeners.add(apply);
    apply(route);
    return () => {
      routeListeners.delete(apply);
    };
  }, [apply, enabled]);
}

/* --------------------------------------------------------------------------
   The whole journey, as one number.

   Act one publishes 0 → 1 over its own length and act two publishes 0 → 1 over
   its own, which is what keeps either of them from redefining the other. But
   the camera is one camera walking one world, so the thing it reads is the two
   of them end to end: `travelOf()` saturates at 1 exactly as the route begins
   at 0, so adding them gives 0 → 1 through act one and 1 → 2 through act two,
   with no seam and no mode to get wrong.
   -------------------------------------------------------------------------- */

export const journeyTravel = () => travelOf(current) + route;

/** Runs `apply` with the journey's travel whenever either act moves. */
export function useJourneyTravel(apply: Listener, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const relay = () => apply(journeyTravel());
    listeners.add(relay);
    routeListeners.add(relay);
    relay();
    return () => {
      listeners.delete(relay);
      routeListeners.delete(relay);
    };
  }, [apply, enabled]);
}
