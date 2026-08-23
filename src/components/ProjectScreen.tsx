import { useState } from 'react';

import './ProjectScreen.css';

type Props = {
  /**
   * The site's own opening frame, as a still. Nothing plays in here: the
   * motion in this scene belongs to the camera, and a screen playing to itself
   * while the world moves around it reads as two things happening at once.
   */
  src: string | null;
  /** Stand-in while no shot exists. */
  title: string;
  subtitle: string;
};

/**
 * A physical screen surface: the project's own opening frame, clipped to the
 * glass.
 *
 * The monitor is built around this rather than around a picture baked into the
 * model, so swapping the shot is a path in `site.config.ts` and nothing else.
 * The image is cropped to the screen's 16:10 only when it is at least that
 * wide; a narrower capture is fitted rather than stretched. A missing file
 * falls back to the typographic cover, so the screen is never empty and never
 * shows a broken asset.
 */
export function ProjectScreen({ src, title, subtitle }: Props) {
  const [missing, setMissing] = useState(false);
  const [fitsWide, setFitsWide] = useState(true);

  return (
    <div className={`pscreen${fitsWide ? '' : ' pscreen--fit'}`} aria-hidden="true">
      <div className="pscreen__cover">
        <span className="pscreen__cover-title">{title}</span>
        <span className="pscreen__cover-rule" />
        <span className="pscreen__cover-sub">{subtitle}</span>
      </div>

      {src && !missing && (
        <img
          className="pscreen__shot"
          src={src}
          alt=""
          decoding="async"
          loading="lazy"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth && naturalHeight) setFitsWide(naturalWidth / naturalHeight >= 1.5);
          }}
          onError={() => setMissing(true)}
        />
      )}

      <span className="pscreen__glass" />
    </div>
  );
}
