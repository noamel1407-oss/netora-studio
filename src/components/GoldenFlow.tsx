import { useEffect, useRef } from 'react';

import { useIsMobile, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { journey } from '../three/journey';
import './GoldenFlow.css';

type Origin = { x: number; y: number; reach: number };

/**
 * Local golden energy around the medallion only.
 * No page-length ribbon — streaks burst from the emblem and fade
 * before they reach copy, the laptop, reviews, or the form.
 */
export function GoldenFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mobile = useIsMobile();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let frame = 0;
    let running = true;

    const streakCount = reduced ? 5 : mobile ? 7 : 11;
    const particleCount = reduced ? 0 : mobile ? 10 : 22;
    const shardCount = reduced ? 0 : mobile ? 5 : 12;

    const streaks = Array.from({ length: streakCount }, (_, i) => {
      const t = i / Math.max(streakCount - 1, 1);
      return {
        angle: -0.35 + t * 1.55,
        bend: 0.18 + (i % 4) * 0.08,
        length: 0.55 + (i % 3) * 0.18,
        width: i % 3 === 0 ? 1.8 : 0.85,
        blur: i % 2 === 0,
        gold: i % 3 === 0 ? 0.72 : 0.48,
        phase: i * 0.7,
      };
    });

    const particles = Array.from({ length: particleCount }, (_, i) => ({
      t: (i * 0.137) % 1,
      streak: i % streakCount,
      size: 0.8 + (i % 4) * 0.35,
      speed: 0.04 + (i % 5) * 0.012,
    }));

    const shards = Array.from({ length: shardCount }, (_, i) => ({
      t: (i * 0.19) % 1,
      streak: (i * 3) % streakCount,
      size: 1.6 + (i % 3) * 0.9,
      spin: 0.4 + (i % 4) * 0.2,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const originOf = (): Origin | null => {
      const stage = journey.stage;
      // Stay silent through work + reviews so nothing crosses those scenes.
      if (stage >= 0.72 && stage < 2.55) return null;

      if (stage < 0.72) {
        const orb = document.querySelector<HTMLElement>('.hero__orb')?.getBoundingClientRect();
        if (!orb || orb.width < 8) return null;
        return {
          x: orb.left + orb.width * (mobile ? 0.58 : 0.64),
          y: orb.top + orb.height * (mobile ? 0.62 : 0.58),
          reach: Math.min(orb.width * 0.72, window.innerWidth * 0.28),
        };
      }

      const orb = document.querySelector<HTMLElement>('.contact__orb')?.getBoundingClientRect();
      if (!orb || orb.width < 8) return null;
      return {
        x: orb.left + orb.width * 0.55,
        y: orb.top + orb.height * 0.55,
        reach: Math.min(orb.width * 0.55, window.innerWidth * 0.14),
      };
    };

    const pointOnStreak = (origin: Origin, streak: (typeof streaks)[number], t: number) => {
      const len = origin.reach * streak.length;
      const a = streak.angle;
      const mid = t * 0.5;
      const x =
        origin.x +
        Math.cos(a) * len * t +
        Math.cos(a + 1.2) * len * streak.bend * Math.sin(Math.PI * t);
      const y =
        origin.y +
        Math.sin(a) * len * t +
        Math.sin(a + 0.6) * len * streak.bend * Math.sin(Math.PI * mid);
      return { x, y };
    };

    const tick = (now: number) => {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (document.visibilityState !== 'visible' || !journey.inView) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const origin = originOf();
      if (!origin) {
        frame = requestAnimationFrame(tick);
        return;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      for (const [i, streak] of streaks.entries()) {
        const pulse = reduced ? 1 : 0.88 + Math.sin(now * 0.0009 + streak.phase) * 0.12;
        ctx.beginPath();
        const steps = 18;
        for (let s = 0; s <= steps; s += 1) {
          const t = s / steps;
          const p = pointOnStreak(origin, streak, t);
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }

        const end = pointOnStreak(origin, streak, 1);
        const gradient = ctx.createLinearGradient(origin.x, origin.y, end.x, end.y);
        const alpha = streak.gold * pulse;
        gradient.addColorStop(0, `rgba(201, 139, 66, ${alpha})`);
        gradient.addColorStop(0.45, `rgba(184, 122, 48, ${alpha * 0.55})`);
        gradient.addColorStop(1, 'rgba(139, 90, 34, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = (mobile ? 0.7 : 1) * streak.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = streak.blur ? 'rgba(180, 120, 46, 0.45)' : 'transparent';
        ctx.shadowBlur = streak.blur ? (mobile ? 5 : 10) : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (i < 3) {
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, origin.reach * (0.18 + i * 0.05), 0.15, 1.15);
          ctx.strokeStyle = `rgba(180, 122, 48, ${0.16 * pulse})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      if (!reduced) {
        const drift = now * 0.00018;
        for (const particle of particles) {
          const streak = streaks[particle.streak];
          const along = (particle.t + drift * particle.speed * 8) % 1;
          const p = pointOnStreak(origin, streak, along);
          const fade = 1 - along;
          const r = particle.size * (mobile ? 2.2 : 3.2);
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
          glow.addColorStop(0, `rgba(212, 165, 90, ${0.55 * fade})`);
          glow.addColorStop(0.4, `rgba(184, 122, 48, ${0.22 * fade})`);
          glow.addColorStop(1, 'rgba(139, 90, 34, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const shard of shards) {
          const streak = streaks[shard.streak];
          const along = (shard.t + drift * 0.35) % 1;
          const p = pointOnStreak(origin, streak, along);
          const fade = (1 - along) * 0.55;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(along * shard.spin * Math.PI * 4);
          ctx.beginPath();
          ctx.moveTo(0, -shard.size);
          ctx.lineTo(shard.size * 0.55, 0);
          ctx.lineTo(0, shard.size);
          ctx.lineTo(-shard.size * 0.55, 0);
          ctx.closePath();
          ctx.fillStyle = `rgba(201, 139, 66, ${fade})`;
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [mobile, reduced]);

  return <canvas ref={canvasRef} className="golden-flow" aria-hidden="true" />;
}
