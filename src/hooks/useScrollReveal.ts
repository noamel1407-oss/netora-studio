import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Fades sections in as they enter the viewport.
 *
 * The hidden state is applied by JavaScript (via the `reveal-ready` class) so
 * that content stays visible if this never runs.
 */
export function useScrollReveal(enabled: boolean, key: string) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    root.classList.add('reveal-ready');

    const context = gsap.context(() => {
      for (const element of gsap.utils.toArray<HTMLElement>('.reveal')) {
        gsap.to(element, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 90%', once: true },
        });
      }
    });

    return () => {
      context.revert();
      root.classList.remove('reveal-ready');
    };
  }, [enabled, key]);
}
