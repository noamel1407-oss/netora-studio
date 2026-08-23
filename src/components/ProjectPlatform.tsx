import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { ProjectScreen } from './ProjectScreen';
import { PLATFORM, travelOf, type Scene } from '../journey/scene';
import { useJourney } from '../journey/progress';
import { journey } from '../site.config';
import './ProjectPlatform.css';

type Props = { scene: Scene };

/**
 * The first floating platform, and the computer standing on it.
 *
 * It is a fixed place in the world — nothing here animates. The camera in
 * `CityTravel` carries the whole world past it, so the platform grows because
 * it is being approached, exactly as the architecture behind it does. All it
 * tracks by itself is the distance haze thinning out as the city's air stops
 * getting in the way, and whether the reader has arrived, which is when the
 * screen starts playing.
 *
 * Built as real geometry rather than a picture of geometry: a top surface, the
 * slab's thickness, its two flanks and a tapered plinth, all in one
 * `preserve-3d` space with the gold path and the monitor.
 */
export function ProjectPlatform({ scene }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);

  /* Placement and size: world units, resolved once per viewport. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const x = scene.vp.x + PLATFORM.x * scene.sx;
    const y = scene.vp.y + PLATFORM.y * scene.sy;

    root.style.transform = `translate3d(${x}px, ${y}px, ${PLATFORM.z}px)`;
    root.style.setProperty('--pw', `${PLATFORM.width * scene.s}px`);
    root.style.setProperty('--pd', `${PLATFORM.depth * scene.s}px`);
    root.style.setProperty('--pt', `${PLATFORM.thickness * scene.s}px`);
    /* On a narrow frame the platform is what fixes the scale, so the computer
       takes a larger share of it — otherwise the screen arrives too small to
       read on the device most likely to be reading it. */
    const share = scene.sx < 0.7 ? 0.74 : 0.62;
    root.style.setProperty('--mw', `${PLATFORM.width * share * scene.s}px`);
  }, [scene]);

  const onScroll = useCallback((progress: number) => {
    const root = rootRef.current;
    if (!root) return;

    const t = travelOf(progress);
    /* Atmospheric perspective: the city's air between us and the platform
       thins as we close on it. It supports the approach — the approach itself
       is the perspective growth, not this. */
    const haze = Math.max(0, 0.62 - t * 2.1);
    root.style.setProperty('--haze', haze.toFixed(3));
    setArrived((previous) => (t > 0.6 ? true : previous && t > 0.5));
  }, []);

  useJourney(onScroll);

  return (
    <div className="platform" ref={rootRef}>
      <div className="platform__mist platform__mist--back" />

      <div className="platform__slab">
        <div className="platform__face platform__face--top">
          <span className="platform__inlay" />
          <span className="platform__ring" />
          <span className="platform__contact" />
        </div>
        <div className="platform__face platform__face--front" />
        <div className="platform__face platform__face--left" />
        <div className="platform__face platform__face--right" />
        <div className="platform__keel" />
        <div className="platform__keel platform__keel--lower" />
      </div>

      <div className="platform__monitor">
        <div className="monitor__body">
          <div className="monitor__well">
            <ProjectScreen
              videoSrc={journey.shayVideoSrc}
              poster={journey.shayPoster}
              label={journey.shayVideoDescription}
              title={journey.title}
              subtitle={journey.subtitle}
              active={arrived}
            />
          </div>
          <div className="monitor__chin">
            <span className="monitor__mark">N</span>
          </div>
        </div>
        <div className="monitor__neck" />
        <div className="monitor__foot" />
      </div>

      <div className="platform__mist platform__mist--front" />
    </div>
  );
}
