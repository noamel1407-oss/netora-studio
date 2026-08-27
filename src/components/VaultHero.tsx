import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { VaultVideo, type VaultVideoHandle } from './VaultVideo';
import { CityReveal } from './CityReveal';
import { CityTravel } from './CityTravel';
import { JOURNEY } from '../journey/scene';
import { publishJourney, publishRoute } from '../journey/progress';
import { journey, vault } from '../site.config';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import './VaultHero.css';

gsap.registerPlugin(ScrollTrigger);

const { doorFrom: DOOR_FROM, doorTo: DOOR_TO, handoff: HANDOFF } = JOURNEY;

/**
 * How much of the container's *scrolled* length act one owns.
 *
 * Not its share of the container's height, which is the obvious answer and the
 * wrong one. A sticky container is scrubbed over its height less one viewport,
 * and that viewport used to come out of act one alone — so taking it out of
 * the pair and splitting what is left by height stretched act one's scroll by
 * 4.6% and moved every beat in it. The baseline caught it; this is the fix.
 *
 * Both lengths are in `svh`, so one viewport is 100 of them and the whole
 * thing falls out without needing to know how tall the window is.
 */
const shareOfScroll = (one: number, two: number) => (one - 100) / (one + two - 100);

/**
 * The journey: closed vault → the vault opens → we pass through the doorway
 * into the white city → the studio statement → the city keeps going → the gold
 * path takes over and carries us out to the first floating platform.
 *
 * It is one scrubbed container from end to end. Nothing here starts when
 * something else finishes: the door, the statement's arrival and departure and
 * the travel out to SHAY are all positions on a single timeline, which is what
 * removes the seam a reader would otherwise feel between "the hero" and "the
 * work". Scroll forward and the journey advances; scroll back and it runs in
 * reverse, including the route drawing itself back in.
 *
 * The door is not played, it is scrubbed: scroll position maps to the video's
 * `currentTime`. The render ends at the threshold, still framed by the
 * doorway; the city layer underneath is the same street a few paces further
 * in, with no doorway in it at all. The frame then flies past the camera and
 * uncovers it — the reader arrives somewhere, rather than watching one picture
 * dissolve into another.
 *
 * Without the video (not yet dropped in, or a decoder that refuses to seek)
 * the same timeline still runs on the poster. Under reduced motion (or without
 * JS) the markup renders as three calm, fully readable full-height scenes.
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

    /*
     * Act one owns the first slice of the container, and every position below
     * is a fraction of *that*, not of the whole thing. `--act-one-h` and
     * `--act-two-h` are the only statement of the split, so the share is read
     * from them rather than repeated here — which is what makes appending act
     * two unable to move anything act one does.
     *
     * `actOne(0.24)` means "where act one is 24% through", wherever that now
     * falls on the longer container.
     */
    const heights = getComputedStyle(root);
    const one = parseFloat(heights.getPropertyValue('--act-one-h')) || 100;
    const two = parseFloat(heights.getPropertyValue('--act-two-h')) || 0;
    const share = shareOfScroll(one, two);
    const actOne = (at: number) => at * share;
    const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

    const context = gsap.context(() => {
      /* Declared before the timeline it reads: ScrollTrigger can render the
         timeline while it is still being constructed. */
      let timeline: gsap.core.Timeline | undefined;

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        /* The camera reads the smoothed position, so the travel and the
           tweens above it stay in step. */
        onUpdate: () => {
          const at = timeline?.progress() ?? 0;
          publishJourney(clamp01(at / share));
          /* A zero-length act two leaves nothing to publish, and dividing by
             the nothing it owns is how that would otherwise be discovered. */
          publishRoute(share >= 1 ? 0 : clamp01((at - share) / (1 - share)));
        },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          // Light smoothing: enough to take the jitter out of a trackpad,
          // short enough that the door still feels attached to the fingers.
          scrub: 0.4,
          onUpdate: ({ progress }) => {
            if (!scrubbableRef.current) return;
            const at = clamp01(progress / share);
            const door = (at - DOOR_FROM) / (DOOR_TO - DOOR_FROM);
            videoRef.current?.seek(Math.min(Math.max(door, 0), 1));
          },
        },
      });

      timeline = tl;

      tl
        // The scroll cue retires as soon as the journey begins.
        .to('.journey__cue', { autoAlpha: 0, duration: actOne(0.02) }, actOne(0.007))
        // The city settles from a slight zoom as we move towards it.
        .fromTo(
          '.journey__city',
          { scale: 1.16, yPercent: 2.5 },
          { scale: 1, yPercent: 0, duration: actOne(0.21), ease: 'power1.out' },
          actOne(0.073),
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
            { scale: 3.4, yPercent: -6, duration: actOne(0.087), ease: 'power2.in' },
            actOne(HANDOFF - 0.02),
          )
          .to('.journey__vault', { autoAlpha: 0, duration: actOne(0.013) }, actOne(HANDOFF + 0.06));
      } else {
        // No scrubbable render: the still has to do the travelling itself.
        tl
          .to('.journey__vault', { scale: 2.3, yPercent: -5, duration: actOne(0.14), ease: 'power2.in' }, actOne(0.053))
          .to('.journey__vault', { autoAlpha: 0, duration: actOne(0.066) }, actOne(0.133));
      }

      tl
        // The light behind the type arrives just ahead of it, so the words
        // never land on bare sky.
        .fromTo(
          '.city__scrim',
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: actOne(0.035), ease: 'power1.out' },
          actOne(JOURNEY.statementIn - 0.025),
        )
        // The statement rises with the world already in place, and is fully
        // landed well before anything asks it to leave.
        .fromTo(
          '.city__line, .city__lede, .city__cta',
          { y: 38, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: actOne(0.042), stagger: actOne(0.011), ease: 'power2.out' },
          actOne(JOURNEY.statementIn),
        )
        // Nothing between here and statementOut: the statement simply sits
        // there, composed and readable, while the route goes on drawing itself
        // underneath. That stretch of stillness is the point of it.
        //
        // Then it leaves the way anything else the camera passes leaves: it
        // grows a little and slips off the top of the frame while the world
        // behind it carries on moving. The scene is never faded out.
        .to(
          '.city__content',
          { yPercent: -13, scale: 1.09, autoAlpha: 0, duration: actOne(0.075), ease: 'power2.in' },
          actOne(JOURNEY.statementOut),
        )
        // Keeps the timeline exactly one unit long, so its positions and the
        // container's scroll progress are the same number.
        .to({}, { duration: 0.01 }, 0.99);
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
        // The world takes the screen as the camera clears the doorway — a
        // position on act one's clock, so the container's total length, which
        // now includes act two, must not enter into it.
        /* A fraction of act one's own height, which is what this always was —
           `rect.height` is the pair of them now, and using it moved the flip
           125px earlier. `--act-one-h` is in svh, so one per cent of it is one
           per cent of the viewport. */
        const one = parseFloat(getComputedStyle(root).getPropertyValue('--act-one-h')) || 100;
        const actOne = (one / 100) * window.innerHeight;
        boundary = rootTop + actOne * (scrubbable ? HANDOFF : 0.14);
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
      <p className="visually-hidden">{journey.description}</p>

      {/* Lands "אודות" links at the statement, not at the closed vault. */}
      <div id="about" className="journey__anchor journey__anchor--about" aria-hidden="true" />
      {/* ...and "עבודות" at the platform, which is where the work now is. */}
      <div id="work" className="journey__anchor journey__anchor--work" aria-hidden="true" />

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
          <CityReveal dolly={animated}>{animated && <CityTravel still={false} />}</CityReveal>
        </div>

        {/* Reduced motion: the arrival is a scene of its own, composed once. */}
        {!animated && (
          <div className="journey__arrival">
            <CityReveal statement={false} dolly>
              <CityTravel still />
            </CityReveal>
          </div>
        )}
      </div>
    </section>
  );
}
