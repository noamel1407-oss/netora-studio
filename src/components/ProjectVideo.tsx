import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import type { Project } from '../site.config';
import './ProjectVideo.css';

/** Only one project video plays at a time. */
let activeVideo: HTMLVideoElement | null = null;

/**
 * The living screen inside a laptop. Layered so every asset is optional:
 * a typographic cover always sits at the bottom, the project still covers it
 * when present, and the recording plays on top once it exists and is started.
 */
export function ProjectVideo({ project }: { project: Project }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoMissing, setVideoMissing] = useState(false);
  const [thumbMissing, setThumbMissing] = useState(false);

  const thumbnail = project.thumbnail && !thumbMissing ? project.thumbnail : null;

  /* Off-screen screens go quiet. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) videoRef.current?.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  const onPlay = () => {
    const video = videoRef.current;
    if (video && activeVideo && activeVideo !== video) activeVideo.pause();
    if (video) activeVideo = video;
    setPlaying(true);
  };

  const onPause = () => {
    if (activeVideo === videoRef.current) activeVideo = null;
    setPlaying(false);
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
    <div className="pvideo" ref={rootRef}>
      {/* Typographic cover — the orderly placeholder while no still exists. */}
      <div className="pvideo__cover" aria-hidden="true">
        <span className="pvideo__cover-title">{project.title}</span>
        <span className="pvideo__cover-rule" />
        <span className="pvideo__cover-sub">{project.subtitle}</span>
      </div>

      {project.thumbnail && !thumbMissing && (
        <img
          className="pvideo__thumb"
          src={project.thumbnail}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setThumbMissing(true)}
        />
      )}

      {!videoMissing && (
        <video
          ref={videoRef}
          className="pvideo__media"
          poster={thumbnail ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reducedMotion}
          onPlay={onPlay}
          onPause={onPause}
          onTimeUpdate={onTimeUpdate}
          onClick={toggle}
          aria-label={project.videoDescription}
        >
          <source
            src={project.video.src}
            type={project.video.type}
            onError={() => setVideoMissing(true)}
          />
        </video>
      )}

      {!videoMissing && !reducedMotion && (
        <button
          type="button"
          className={`pvideo__toggle${playing ? ' is-playing' : ''}`}
          onClick={toggle}
        >
          <span className="visually-hidden">
            {playing ? `השהיית הסרטון — ${project.title}` : `הפעלת הסרטון — ${project.title}`}
          </span>
          {playing ? (
            <svg width="16" height="18" viewBox="0 0 14 16" aria-hidden="true">
              <path d="M1 0h4v16H1zM9 0h4v16H9z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="18" height="20" viewBox="0 0 16 18" aria-hidden="true">
              <path d="M15 9 0 18V0z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}

      {!videoMissing && (
        <div
          className={`pvideo__progress${playing ? ' is-active' : ''}`}
          onClick={seek}
          role="progressbar"
          aria-label={`התקדמות הסרטון — ${project.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span className="pvideo__progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
      )}
    </div>
  );
}
