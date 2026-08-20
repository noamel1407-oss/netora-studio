import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { useIsMobile, useIsTouch, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { trackJourney } from '../three/journey';
import './NetoraStage.css';

const NetoraScene = lazy(() => import('../three/NetoraScene'));

/** WebGL2 is required for the meshopt-compressed model to render sensibly. */
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Owns the fixed canvas that sits behind the page. Mounting is deferred until
 * the browser is idle so the 3D chunk never competes with first paint, and a
 * CSS stand-in holds the medallion's place until the model resolves.
 */
export function NetoraStage() {
  const mobile = useIsMobile();
  const touch = useIsTouch();
  const reducedMotion = usePrefersReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => trackJourney({ pointer: !touch }), [touch]);

  useEffect(() => {
    if (!supportsWebGL()) return;

    let cancelled = false;
    const start = () => !cancelled && setMounted(true);

    const idle = window.requestIdleCallback?.(start, { timeout: 1200 });
    const timer = idle === undefined ? window.setTimeout(start, 600) : undefined;

    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className="netora-stage" aria-hidden="true">
      <div className={`netora-stage__placeholder${ready ? ' is-hidden' : ''}`} />
      {mounted && (
        <Suspense fallback={null}>
          <NetoraScene mobile={mobile} reducedMotion={reducedMotion} onReady={onReady} />
        </Suspense>
      )}
    </div>
  );
}
