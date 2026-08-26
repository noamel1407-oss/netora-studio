import { useCallback, useLayoutEffect, useRef } from 'react';

import { GoldPath } from './GoldPath';
import { ProjectPlatform } from './ProjectPlatform';
import { RouteGreybox } from './RouteGreybox';
import { ProjectStation } from './ProjectStation';
import { ARRIVAL_PROGRESS, cameraAt } from '../journey/scene';
import { publishJourney, useJourneyTravel } from '../journey/progress';
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
 *
 * The rail sits outside the stage rather than inside it. The platform has to
 * come out of the city's air somewhere past the statement, and the only way to
 * do that without flattening its perspective is an opacity on a wrapper — one
 * the route must not share, because the route is lit long before the platform
 * is. So the stage carries the world and its emergence, the rail is drawn
 * either side of it, and the two are stacked around each other.
 */
export function CityTravel({ still }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const scene = useScene();

  /* The scene's own vanishing point, shared with the artwork behind it. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    stage.style.perspectiveOrigin = `${scene.vp.x}px ${scene.vp.y}px`;
    root.style.setProperty('--vpx', `${scene.vp.x}px`);
    root.style.setProperty('--vpy', `${scene.vp.y}px`);
  }, [scene]);

  const onScroll = useCallback(
    (travel: number) => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const world = worldRef.current;
      if (!root || !stage || !world) return;

      /* Journey travel, not act one's progress: the camera keeps going past
         the platform, and freezing it here is what would turn the route into
         a second scene rather than more of this one. */
      const camera = cameraAt(travel, scene);

      /* The platform comes out of the city's air as the statement clears the
         frame — after that everything it does is distance, not opacity.
         (Applied to the stage, outside the 3D context: opacity on the world
         itself would flatten its perspective.) */
      stage.style.opacity = Math.min(1, camera.t / 0.09).toFixed(3);

      stage.style.transform = `translate3d(0, ${camera.tiltY.toFixed(2)}px, 0)`;
      world.style.transform = `translate3d(${camera.x.toFixed(2)}px, 0, ${camera.z.toFixed(2)}px)`;
      root.style.setProperty('--air', (camera.t * 0.5).toFixed(3));
    },
    [scene],
  );

  useJourneyTravel(onScroll);

  /* Without a scrubbed timeline nothing publishes a position, so the scene is
     placed at its arrival once and stays there. */
  useLayoutEffect(() => {
    if (still) publishJourney(ARRIVAL_PROGRESS);
  }, [still, scene]);

  return (
    <>
      <div className="travel" ref={rootRef} aria-hidden="true">
        <GoldPath scene={scene} />

        <div className="travel__stage" ref={stageRef}>
          <div className="travel__world" ref={worldRef}>
            <div className="travel__veil" />
            <ProjectPlatform scene={scene} />
            {/* Act two's architecture stands in this same subtree, placed by
                the same projection, because it is the same world — the camera
                simply keeps going until it reaches it. */}
            <RouteGreybox scene={scene} />
          </div>
        </div>

        <div className="travel__air" />
      </div>

      {/* Outside the scene's aria-hidden layer: it is the one thing here that
          can be acted on, so it has to reach the keyboard and the reader. */}
      <ProjectStation scene={scene} />
    </>
  );
}
