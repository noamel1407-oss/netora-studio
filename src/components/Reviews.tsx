import { useEffect, useId, useRef, useState } from 'react';

import { useStageAnchor } from '../hooks/useStageAnchor';
import { useIsMobile, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { testimonials } from '../site.config';
import './Reviews.css';

const SWIPE_THRESHOLD = 45;
const AUTOPLAY_MS = 5200;

function Stars({ rating }: { rating: number }) {
  return (
    <p className="review__stars">
      <span aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} width="15" height="15" viewBox="0 0 16 16" className={i < rating ? 'is-on' : ''}>
            <path
              d="M8 0.8l2.1 4.6 5 .5-3.8 3.4 1.1 4.9L8 11.7 3.6 14.2l1.1-4.9L.9 5.9l5-.5z"
              fill="currentColor"
            />
          </svg>
        ))}
      </span>
      <span className="visually-hidden">דירוג {rating} מתוך 5</span>
    </p>
  );
}

function wrapOffset(offset: number, count: number) {
  let value = offset;
  if (value > count / 2) value -= count;
  if (value < -count / 2) value += count;
  return value;
}

function coverflowTransform(offset: number, mobile: boolean) {
  if (mobile) {
    if (offset === 0) {
      return {
        transform: 'translateX(0) translateZ(80px) rotateY(0deg) scale(1)',
        opacity: 1,
        visible: true,
      };
    }
    if (offset === 1) {
      return {
        transform: 'translateX(62%) translateZ(-140px) rotateY(-16deg) scale(0.9)',
        opacity: 0.48,
        visible: true,
      };
    }
    return {
      transform: 'translateX(-80%) translateZ(-280px) rotateY(20deg) scale(0.82)',
      opacity: 0,
      visible: false,
    };
  }

  if (offset === 0) {
    return {
      transform: 'translateX(0) translateZ(160px) rotateY(0deg) scale(1)',
      opacity: 1,
      visible: true,
    };
  }
  if (offset === -1) {
    return {
      transform: 'translateX(-64%) translateZ(-170px) rotateY(22deg) scale(0.86)',
      opacity: 0.58,
      visible: true,
    };
  }
  if (offset === 1) {
    return {
      transform: 'translateX(64%) translateZ(-170px) rotateY(-22deg) scale(0.86)',
      opacity: 0.58,
      visible: true,
    };
  }
  return {
    transform: 'translateX(0) translateZ(-420px) rotateY(0deg) scale(0.7)',
    opacity: 0,
    visible: false,
  };
}

export function Reviews() {
  const anchor = useStageAnchor('reviews');
  const mobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const dragStart = useRef<number | null>(null);
  const paused = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const count = testimonials.length;
  const labelId = useId();

  const go = (delta: number) => setIndex((current) => (current + delta + count) % count);

  useEffect(() => {
    if (reducedMotion || count < 2) return;

    const tick = () => {
      if (paused.current) return;
      setIndex((current) => (current + 1) % count);
    };

    const id = window.setInterval(tick, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, reducedMotion]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const pause = () => {
      paused.current = true;
    };
    const resume = () => {
      paused.current = false;
    };

    node.addEventListener('pointerenter', pause);
    node.addEventListener('pointerleave', resume);
    node.addEventListener('focusin', pause);
    node.addEventListener('focusout', resume);
    return () => {
      node.removeEventListener('pointerenter', pause);
      node.removeEventListener('pointerleave', resume);
      node.removeEventListener('focusin', pause);
      node.removeEventListener('focusout', resume);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
    else if (event.key === 'Home') setIndex(0);
    else if (event.key === 'End') setIndex(count - 1);
    else return;
    event.preventDefault();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    dragStart.current = event.clientX;
    paused.current = true;
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1);
    if (event.pointerType !== 'mouse') {
      window.setTimeout(() => {
        paused.current = false;
      }, AUTOPLAY_MS);
    }
  };

  return (
    <section className="reviews section" id="reviews" ref={anchor} aria-labelledby={labelId}>
      <div className="shell">
        <h2 className="section-heading section-heading--centered section-heading--ruled reveal" id={labelId}>
          מה הלקוחות אומרים
        </h2>

        <div
          ref={stageRef}
          className="reviews__stage"
          role="group"
          aria-roledescription="קרוסלה"
          aria-labelledby={labelId}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <button type="button" className="reviews__arrow reviews__arrow--next" onClick={() => go(-1)}>
            <span className="visually-hidden">הביקורת הבאה</span>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
              <path d="M15 6H1M6 1 1 6l5 5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>

          <div
            className="reviews__track"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragStart.current = null;
            }}
          >
            {testimonials.map((testimonial, i) => {
              const offset = wrapOffset(i - index, count);
              const slot = coverflowTransform(offset, mobile);
              const isCenter = offset === 0;
              const distance = Math.abs(offset);

              return (
                <article
                  key={testimonial.id}
                  className={`review${isCenter ? ' is-current' : ''}`}
                  aria-hidden={!isCenter}
                  style={{
                    transform: slot.transform,
                    opacity: slot.opacity,
                    zIndex: 10 - distance,
                    pointerEvents: slot.visible ? 'auto' : 'none',
                  }}
                >
                  <span className="review__mark" aria-hidden="true">
                    &ldquo;
                  </span>
                  <blockquote className="review__quote">
                    <p>{testimonial.quote}</p>
                  </blockquote>
                  <Stars rating={testimonial.rating} />
                  <p className="review__name">{testimonial.name}</p>
                  <p className="review__role">{testimonial.role}</p>
                </article>
              );
            })}
          </div>

          <button type="button" className="reviews__arrow reviews__arrow--prev" onClick={() => go(1)}>
            <span className="visually-hidden">הביקורת הקודמת</span>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
              <path d="M1 6h14M10 1l5 5-5 5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>

        <ul className="reviews__dots">
          {testimonials.map((testimonial, i) => (
            <li key={testimonial.id}>
              <button
                type="button"
                className={`reviews__dot${i === index ? ' is-active' : ''}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              >
                <span className="visually-hidden">
                  ביקורת {i + 1}: {testimonial.name}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="visually-hidden" aria-live="polite">
          ביקורת {index + 1} מתוך {count}: {testimonials[index].name}, {testimonials[index].role}
        </p>
      </div>
    </section>
  );
}
