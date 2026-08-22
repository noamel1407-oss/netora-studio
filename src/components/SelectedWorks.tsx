import { useState } from 'react';

import { projects, world } from '../site.config';
import { ProjectShowcase } from './ProjectShowcase';
import './SelectedWorks.css';

/**
 * The heart of the reference: a centered heading over the terrace, then two
 * large laptops — watches on the left, jewellery on the right.
 */
export function SelectedWorks() {
  const [bgMissing, setBgMissing] = useState(false);

  return (
    <section
      className={`works${bgMissing ? ' works--no-image' : ''}`}
      id="work"
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
          עבודות נבחרות
        </h2>
        <div className="works__rule reveal" aria-hidden="true">
          <i />
          <b />
          <i />
        </div>

        <div className="works__grid">
          {projects.map((project) => (
            <ProjectShowcase key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
