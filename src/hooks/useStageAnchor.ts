import { useCallback } from 'react';

import { registerStage } from '../three/journey';

/** Marks a section as a waypoint for the 3D symbol's scroll journey. */
export function useStageAnchor(id: string) {
  return useCallback((node: HTMLElement | null) => registerStage(id, node), [id]);
}
