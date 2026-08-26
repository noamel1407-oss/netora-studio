import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { LEGS, plateAt, screenBreaches, type Leg } from '../journey/route';
import { projects, route } from '../site.config';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import './Promenade.css';

gsap.registerPlugin(ScrollTrigger);

/*
 * The two things that are read rather than passed, as fractions of the
 * promenade's own length. Both sit inside the window where their plate is the
 * only thing on screen and the eye has finished adjusting to it: nothing here
 * asks anyone to read type over a frame that is moving fast or washed out by a
 * threshold.
 */
const STOP = { in: 0.322, settled: 0.352, out: 0.432, gone: 0.453 };
const HALL = { in: 0.726, settled: 0.756, out: 0.812, gone: 0.84 };

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const ramp = (value: number, from: number, to: number) =>
  to <= from ? (value >= to ? 1 : 0) : clamp01((value - from) / (to - from));

/** On while its plate holds the screen, and off before the camera moves again. */
const shownAt = (progress: number, at: typeof STOP) =>
  ramp(progress, at.in, at.settled) * (1 - ramp(progress, at.out, at.gone));

/**
 * The route past the first platform: SHAY's forecourt out to TIMEMATIC, the
 * stop in front of the work, the turn into the corridor, the corridor itself,
 * and out to contact.
 *
 * Five canonical anchors fix this stretch, in order and without
 * reinterpretation, and `src/journey/route.ts` is the only description of it.
 * This component is the part that has to be a component: a tall scrubbed
 * container with a sticky stage, five plates stacked in it, and one scroll
 * position driving all of them.
 *
 * ## Why the plates are stacked rather than swapped
 *
 * Each leg sits *under* the one before it. A leg pushes toward the opening it
 * leaves through — the TIMEMATIC arch, the corridor mouth, the arch at the
 * corridor's end — and is only dropped once it is two or three times the frame
 * and the only thing left of it on screen is the inside of that opening, which
 * is what the plate underneath is already showing. Fading a picture that still
 * fills the screen is a crossfade, and a crossfade is what tells a reader they
 * are looking at pictures.
 *
 * ## The camera moves the world; the words stay in the frame
 *
 * Only `.leg__world` is transformed. The presentation at the stop, the
 * corridor's disciplines and the threshold washes are all outside it — a
 * caption that grows to three times its size because the camera is moving is
 * not a caption, and the eye's adaptation happens in the lens rather than in
 * the architecture.
 *
 * ## The screens are surfaces
 *
 * The camera never travels into SHAY's display panel or TIMEMATIC's screen.
 * The way out of each building is the architecture the anchors show: the plaza
 * in 01, the corridor in 03. `screenBreaches()` asserts it on mount in
 * development rather than leaving it as something to remember.
 *
 * Under reduced motion the whole thing stands down: the same five plates
 * render as five calm full-height scenes in the same order, each composed once
 * and never moved.
 */
export function Promenade() {
  const rootRef = useRef<HTMLElement>(null);
  const legRefs = useRef<(HTMLDivElement | null)[]>([]);
  const worldRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stopRef = useRef<HTMLDivElement>(null);
  const hallRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animated = !reducedMotion;

  const presented = useMemo(
    () => projects.find((project) => project.id === route.projectId) ?? null,
    [],
  );

  /* A camera aimed through a website is the one mistake this route cannot
     make, and it is the kind that arrives disguised as a small improvement to
     a composition. So it is checked, not remembered. */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const breaches = screenBreaches();
    if (breaches.length === 0) return;
    console.error(
      'Route: a portfolio screen has become a doorway. The screens are surfaces —\n' +
        'the way out of each building is its architecture.\n' +
        breaches.map((b) => `  ${b.anchor} ${b.leg}: ${b.reason} — ${b.detail}`).join('\n'),
    );
  }, []);

  const apply = useCallback((progress: number) => {
    const root = rootRef.current;
    if (!root) return;

    const width = root.clientWidth || window.innerWidth;
    const height = window.innerHeight;

    for (let index = 0; index < LEGS.length; index += 1) {
      const leg = legRefs.current[index];
      const world = worldRefs.current[index];
      if (!leg || !world) continue;

      const plate = plateAt(index, progress, width, height);

      leg.style.visibility = plate.live ? 'visible' : 'hidden';
      if (!plate.live) continue;

      world.style.transform = `translate3d(${plate.x.toFixed(2)}px, ${plate.y.toFixed(2)}px, 0) scale(${plate.scale.toFixed(4)})`;
      world.style.opacity = plate.opacity.toFixed(3);
      leg.style.setProperty('--adapt-in', plate.adaptIn.toFixed(3));
      leg.style.setProperty('--adapt-out', plate.adaptOut.toFixed(3));
    }

    const stop = stopRef.current;
    if (stop) {
      const shown = shownAt(progress, STOP);
      stop.style.opacity = shown.toFixed(3);
      stop.style.transform = `translate3d(0, ${((1 - shown) * 26).toFixed(1)}px, 0)`;
      /* Never a focus stop for a destination nobody has reached yet. */
      stop.classList.toggle('is-available', shown > 0.5);
    }

    const hall = hallRef.current;
    if (hall) {
      const shown = shownAt(progress, HALL);
      hall.style.opacity = shown.toFixed(3);
      hall.style.transform = `translate3d(0, ${((1 - shown) * 22).toFixed(1)}px, 0)`;
    }
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !animated) return;

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        /* The same light smoothing the first act uses: enough to take a
           trackpad's jitter out of a scrubbed camera, short enough that the
           world still feels attached to the fingers. */
        scrub: 0.4,
        onUpdate: ({ progress }) => apply(progress),
        onRefresh: ({ progress }) => apply(progress),
      });
    }, root);

    apply(0);
    return () => context.revert();
  }, [animated, apply]);

  return (
    <section
      ref={rootRef}
      className={`promenade${animated ? ' is-animated' : ''}`}
      aria-labelledby="route-title"
    >
      <h2 className="visually-hidden" id="route-title">
        המשך המסלול — מ־SHAY אל TIMEMATIC, דרך המסדרון ואל יצירת הקשר
      </h2>
      <ol className="visually-hidden">
        {LEGS.map((leg) => (
          <li key={leg.id}>{leg.description}</li>
        ))}
      </ol>

      <div className="promenade__stage">
        {LEGS.map((leg, index) => (
          <div
            key={leg.id}
            className={`leg leg--${leg.id}`}
            /* The canonical anchor this leg is, so the order can be asserted
               from outside rather than trusted. */
            data-anchor={leg.anchor}
            ref={(element) => {
              legRefs.current[index] = element;
            }}
            style={
              {
                /* Earlier legs sit above later ones: a leg is passed through,
                   not swapped for. */
                zIndex: LEGS.length - index,
                /* The aim is where the camera is heading, so it is both the
                   point the plate is framed around and the point it grows away
                   from. With `object-fit: cover`, a percentage
                   `object-position` pins that point of the artwork to the same
                   point of the frame — which is what keeps the composition the
                   anchor was approved with on any viewport. */
                '--aim-x': `${(leg.aim.x * 100).toFixed(2)}%`,
                '--aim-y': `${(leg.aim.y * 100).toFixed(2)}%`,
              } as React.CSSProperties
            }
          >
            <div
              className="leg__world"
              ref={(element) => {
                worldRefs.current[index] = element;
              }}
            >
              <PlateImage leg={leg} />
              <span className="leg__tint" aria-hidden="true" />
            </div>

            {/* What the eye does at a threshold: still full of the place it
                came from, then taken by the one ahead. Outside the world,
                because it happens in the lens. */}
            {index > 0 && LEGS[index - 1].threshold !== 'none' && (
              <span
                className={`leg__adapt leg__adapt--in leg__adapt--${LEGS[index - 1].threshold}`}
                aria-hidden="true"
              />
            )}
            {leg.threshold !== 'none' && (
              <span
                className={`leg__adapt leg__adapt--out leg__adapt--${leg.threshold}`}
                aria-hidden="true"
              />
            )}

            {leg.id === 'timematic-stop' && presented && (
              /* The stop's whole point: the camera has halted, so this is the
                 one place on the route where something is read rather than
                 passed. The work itself is on the wall behind it — this is the
                 caption to it, never a second screen in front of it. */
              <div className="stop" ref={stopRef}>
                <span className="stop__scrim" aria-hidden="true" />
                <p className="stop__eyebrow">התחנה הבאה במסלול</p>
                <h3 className="stop__title">{presented.title}</h3>
                <p className="stop__sub">{presented.subtitle}</p>
                <p className="stop__lede">{presented.description}</p>

                {presented.liveUrl && (
                  <a
                    className="stop__live"
                    href={presented.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    לצפייה באתר
                    <span className="visually-hidden">
                      {' '}
                      — {presented.title}, נפתח בחלון חדש
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M9 1h4v4M13 1 6.5 7.5M11 8.5V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {leg.id === 'corridor-interior' && (
              /* The corridor's walls carry the studio's three disciplines on
                 brass. They are in the artwork, in English, out at the edges
                 of the frame; this is the same three in the language the site
                 is written in, set low over the floor so the plaques
                 themselves are never covered. */
              <div className="hall" ref={hallRef}>
                <span className="hall__scrim" aria-hidden="true" />
                <ul className="hall__list">
                  {route.disciplines.map((discipline) => (
                    <li className="hall__item" key={discipline.plaque}>
                      <span className="hall__he">{discipline.title}</span>
                      <span className="hall__plaque" aria-hidden="true">
                        {discipline.plaque}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** One plate, with the quiet fallback the rest of the site's artwork has. */
function PlateImage({ leg }: { leg: Leg }) {
  const [missing, setMissing] = useState(false);

  if (missing) return <span className="leg__blank" aria-hidden="true" />;

  return (
    <img
      className="leg__plate"
      src={leg.plate}
      alt=""
      aria-hidden="true"
      decoding="async"
      loading="lazy"
      onError={() => setMissing(true)}
    />
  );
}
