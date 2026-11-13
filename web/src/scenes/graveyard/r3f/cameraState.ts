// Mutable camera pose published by CameraRig every frame (design Section 10).
// Read by the flashlight, hands and creatures; nothing here goes through the store.
import type { Vec3 } from '../layout/camera';

export interface CameraRigState {
  /** Camera world position including sway. */
  position: [number, number, number];
  /** Point the camera looks at (pointer offset included). */
  lookAt: [number, number, number];
  /** True when no plot move is running. */
  atRest: boolean;
  /** Plot index or 'overview' the camera is heading to or resting on. */
  target: number | 'overview';
}

export const cameraStateRef: { current: CameraRigState } = {
  current: {
    position: [0, 1.5, 5.6],
    lookAt: [0, 0.2, -2],
    atRest: true,
    target: 0,
  },
};

export function writeCameraState(
  position: Vec3,
  lookAt: Vec3,
  atRest: boolean,
  target: number | 'overview',
): void {
  const s = cameraStateRef.current;
  s.position[0] = position[0];
  s.position[1] = position[1];
  s.position[2] = position[2];
  s.lookAt[0] = lookAt[0];
  s.lookAt[1] = lookAt[1];
  s.lookAt[2] = lookAt[2];
  s.atRest = atRest;
  s.target = target;
}
