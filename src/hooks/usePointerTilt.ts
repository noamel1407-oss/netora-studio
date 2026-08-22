import { useEffect, type RefObject } from 'react';

/**
 * Very subtle pointer-follow tilt (≤ ~2.4°) for the laptop scenes.
 * Only engages on fine pointers with hover, and never under reduced motion —
 * touch devices keep the laptops perfectly still.
 */
export function usePointerTilt(ref: RefObject<HTMLElement | null>, maxDeg = 2.4) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let rx = 0;
    let ry = 0;

    const apply = () => {
      frame = 0;
      node.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      rx = -py * maxDeg * 2;
      ry = px * maxDeg * 2;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      node.style.transform = '';
    };

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
      node.style.transform = '';
    };
  }, [ref, maxDeg]);
}
