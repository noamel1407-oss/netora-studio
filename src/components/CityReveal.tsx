import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cameraAt, travelOf } from '../journey/scene';
import { useJourney } from '../journey/progress';
import { useScene } from '../journey/useScene';
import { world } from '../site.config';
import './CityReveal.css';

type Props = {
  /** The statement is the page's <h1>; the arrival scene renders without it. */
  statement?: boolean;
  /**
   * True where this backdrop is the one being travelled through: the artwork
   * then takes the camera's move at the distance of a skyline.
   */
  dolly?: boolean;
  /** The travelling scene, between the world and the statement. */
  children?: ReactNode;
};

/**
 * The world behind the vault: white architecture, evening sky, and the studio
 * statement. VaultHero drives its scroll choreography; on its own (reduced
 * motion / no JS) it renders as a complete static scene.
 *
 * The artwork is not a background that a separate scene sits on top of — it is
 * the far end of the same space. It scales about the vanishing point its own
 * perspective already converges on, which is the point the platform and the
 * gold path are placed around, so a forward move reads as one camera rather
 * than a picture being enlarged behind some objects.
 */
export function CityReveal({ statement = true, dolly = false, children }: Props) {
  const [bgMissing, setBgMissing] = useState(false);
  const bgRef = useRef<HTMLImageElement>(null);
  const scene = useScene();

  useLayoutEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    /* The framing that puts the artwork's own convergence where the scene in
       front of it converges. On a wide screen this is the artwork's natural
       crop; a narrow one pans it rather than moving the vanishing point, so
       the two can never disagree. */
    bg.style.objectPosition = `${(scene.focus.x * 100).toFixed(2)}% ${(scene.focus.y * 100).toFixed(2)}%`;
    if (dolly) bg.style.transformOrigin = `${scene.vp.x}px ${scene.vp.y}px`;
  }, [scene, dolly]);

  const onScroll = useCallback(
    (progress: number) => {
      const bg = bgRef.current;
      if (!bg) return;
      const { bg: camera } = cameraAt(travelOf(progress), scene);
      bg.style.transform = `translate3d(${camera.x.toFixed(2)}px, ${camera.y.toFixed(2)}px, 0) scale(${camera.scale.toFixed(4)})`;
    },
    [scene],
  );

  useJourney(onScroll, dolly);

  return (
    <div className={`city${bgMissing ? ' city--no-image' : ''}`}>
      <img
        className="city__bg"
        ref={bgRef}
        src={world.city}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="lazy"
        onError={() => setBgMissing(true)}
      />
      <div className="city__tint" aria-hidden="true" />

      {children}

      {statement && (
        <div className="shell city__content">
          {/* Local, directional, and on the type's own side of the frame: the
              city stays bright and the route stays visible through it. */}
          <span className="city__scrim" aria-hidden="true" />

          <h1 className="city__title" id="about-title">
            <span className="city__line">אנחנו בונים</span>
            <span className="city__line city__line--gold">אתרים תלת־ממדיים</span>
            <span className="city__line">שמשאירים חותם.</span>
          </h1>

          <p className="city__lede">
            חוויות דיגיטליות יוקרתיות שמספרות סיפור, מעוררות רגש ומניעות לפעולה.
          </p>

          <a className="city__cta" href="#work">
            לצפייה בעבודות שלנו
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
              <path d="M5.5 0v11M1 7.6l4.5 4.5L10 7.6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
