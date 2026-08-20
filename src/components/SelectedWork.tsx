import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useStageAnchor } from '../hooks/useStageAnchor';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { projects } from '../site.config';
import { ProjectLaptop } from './ProjectLaptop';
import './SelectedWork.css';

gsap.registerPlugin(ScrollTrigger);

export function SelectedWork() {
  const anchor = useStageAnchor('work');
  const project = projects[0];
  const reducedMotion = usePrefersReducedMotion();
  const laptopRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const laptop = laptopRef.current;
    if (!laptop || reducedMotion) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        laptop,
        { y: 48, scale: 0.96, rotateX: 8 },
        {
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 1.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: laptop, start: 'top 82%', once: true },
        },
      );
    }, laptop);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <section className="work section" id="work" ref={anchor} aria-labelledby="work-title">
      <div className="work__inner">
        <div className="work__copy">
          <p className="eyebrow reveal">{project.index}</p>
          <h2 className="section-heading reveal" id="work-title">
            עבודות נבחרות
          </h2>
          <p className="work__project reveal">{project.title}</p>
          <p className="lede work__description reveal">{project.description}</p>

          <a
            className="link-arrow work__link reveal"
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            צפייה בפרויקט
            <span className="visually-hidden">— {project.title}, נפתח בחלון חדש</span>
            <svg width="30" height="10" viewBox="0 0 30 10" fill="none" aria-hidden="true">
              <path d="M0 5h28M23 1l5 4-5 4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </a>
        </div>

        <div className="work__showcase">
          <div className="laptop-motion" ref={laptopRef}>
            <ProjectLaptop
              videoSrc={project.video.src}
              posterSrc={project.video.poster}
              videoType={project.video.type}
              autoplay={project.videoMode === 'autoplay'}
              loop
              muted
              description={project.videoDescription}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
