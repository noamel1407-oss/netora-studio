import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import './ProjectLaptop.css';

export type ProjectLaptopProps = {
  videoSrc: string;
  posterSrc: string;
  videoType?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  description: string;
};

/**
 * Photoreal MacBook frame with a real <video> clipped to the screen.
 * Swap `videoSrc` to drop in a new recording.
 */
export function ProjectLaptop({
  videoSrc,
  posterSrc,
  videoType = 'video/mp4',
  autoplay = false,
  loop = true,
  muted = true,
  description,
}: ProjectLaptopProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const rockId = useId().replace(/:/g, '');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  /**
   * The recording is optional: until the MP4 is dropped in, the screen shows the
   * poster as a described still rather than offering a play button that cannot
   * do anything.
   */
  const [unavailable, setUnavailable] = useState(false);
  const shouldAutoplay = autoplay && !reducedMotion && !unavailable;

  useEffect(() => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        if (shouldAutoplay) video.play().catch(() => setPlaying(false));
      },
      { threshold: 0.35 },
    );

    observer.observe(frame);
    return () => observer.disconnect();
  }, [shouldAutoplay]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress(video.currentTime / video.duration);
  };

  const seek = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    video.currentTime = next * video.duration;
    setProgress(next);
  };

  return (
    <div className="laptop" ref={frameRef}>
      <div className="laptop__glow" aria-hidden="true" />
      <div className="laptop__body">
        <div className="laptop__lid">
          <div className="laptop__bezel">
            <div className="laptop__screen">
              {unavailable ? (
                <img className="laptop__video" src={posterSrc} alt={description} />
              ) : (
                <video
                  ref={videoRef}
                  className="laptop__video"
                  poster={posterSrc}
                  muted={muted}
                  loop={loop}
                  playsInline
                  preload="metadata"
                  autoPlay={shouldAutoplay}
                  controls={reducedMotion}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={onTimeUpdate}
                  onClick={toggle}
                  aria-label={description}
                >
                  <source src={videoSrc} type={videoType} onError={() => setUnavailable(true)} />
                </video>
              )}

              <span className="laptop__glass" aria-hidden="true" />

              {!reducedMotion && !shouldAutoplay && !unavailable && (
                <button
                  type="button"
                  className={`laptop__toggle${playing ? ' is-playing' : ''}`}
                  onClick={toggle}
                  tabIndex={playing ? -1 : 0}
                  aria-hidden={playing}
                >
                  <span className="visually-hidden">{playing ? 'השהיית הסרטון' : 'הפעלת הסרטון'}</span>
                  <svg width="22" height="26" viewBox="0 0 16 18" aria-hidden="true">
                    <path d="M15 9 0 18V0z" fill="currentColor" />
                  </svg>
                </button>
              )}

              {!unavailable && (
                <div
                  className={`laptop__progress${playing ? ' is-active' : ''}`}
                  onClick={seek}
                  role="progressbar"
                  aria-label="התקדמות הסרטון"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <span className="laptop__progress-fill" style={{ transform: `scaleX(${progress})` }} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="laptop__hinge" aria-hidden="true" />
        <div className="laptop__base" aria-hidden="true">
          <div className="laptop__keys" />
          <div className="laptop__trackpad" />
          <div className="laptop__chin" />
        </div>
      </div>
      <div className="laptop__plinth" aria-hidden="true">
        <div className="laptop__shadow" />
        <svg className="laptop__rock" viewBox="0 0 640 148" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${rockId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26313f" />
              <stop offset="26%" stopColor="#111925" />
              <stop offset="68%" stopColor="#070b12" />
              <stop offset="100%" stopColor="#02040a" />
            </linearGradient>
            <linearGradient id={`${rockId}-ridge`} x1="0.1" y1="0" x2="0.75" y2="1">
              <stop offset="0%" stopColor="rgba(126, 154, 198, 0.55)" />
              <stop offset="55%" stopColor="rgba(58, 78, 112, 0.22)" />
              <stop offset="100%" stopColor="rgba(20, 28, 44, 0)" />
            </linearGradient>
            <linearGradient id={`${rockId}-facet`} x1="0.2" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="rgba(48, 66, 96, 0.42)" />
              <stop offset="60%" stopColor="rgba(16, 24, 38, 0)" />
            </linearGradient>
            <radialGradient id={`${rockId}-gold`} cx="0.72" cy="0.3" r="0.38">
              <stop offset="0%" stopColor="rgba(212, 165, 90, 0.3)" />
              <stop offset="100%" stopColor="rgba(212, 165, 90, 0)" />
            </radialGradient>
          </defs>
          <path
            fill={`url(#${rockId}-fill)`}
            d="M10 82 36 54 68 46 108 26 152 34 198 18 248 28 304 14 358 30 412 20 468 38 518 32 568 50 622 70 632 96 618 128 524 146 348 148 176 140 52 124 8 100Z"
          />
          <path
            fill={`url(#${rockId}-facet)`}
            d="M36 54 68 46 108 26 152 34 198 18 248 28 304 14 358 30 412 20 468 38 518 32 400 58 250 70 120 78Z"
          />
          {/* Thin lit ridge along the upper silhouette — the edge that catches the key light. */}
          <path
            fill={`url(#${rockId}-ridge)`}
            d="M10 82 36 54 68 46 108 26 152 34 198 18 248 28 304 14 358 30 412 20 468 38 518 32 568 50 622 70 632 96 611 93 564 68 514 51 464 57 408 41 354 49 300 35 244 47 194 39 148 53 104 47 64 65 32 71Z"
          />
          <path fill={`url(#${rockId}-gold)`} d="M412 20 468 38 518 32 568 50 490 62 430 48Z" />
        </svg>
      </div>
    </div>
  );
}
