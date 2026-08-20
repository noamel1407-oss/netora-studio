import { useStageAnchor } from '../hooks/useStageAnchor';
import './Hero.css';

export function Hero() {
  const anchor = useStageAnchor('hero');

  return (
    <section className="hero" id="about" ref={anchor} aria-labelledby="hero-title">
      <div className="shell hero__inner">
        <div className="hero__copy">
          <h1 className="hero__title reveal" id="hero-title">
            <span>אנחנו בונים</span>{' '}
            <span className="gold">אתרים תלת־ממדיים</span>{' '}
            <span>שמשאירים חותם.</span>
          </h1>

          <p className="hero__lede reveal">חווית גלישה. עיצוב יוקרתי. טכנולוגיה מתקדמת.</p>
        </div>

        <div className="hero__orb" aria-hidden="true" />

        <a className="btn hero__cta reveal" href="#work">
          לצפייה בעבודות שלנו ↓
        </a>
      </div>

      <a className="hero__scroll" href="#work">
        <span className="visually-hidden">דילוג לעבודות נבחרות</span>
        <span className="hero__mouse" aria-hidden="true">
          <i />
        </span>
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden="true">
          <path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </a>
    </section>
  );
}
