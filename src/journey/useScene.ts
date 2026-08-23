import { useEffect, useState } from 'react';

import { sceneFor, type Scene } from './scene';

const measure = (): Scene =>
  typeof window === 'undefined'
    ? sceneFor(1440, 900)
    : sceneFor(window.innerWidth, window.innerHeight);

/**
 * The scene, resolved for the current viewport. The depth choreography never
 * changes; what the viewport decides is how wide the world spreads and how
 * tall it stands, and where the artwork's vanishing point has landed.
 */
export function useScene(): Scene {
  const [scene, setScene] = useState<Scene>(measure);

  useEffect(() => {
    let queued = false;
    const onResize = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        setScene((current) => {
          const next = measure();
          return next.width === current.width && next.height === current.height ? current : next;
        });
      });
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return scene;
}
