import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

import { NetoraSymbol } from './NetoraSymbol';
import { journey } from './journey';

type Props = {
  mobile: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
};

const MODEL_DESKTOP = '/models/netora.glb';
const MODEL_MOBILE = '/models/netora-low.glb';

/** Signals that the GLB has resolved, so the CSS placeholder can retire. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
    const later = window.setTimeout(() => invalidate(), 400);
    onReady?.();
    return () => window.clearTimeout(later);
  }, [onReady, invalidate]);
  return null;
}

/**
 * Under reduced motion the loop runs on demand, so scrolling has to ask for a
 * frame explicitly.
 */
function InvalidateOnScroll({ enabled }: { enabled: boolean }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!enabled) return;
    const request = () => invalidate();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, [enabled, invalidate]);

  return null;
}

/** Stops the render loop when the 3D sections are off screen or the tab is hidden. */
function useRenderActive() {
  const [active, setActive] = useState(true);
  const activeRef = useRef(true);

  useEffect(() => {
    let queued = false;

    const evaluate = () => {
      const next = journey.inView && document.visibilityState === 'visible';
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        evaluate();
      });
    };

    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('visibilitychange', evaluate);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, []);

  return active;
}

export default function NetoraScene({ mobile, reducedMotion, onReady }: Props) {
  const active = useRenderActive();
  const frameloop = reducedMotion ? 'demand' : active ? 'always' : 'never';

  return (
    <Canvas
      className="netora-canvas"
      frameloop={frameloop}
      dpr={[1, mobile ? 1.5 : 2]}
      gl={{
        antialias: !mobile,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 35, near: 0.1, far: 40, position: [0, 0, 5] }}
      // Purely decorative: the page's meaning never depends on the canvas.
      aria-hidden="true"
      role="presentation"
      tabIndex={-1}
      resize={{ scroll: false }}
    >
      <InvalidateOnScroll enabled={reducedMotion} />

      <ambientLight intensity={0.32} color="#1a2740" />
      <directionalLight position={[5.2, 3.6, 5.5]} intensity={2.6} color="#ffe3b0" />
      <directionalLight position={[-3.4, 0.8, 4.2]} intensity={1.15} color="#4a5d80" />
      <pointLight position={[1.5, 0.35, 2.2]} intensity={1.8} distance={7} color="#e0b56a" />
      <spotLight position={[2.2, 2.4, 3]} angle={0.38} penumbra={0.75} intensity={1.5} color="#fff6e4" />

      {/* Local light probes — no external HDR request. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff1d4" scale={[6, 6, 1]} position={[3, 3, 4]} />
        <Lightformer form="rect" intensity={1.1} color="#c8963e" scale={[8, 3, 1]} position={[-5, -1, 2]} />
        <Lightformer form="circle" intensity={1.2} color="#dce6f5" scale={[3, 3, 1]} position={[0, 5, -2]} />
        <Lightformer form="rect" intensity={1.15} color="#061127" scale={[10, 10, 1]} position={[0, 0, -6]} />
      </Environment>

      <Suspense fallback={null}>
        <NetoraSymbol
          url={mobile ? MODEL_MOBILE : MODEL_DESKTOP}
          mobile={mobile}
          reducedMotion={reducedMotion}
          shardCount={mobile ? 14 : 52}
        />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
