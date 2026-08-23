import { useLayoutEffect } from 'react';

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
