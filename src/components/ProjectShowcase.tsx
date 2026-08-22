import { useRef } from 'react';

import { LaptopMockup } from './LaptopMockup';
import { ProjectVideo } from './ProjectVideo';
import { usePointerTilt } from '../hooks/usePointerTilt';
import type { Project } from '../site.config';
import './ProjectShowcase.css';

/** One laptop on its platform, plus the quiet caption and live-site link. */
export function ProjectShowcase({ project }: { project: Project }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  usePointerTilt(sceneRef);

  return (
    <figure className="showcase reveal">
      <div className="showcase__scene" ref={sceneRef}>
        <div className="showcase__lift">
          <LaptopMockup>
            <ProjectVideo project={project} />
          </LaptopMockup>
        </div>
        <div className="showcase__platform" aria-hidden="true" />
      </div>

      <figcaption className="showcase__caption">
        <p className="showcase__name">{project.title}</p>
        <p className="showcase__desc">{project.description}</p>
        {project.liveUrl && (
          <a
            className="showcase__live"
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            לצפייה באתר
            <span className="visually-hidden">— {project.title}, נפתח בחלון חדש</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 1h4v4M13 1 6.5 7.5M11 8.5V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </a>
        )}
      </figcaption>
    </figure>
  );
}
