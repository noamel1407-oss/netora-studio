import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { vault } from '../site.config';
import './VaultVideo.css';

export type VaultVideoHandle = {
  /** Starts the opening once (muted). Safe to call repeatedly. */
  play: () => void;
  /** Rewinds to the closed vault, e.g. when scrolling back above the hero. */
  reset: () => void;
};

type Props = {
  /** When false (reduced motion) the poster stands in for the animation. */
  animated: boolean;
};

/**
 * The swappable vault render. Drop the final Higgsfield files into
 * public/media/ (see `vault` in site.config.ts) — nothing else references the
 * file names. Until the video exists the poster carries the hero, and until
 * the poster exists a quiet CSS vault holds the composition.
 */
export const VaultVideo = forwardRef<VaultVideoHandle, Props>(function VaultVideo(
  { animated },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMissing, setVideoMissing] = useState(false);
  const [posterMissing, setPosterMissing] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        const video = videoRef.current;
        if (!video || videoMissing) return;
        // Muted + playsInline satisfies every autoplay policy; if the browser
        // still refuses, the poster simply keeps standing in.
        video.play().catch(() => undefined);
      },
      reset: () => {
        const video = videoRef.current;
        if (!video || videoMissing) return;
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          /* metadata not ready yet — nothing to rewind */
        }
      },
    }),
    [videoMissing],
  );

  const onSourceError = useCallback(() => setVideoMissing(true), []);

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

      {/* Poster as its own element so a missing file can be detected. */}
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
          preload="metadata"
          // The vault opens exactly once per approach — no loop.
          onError={onSourceError}
        >
          {vault.video.webm && <source src={vault.video.webm} type="video/webm" />}
          <source src={vault.video.mp4} type="video/mp4" onError={onSourceError} />
        </video>
      )}
    </div>
  );
});
