import { useState } from 'react';

import { journey, projects, world } from '../site.config';
import { ProjectShowcase } from './ProjectShowcase';
import './SelectedWorks.css';

/**
 * What is left of the terrace once the first project moved into the city.
 *
 * The work is now discovered on the journey itself, so this is no longer the
 * portfolio's front door: no section heading announcing "selected works", just
 * a quiet line of metadata over the terrace and whatever the route has not
 * reached yet. The gold path leaves the platform pointing this way — the next
 * milestone is what turns that direction into an arrival.
 */
export function SelectedWorks() {
  const [bgMissing, setBgMissing] = useState(false);
  const remaining = projects.filter((project) => project.id !== journey.projectId);

  if (remaining.length === 0) return null;

  return (
    <section
      className={`works${bgMissing ? ' works--no-image' : ''}`}
      id="work-archive"
      aria-labelledby="work-title"
    >
      <img
        className="works__bg"
        src={world.works}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setBgMissing(true)}
      />
      <div className="works__tint" aria-hidden="true" />

      <div className="shell works__inner">
        <h2 className="works__title reveal" id="work-title">
          עוד על המסלול
        </h2>

        <div className="works__grid">
          {remaining.map((project) => (
            <ProjectShowcase key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
