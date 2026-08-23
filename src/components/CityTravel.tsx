import { useCallback, useLayoutEffect, useRef } from 'react';

import { GoldPath } from './GoldPath';
import { ProjectPlatform } from './ProjectPlatform';
import { JOURNEY, cameraAt, travelOf } from '../journey/scene';
import { publishJourney, useJourney } from '../journey/progress';
import { useScene } from '../journey/useScene';
import './CityTravel.css';

type Props = {
  /** Reduced motion: the arrival is composed once and never moves. */
  still: boolean;
};

/**
 * The travel: the stretch of the journey where the city keeps going.
 *
 * There is one camera here, and everything answers to it. The city artwork is
 * the matte painting at the back and takes the move at the distance of a
 * skyline — a slow swell, barely a lateral shift. The gold path and the
 * platform stand in front of it and take the same move from a few hundred
 * units away, so they sweep past while the skyline holds. That difference is
 * the depth: no layer of the picture was cut up to fake it.
 *
 * The vertical part of the move is a tilt rather than a rise — carried on the
 * stage as a plain translate — so the horizon travels with the platform
 * instead of sliding against it.
 */
export function CityTravel({ still }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const scene = useScene();

  /* The scene's own vanishing point, shared with the artwork behind it. */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.perspectiveOrigin = `${scene.vp.x}px ${scene.vp.y}px`;
    stage.style.setProperty('--vpx', `${scene.vp.x}px`);
    stage.style.setProperty('--vpy', `${scene.vp.y}px`);
  }, [scene]);

  const onScroll = useCallback(
    (progress: number) => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const world = worldRef.current;
      if (!root || !stage || !world) return;

      const camera = cameraAt(travelOf(progress), scene);

      /* The scene comes out of the city's air exactly as the statement clears
         the frame — after that everything it does is distance, not opacity.
         (Applied here, outside the 3D context: opacity on the world itself
         would flatten its perspective.) */
      root.style.opacity = Math.min(1, camera.t / 0.09).toFixed(3);

      stage.style.transform = `translate3d(0, ${camera.tiltY.toFixed(2)}px, 0)`;
      world.style.transform = `translate3d(${camera.x.toFixed(2)}px, 0, ${camera.z.toFixed(2)}px)`;
      stage.style.setProperty('--air', (camera.t * 0.5).toFixed(3));
    },
    [scene],
  );

  useJourney(onScroll);

  /* Without a scrubbed timeline nothing publishes a position, so the scene is
     placed at its arrival once and stays there. */
  useLayoutEffect(() => {
    if (still) publishJourney(JOURNEY.travelTo);
  }, [still, scene]);

  return (
    <div className="travel" ref={rootRef} aria-hidden="true">
      <div className="travel__stage" ref={stageRef}>
        <div className="travel__world" ref={worldRef}>
          <div className="travel__veil" />
          <ProjectPlatform scene={scene} />
        </div>

        <GoldPath scene={scene} />
        <div className="travel__air" />
      </div>
    </div>
  );
}
