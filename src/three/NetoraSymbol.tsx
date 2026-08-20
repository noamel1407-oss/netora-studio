import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { GoldAccents } from './GoldAccents';
import { DESKTOP_KEYFRAMES, journey, MOBILE_KEYFRAMES, sampleKeyframes, type Keyframe } from './journey';
import { visual } from './visual';

type Props = {
  url: string;
  mobile: boolean;
  reducedMotion: boolean;
  shardCount: number;
};

const scratch: Keyframe = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, opacity: 1 };

/** Stage window in which the emblem is allowed on screen: hero, then contact. */
const PRESENCE = {
  desktop: { outStart: 0.24, outEnd: 0.44, inStart: 2.74, inEnd: 2.98 },
  mobile: { outStart: 0.08, outEnd: 0.26, inStart: 2.88, inEnd: 3 },
};

function brandPresence(stage: number, mobile: boolean) {
  const { outStart, outEnd, inStart, inEnd } = mobile ? PRESENCE.mobile : PRESENCE.desktop;
  if (stage <= outStart) return 1;
  if (stage < outEnd) return 1 - (stage - outStart) / (outEnd - outStart);
  if (stage <= inStart) return 0;
  if (stage < inEnd) return (stage - inStart) / (inEnd - inStart);
  return 1;
}

export function NetoraSymbol({ url, mobile, reducedMotion, shardCount }: Props) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(url, false, true);

  // Cloned so hot-swapping the model file (or mounting twice in StrictMode)
  // never mutates the cached GLTF materials.
  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    const materials: THREE.Material[] = [];

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = false;

      const source = object.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      material.envMapIntensity = 1.35;
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      object.material = material;
      materials.push(material);
    });

    return { root, materials };
  }, [gltf.scene]);

  useEffect(() => () => model.materials.forEach((material) => material.dispose()), [model]);

  const keyframes = mobile ? MOBILE_KEYFRAMES : DESKTOP_KEYFRAMES;

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    const frame = sampleKeyframes(keyframes, journey.stage, scratch);
    // The emblem belongs to the opening and closing brand moments. It must not
    // drift over the portfolio device or the testimonial cards. The canvas is
    // fixed, so it has to clear out well before those sections reach the middle
    // of the viewport — sooner on mobile, where the emblem sits centre stage.
    const sceneOpacity = frame.opacity * brandPresence(journey.stage, mobile);
    const time = state.clock.elapsedTime;

    // A slow oscillation rather than a full spin: the medallion is flat, so a
    // continuous turn would repeatedly present its edge to the camera.
    const idleYaw = reducedMotion ? 0 : Math.sin(time * 0.16) * 0.12;
    const idlePitch = reducedMotion ? 0 : Math.sin(time * 0.1 + 1.2) * 0.05;
    const pointerYaw = journey.pointerX * 0.08;
    const pointerPitch = journey.pointerY * 0.06;

    const targetX = frame.position[0] + journey.pointerX * 0.03;
    const targetY = frame.position[1] - journey.pointerY * 0.02;
    const targetRotX = frame.rotation[0] + idlePitch + pointerPitch;
    const targetRotY = frame.rotation[1] + idleYaw + pointerYaw;
    const targetRotZ = frame.rotation[2];

    if (reducedMotion) {
      node.position.set(targetX, targetY, frame.position[2]);
      node.rotation.set(targetRotX, targetRotY, targetRotZ);
      node.scale.setScalar(frame.scale);
      visual.opacity = sceneOpacity;
    } else {
      // damp() keeps the easing identical regardless of frame rate.
      node.position.x = THREE.MathUtils.damp(node.position.x, targetX, 2.2, delta);
      node.position.y = THREE.MathUtils.damp(node.position.y, targetY, 2.2, delta);
      node.position.z = THREE.MathUtils.damp(node.position.z, frame.position[2], 1.8, delta);
      node.rotation.x = THREE.MathUtils.damp(node.rotation.x, targetRotX, 1.8, delta);
      node.rotation.y = THREE.MathUtils.damp(node.rotation.y, targetRotY, 1.8, delta);
      node.rotation.z = THREE.MathUtils.damp(node.rotation.z, targetRotZ, 1.8, delta);

      const scale = THREE.MathUtils.damp(node.scale.x, frame.scale, 2.1, delta);
      node.scale.setScalar(scale);
      visual.opacity = THREE.MathUtils.damp(visual.opacity, sceneOpacity, 3, delta);
    }

    for (const material of model.materials) {
      const faded = visual.opacity < 0.99;
      material.transparent = faded;
      material.opacity = faded ? visual.opacity : 1;
      material.depthWrite = !faded;
      material.visible = visual.opacity > 0.02;
    }
  });

  return (
    <group ref={group} position={keyframes[0].position} scale={keyframes[0].scale}>
      <pointLight color="#f0d09a" intensity={0.9} distance={3.2} decay={2} />
      <primitive object={model.root} />
      <GoldAccents count={shardCount} animate={!reducedMotion} />
    </group>
  );
}
