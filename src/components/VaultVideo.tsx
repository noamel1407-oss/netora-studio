import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { vault } from '../site.config';
import './VaultVideo.css';

export type VaultVideoHandle = {
  /**
   * Puts the vault at `progress` (0 = shut, 1 = fully open). Scroll owns the
   * door: there is no playback, so it opens and closes as the reader moves.
   */
  seek: (progress: number) => void;
  /** True once the file is decodable and its duration is known. */
  isReady: () => boolean;
};

type Props = {
  /** When false (reduced motion) the poster stands in for the animation. */
  animated: boolean;
  /** Fires when the video becomes scrubbable, or turns out to be missing. */
  onReadyChange?: (ready: boolean) => void;
};

/**
 * The swappable vault render. Drop the final Higgsfield files into
 * public/media/ (see `vault` in site.config.ts) — nothing else references the
 * file names. Until the video exists the poster carries the hero, and until
 * the poster exists a quiet CSS vault holds the composition.
 *
 * Scroll-driven, not played: VaultHero hands this component a progress value
 * and it sets `currentTime` to match, so the door tracks the wheel in both
 * directions. Seeks are coalesced onto animation frames — a seek issued while
 * the decoder is still working is dropped in favour of the newest one, which
 * is what keeps fast scrolling from queueing a backlog of stale frames.
 */
export const VaultVideo = forwardRef<VaultVideoHandle, Props>(function VaultVideo(
  { animated, onReadyChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMissing, setVideoMissing] = useState(false);
  const [posterMissing, setPosterMissing] = useState(false);

  /* Scrub state, kept in refs: this runs per frame and must not re-render. */
  const readyRef = useRef(false);
  const wantedRef = useRef(0);
  const appliedRef = useRef(-1);
  const seekingRef = useRef(false);
  const frameRef = useRef(0);

  const flush = useCallback(() => {
    frameRef.current = 0;
    const video = videoRef.current;
    if (!video || !readyRef.current || seekingRef.current) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    // Never land exactly on the final frame: some decoders report that as
    // ended and blank the surface.
    const target = Math.min(Math.max(wantedRef.current, 0), 1) * (duration - 0.05);
    // A seek costs a decode; skip the ones too small for anyone to notice.
    if (Math.abs(target - appliedRef.current) < 0.012) return;

    appliedRef.current = target;
    seekingRef.current = true;
    try {
      video.currentTime = target;
    } catch {
      seekingRef.current = false;
    }
  }, []);

  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(flush);
  }, [flush]);

  useImperativeHandle(
    ref,
    () => ({
      seek: (progress: number) => {
        wantedRef.current = progress;
        schedule();
      },
      isReady: () => readyRef.current,
    }),
    [schedule],
  );

  /* The decoder is free again — apply whatever scroll asked for meanwhile. */
  const onSeeked = useCallback(() => {
    seekingRef.current = false;
    schedule();
  }, [schedule]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    readyRef.current = true;
    onReadyChange?.(true);
    // Show the shut door rather than whatever frame the browser picked.
    schedule();
  }, [onReadyChange, schedule]);

  const onSourceError = useCallback(() => {
    readyRef.current = false;
    setVideoMissing(true);
    onReadyChange?.(false);
  }, [onReadyChange]);

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return (
    <div className="vault-video" aria-hidden="true">
      {/* Fallback composition — only visible while no poster/video exists. */}
      {posterMissing && (
        <div className="vault-video__fallback">
          <span className="vault-video__ring vault-video__ring--outer" />
          <span className="vault-video__ring vault-video__ring--mid" />
          <span className="vault-video__ring vault-video__ring--inner" />
          <span className="vault-video__emblem">N</span>
        </div>
      )}

      {/* Poster as its own element so a missing file can be detected. It is
          also the shut door until the video has decoded its first frame. */}
      <img
        className={`vault-video__poster${posterMissing ? ' is-missing' : ''}`}
        src={vault.video.poster}
        alt=""
        decoding="async"
        onError={() => setPosterMissing(true)}
      />

      {animated && !videoMissing && (
        <video
          ref={videoRef}
          className="vault-video__media"
          muted
          playsInline
          // Scrubbing needs frames on demand, so the whole file is wanted up
          // front — it is the one asset the opening cannot fake.
          preload="auto"
          onLoadedMetadata={onLoadedMetadata}
          onSeeked={onSeeked}
          onError={onSourceError}
        >
          {vault.video.webm && <source src={vault.video.webm} type="video/webm" />}
          <source src={vault.video.mp4} type="video/mp4" onError={onSourceError} />
        </video>
      )}
    </div>
  );
});
