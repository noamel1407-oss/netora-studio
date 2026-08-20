import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { visual } from './visual';

/**
 * Lightweight gold arcs and shards orbiting the medallion. They stand in for
 * the break-apart effect the symbol will eventually perform, without touching
 * the model's own geometry.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shard = {
  angle: number;
  radius: number;
  depth: number;
  size: number;
  drift: number;
  spin: number;
  phase: number;
};

const ARCS = [
  { radius: 1.16, arc: 2.5, start: -1.15, tilt: 0.16, thickness: 0.0055, opacity: 0.82 },
  { radius: 1.34, arc: 1.7, start: 1.25, tilt: -0.24, thickness: 0.0038, opacity: 0.52 },
  { radius: 1.08, arc: 1.05, start: 2.55, tilt: 0.32, thickness: 0.0028, opacity: 0.4 },
  { radius: 1.48, arc: 1.15, start: -0.35, tilt: 0.42, thickness: 0.0022, opacity: 0.28 },
  { radius: 0.92, arc: 0.7, start: -2.1, tilt: -0.18, thickness: 0.002, opacity: 0.3 },
];

export function GoldAccents({ count, animate }: { count: number; animate: boolean }) {
  const shardsRef = useRef<THREE.InstancedMesh>(null);
  const arcsRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const shards = useMemo<Shard[]>(() => {
    const random = mulberry32(0x4e45544f);
    return Array.from({ length: count }, () => {
      // Weighted towards the lower-right quadrant, matching the reference where
      // the fragments trail away from the medallion's edge.
      const angle = -1.05 + random() * 2.9;
      return {
        angle,
        radius: 0.98 + random() * random() * 1.15,
        depth: (random() - 0.5) * 0.42,
        size: 0.012 + random() * random() * 0.058,
        drift: 0.1 + random() * 0.35,
        spin: (random() - 0.5) * 0.6,
        phase: random() * Math.PI * 2,
      };
    });
  }, [count]);

  const place = (time: number) => {
    const mesh = shardsRef.current;
    if (!mesh) return;

    for (let i = 0; i < shards.length; i += 1) {
      const shard = shards[i];
      const wobble = animate ? Math.sin(time * shard.drift + shard.phase) * 0.06 : 0;
      const radius = shard.radius + wobble;
      const angle = shard.angle + (animate ? Math.sin(time * 0.08 + shard.phase) * 0.05 : 0);

      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, shard.depth + wobble * 0.4);
      dummy.rotation.set(shard.phase + time * shard.spin * 0.2, shard.phase * 1.7, angle);
      dummy.scale.setScalar(shard.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    place(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shards, animate]);

  useFrame((state, delta) => {
    const opacity = visual.opacity;
    for (const material of materials.current) {
      material.opacity = material.userData.baseOpacity * opacity;
      material.visible = material.opacity > 0.01;
    }

    if (!animate) return;
    place(state.clock.elapsedTime);
    if (arcsRef.current) arcsRef.current.rotation.z -= delta * 0.035;

    // Stay attached to the medallion. Page-length spread was reading as a line.
    if (rootRef.current) {
      const next = THREE.MathUtils.damp(rootRef.current.scale.x, 1, 2.2, delta);
      rootRef.current.scale.setScalar(next);
    }
  });

  const collect = (index: number) => (material: THREE.MeshStandardMaterial | null) => {
    if (!material) return;
    material.userData.baseOpacity = index < 0 ? 0.9 : ARCS[index].opacity;
    materials.current[index + 1] = material;
  };

  return (
    <group ref={rootRef}>
      <group ref={arcsRef}>
        {ARCS.map((arc, index) => (
          <mesh key={arc.radius} rotation={[arc.tilt, 0, arc.start]}>
            <torusGeometry args={[arc.radius, arc.thickness, 6, 96, arc.arc]} />
            <meshStandardMaterial
              ref={collect(index)}
              color="#f0cd8d"
              emissive="#c08a2c"
              emissiveIntensity={0.85}
              metalness={1}
              roughness={0.28}
              transparent
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <instancedMesh ref={shardsRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          ref={collect(-1)}
          color="#e8bf78"
          emissive="#8a5f16"
          emissiveIntensity={0.55}
          metalness={1}
          roughness={0.22}
          flatShading
          transparent
        />
      </instancedMesh>
    </group>
  );
}
