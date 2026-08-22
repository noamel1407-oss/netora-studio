import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { VaultVideo, type VaultVideoHandle } from './VaultVideo';
import { CityReveal } from './CityReveal';
import { vault } from '../site.config';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import './VaultHero.css';

gsap.registerPlugin(ScrollTrigger);

/** Scroll progress over which the door itself is opening. */
const DOOR_FROM = 0.04;
const DOOR_TO = 0.72;
/** Where the camera leaves the vault layer behind and the city takes over. */
const HANDOFF = 0.72;

/**
 * The opening journey: closed vault → scroll → the vault opens → we pass
 * through the doorway into the white city → the studio statement.
 *
 * The door is not played, it is scrubbed: scroll position maps to the video's
 * `currentTime`, so it opens as the reader moves down and closes as they move
 * back up. The render ends at the threshold, still framed by the doorway; the
 * city layer underneath is the same street a few paces further in, with no
 * doorway in it at all. The frame then flies past the camera and uncovers it.
 * That ordering is the whole trick: the reader arrives somewhere, rather than
 * watching one picture dissolve into another. Everything else is
 * transform/opacity only.
 *
 * Without the video (not yet dropped in, or a decoder that refuses to seek)
 * the same timeline still runs on the poster: the frame pushes past the camera
 * and the city opens up behind it. Under reduced motion (or without JS) the
 * markup renders as two calm, fully readable full-height scenes.
 */
export function VaultHero() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<VaultVideoHandle>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animated = !reducedMotion;

  /* Drives which choreography runs; the ref keeps the scrub callback stable. */
  const [scrubbable, setScrubbable] = useState(false);
  const scrubbableRef = useRef(false);

  const onReadyChange = useCallback((ready: boolean) => {
    scrubbableRef.current = ready;
    setScrubbable(ready);
  }, []);

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
          // Light smoothing: enough to take the jitter out of a trackpad,
          // short enough that the door still feels attached to the fingers.
          scrub: 0.4,
          onUpdate: ({ progress }) => {
            if (!scrubbableRef.current) return;
            const door = (progress - DOOR_FROM) / (DOOR_TO - DOOR_FROM);
            videoRef.current?.seek(Math.min(Math.max(door, 0), 1));
          },
        },
      });

      tl
        // The scroll cue retires as soon as the journey begins.
        .to('.journey__cue', { autoAlpha: 0, duration: 0.06 }, 0.02)
        // The city settles from a slight zoom as we move towards it.
        .fromTo(
          '.journey__city',
          { scale: 1.16, yPercent: 2.5 },
          { scale: 1, yPercent: 0, duration: 0.62, ease: 'power1.out' },
          0.22,
        );

      if (scrubbableRef.current) {
        // The render brings the camera to the threshold; the last of the
        // travel is the doorway itself flying past. The frame scales until it
        // is off every edge, and only then — with barely any of it left on
        // screen — does the layer go. Fading a frame that still fills the
        // screen is the dissolve this is meant to avoid.
        tl
          .to(
            '.journey__vault',
            { scale: 3.4, yPercent: -6, duration: 0.26, ease: 'power2.in' },
            HANDOFF - 0.06,
          )
          .to('.journey__vault', { autoAlpha: 0, duration: 0.04 }, HANDOFF + 0.18);
      } else {
        // No scrubbable render: the still has to do the travelling itself.
        tl
          .to('.journey__vault', { scale: 2.3, yPercent: -5, duration: 0.42, ease: 'power2.in' }, 0.16)
          .to('.journey__vault', { autoAlpha: 0, duration: 0.2 }, 0.4);
      }

      tl
        // The statement rises with the world already in place.
        .fromTo(
          '.city__content > *',
          { y: 42, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.16, stagger: 0.05, ease: 'power2.out' },
          0.82,
        )
        // Hold the finished composition before the section releases.
        .to({}, { duration: 0.04 }, 0.96);
    }, root);

    return () => context.revert();
  }, [animated, scrubbable]);

  /* Flips the fixed header to light chrome once the world turns bright. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const update = () => {
      const rect = root.getBoundingClientRect();
      const rootTop = rect.top + window.scrollY;
      let boundary: number;

      if (animated) {
        // The world takes the screen as the camera clears the doorway.
        boundary = rootTop + rect.height * (scrubbable ? HANDOFF : 0.5);
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
  }, [animated, scrubbable]);

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
          <VaultVideo ref={videoRef} animated={animated} onReadyChange={onReadyChange} />

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
