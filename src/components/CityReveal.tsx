import { useState } from 'react';

import { world } from '../site.config';
import './CityReveal.css';

/**
 * The world behind the vault: white architecture, evening sky, and the studio
 * statement. VaultHero drives its scroll choreography; on its own (reduced
 * motion / no JS) it renders as a complete static scene.
 */
export function CityReveal() {
  const [bgMissing, setBgMissing] = useState(false);

  return (
    <div className={`city${bgMissing ? ' city--no-image' : ''}`}>
      <img
        className="city__bg"
        src={world.city}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="lazy"
        onError={() => setBgMissing(true)}
      />
      <div className="city__tint" aria-hidden="true" />

      <div className="shell city__content">
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
    </div>
  );
}
