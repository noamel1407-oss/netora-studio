import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { VaultVideo, type VaultVideoHandle } from './VaultVideo';
import { CityReveal } from './CityReveal';
import { vault } from '../site.config';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import './VaultHero.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * The opening journey: closed vault → scroll → the vault opens → we pass
 * through the doorway into the white city → the studio statement.
 *
 * One tall section with a sticky stage. Scroll position scrubs the
 * choreography (scale / translate / opacity only — all GPU-friendly), while
 * entering the section triggers the vault video itself, so playback stays
 * smooth on every device instead of fighting frame-accurate scrubbing.
 *
 * Under reduced motion (or without JS) the same markup renders as two calm,
 * fully readable full-height scenes.
 */
export function VaultHero() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<VaultVideoHandle>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animated = !reducedMotion;

  /* Scroll choreography. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !animated) return;

    const context = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.55,
        },
      });

      tl
        // The scroll cue retires as soon as the journey begins.
        .to('.journey__cue', { autoAlpha: 0, duration: 0.06 }, 0.02)
        // The city settles from a slight zoom as we move towards it.
        .fromTo(
          '.journey__city',
          { scale: 1.16, yPercent: 2.5 },
          { scale: 1, yPercent: 0, duration: 0.48, ease: 'power1.out' },
          0.22,
        )
        // Passing through the doorway: the vault frame grows past the screen…
        .to('.journey__vault', { scale: 2.3, yPercent: -5, duration: 0.42, ease: 'power2.in' }, 0.16)
        // …and dissolves once we are inside.
        .to('.journey__vault', { autoAlpha: 0, duration: 0.2 }, 0.4)
        // The statement rises with the world already in place.
        .fromTo(
          '.city__content > *',
          { y: 42, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.16, stagger: 0.05, ease: 'power2.out' },
          0.56,
        )
        // Hold the finished composition before the section releases.
        .to({}, { duration: 0.22 }, 0.78);

      // Hybrid playback: the first real scroll into the journey opens the
      // vault; scrolling back above the hero quietly closes it again.
      ScrollTrigger.create({
        trigger: root,
        start: '2% top',
        onEnter: () => videoRef.current?.play(),
        onLeaveBack: () => videoRef.current?.reset(),
      });
    }, root);

    return () => context.revert();
  }, [animated]);

  /* Flips the fixed header to light chrome once the world turns bright. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const update = () => {
      const rect = root.getBoundingClientRect();
      const rootTop = rect.top + window.scrollY;
      let boundary: number;

      if (animated) {
        // Mid-journey the vault has dissolved and the sky owns the screen.
        boundary = rootTop + rect.height * 0.5;
      } else {
        const city = root.querySelector<HTMLElement>('.journey__city');
        boundary = city ? city.getBoundingClientRect().top + window.scrollY - 72 : rootTop;
      }

      document.documentElement.classList.toggle('is-light-world', window.scrollY >= boundary);
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.documentElement.classList.remove('is-light-world');
    };
  }, [animated]);

  return (
    <section
      ref={rootRef}
      className={`journey${animated ? ' is-animated' : ''}`}
      aria-labelledby="about-title"
    >
      <p className="visually-hidden">{vault.description}</p>

      {/* Lands "אודות" links at the statement, not at the closed vault. */}
      <div id="about" className="journey__anchor" aria-hidden="true" />

      <div className="journey__stage">
        {/* Vault first in flow (it is the first static scene); in animated
            mode the explicit z-indices stack it above the city anyway. */}
        <div className="journey__vault">
          <VaultVideo ref={videoRef} animated={animated} />

          <div className="journey__cue" aria-hidden="true">
            <span className="journey__mouse">
              <i />
            </span>
            <span className="journey__cue-text">גללו להמשך</span>
          </div>
        </div>

        <div className="journey__city">
          <CityReveal />
        </div>
      </div>
    </section>
  );
}
