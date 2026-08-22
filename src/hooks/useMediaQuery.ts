import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True when the visitor has asked the OS to minimise animation. */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
