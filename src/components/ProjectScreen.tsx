import { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import './ProjectScreen.css';

type Props = {
  /**
   * The site recording that plays inside the monitor. A missing file falls
   * back to the poster, and a missing poster to the typographic cover, so the
   * screen is never empty and never shows a broken asset.
   */
  videoSrc: string | null;
  videoType?: string;
  poster: string | null;
  /** Describes the recording for people who cannot see it. */
  label: string;
  /** Stand-in while neither asset exists. */
  title: string;
  subtitle: string;
  /** True once the journey has arrived at the platform. */
  active: boolean;
};

/**
 * A physical screen surface: whatever media exists, clipped to the glass.
 *
 * This is the slot the project video drops into — the monitor is built around
 * it rather than around a baked-in picture, so swapping the recording is a
 * path in `site.config.ts` and nothing else. The media is cropped to the
 * screen's own 16:10 only when it is at least that wide; a narrower capture is
 * letterboxed on the screen's dark ground instead of being stretched.
 */
export function ProjectScreen({
  videoSrc,
  videoType = 'video/mp4',
  poster,
  label,
  title,
  subtitle,
  active,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [videoMissing, setVideoMissing] = useState(false);
  const [posterMissing, setPosterMissing] = useState(false);
  const [fitsWide, setFitsWide] = useState(true);

  const playable = Boolean(videoSrc) && !videoMissing && !reducedMotion;

  /* The recording runs while the composition is on screen and stops the
     moment the journey leaves it — a screen the reader has scrolled away
     from has no business decoding frames. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playable) return;

    if (active) {
      video.play().catch(() => undefined);
    } else if (!video.paused) {
      video.pause();
    }
  }, [active, playable]);

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    setFitsWide(video.videoWidth / video.videoHeight >= 1.5);
  };

  return (
    <div className={`pscreen${fitsWide ? '' : ' pscreen--letterbox'}`} aria-hidden="true">
      <div className="pscreen__cover">
        <span className="pscreen__cover-title">{title}</span>
        <span className="pscreen__cover-rule" />
        <span className="pscreen__cover-sub">{subtitle}</span>
      </div>

      {poster && !posterMissing && (
        <img
          className="pscreen__poster"
          src={poster}
          alt=""
          decoding="async"
          loading="lazy"
          onError={() => setPosterMissing(true)}
        />
      )}

      {videoSrc && !videoMissing && (
        <video
          ref={videoRef}
          className="pscreen__media"
          poster={poster && !posterMissing ? poster : undefined}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          aria-label={label}
          onLoadedMetadata={onLoadedMetadata}
        >
          <source src={videoSrc} type={videoType} onError={() => setVideoMissing(true)} />
        </video>
      )}

      <span className="pscreen__glass" />
    </div>
  );
}
