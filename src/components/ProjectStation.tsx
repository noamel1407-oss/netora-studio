import { useCallback, useRef } from 'react';

import { PLATFORM, cameraAt, project, type Scene } from '../journey/scene';
import { useJourneyTravel } from '../journey/progress';
import { journey } from '../site.config';
import './ProjectStation.css';

type Props = { scene: Scene };

/**
 * Where the plaque stands on the platform: on the front edge, out to the side
 * of the computer where there is marble to stand on. A narrow frame does not
 * have that room — the plaque keeps a legible size while the platform shrinks
 * with the viewport — so there it comes back to the middle of the same edge.
 */
const ANCHOR = { wide: 620, narrow: 90, z: 520 };
/** The arrival window over which it becomes available. */
const FROM = 0.66;
const TO = 0.78;

/**
 * The one thing on the platform that can be acted on: a link to the live site.
 *
 * It stands on the marble rather than being pinned to the viewport — its
 * position is the same projection the platform itself is drawn with, so it
 * arrives with the architecture and sits on it. What it does not do is scale
 * with it: a link that shrinks into the distance is a link nobody can read or
 * hit, so the plaque holds a legible size and only leans on the camera's scale
 * a little.
 *
 * It lives outside the scene's `aria-hidden` layer, and stays `visibility:
 * hidden` until the arrival, so it is never a focus stop for a destination the
 * reader has not reached.
 */
export function ProjectStation({ scene }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(
    (travel: number) => {
      const root = rootRef.current;
      if (!root) return;

      /* Act one's clock for the arrival, the journey's for the departure: the
         route walks away from this platform and the link has to go with it,
         rather than following the camera into the next building. */
      const t = Math.min(1, travel);
      const left = Math.min(1, Math.max(0, (travel - 1) / 0.06));
      const shown = Math.min(1, Math.max(0, (t - FROM) / (TO - FROM))) * (1 - left);

      root.style.opacity = shown.toFixed(3);
      root.classList.toggle('is-available', shown > 0.5);
      if (shown <= 0) return;

      const camera = cameraAt(t, scene);
      const at = project(
        {
          x: (scene.sx < 0.7 ? ANCHOR.narrow : ANCHOR.wide) * scene.sx,
          y: PLATFORM.y * scene.sy,
          z: PLATFORM.z + ANCHOR.z,
        },
        camera,
      );

      /* Never off the frame, whatever the viewport does to the composition. */
      const margin = 84;
      const x = Math.min(Math.max(at.x, margin), scene.width - margin);
      const y = Math.min(Math.max(at.y, margin), scene.height - margin);
      const scale = Math.min(Math.max(at.k / 0.62, 0.86), 1.12);

      root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    },
    [scene],
  );

  useJourneyTravel(onScroll);

  if (!journey.liveUrl) return null;

  return (
    <div className="station" ref={rootRef}>
      <span className="station__tether" aria-hidden="true" />

      <a
        className="station__cta"
        href={journey.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="station__mark" aria-hidden="true" />
        לצפייה באתר
        <span className="visually-hidden">— {journey.title}, נפתח בחלון חדש</span>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M9 1h4v4M13 1 6.5 7.5M11 8.5V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      </a>
    </div>
  );
}
