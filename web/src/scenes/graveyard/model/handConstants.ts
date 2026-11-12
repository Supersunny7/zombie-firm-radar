/**
 * Orientation of the Craggle hand mesh. This is the only place that depends on
 * which end of the principal axis is the wrist.
 *
 * HAND_WRIST_END: +1 means the narrow forearm end lies at +axis, -1 at -axis.
 * Verified visually with the dev-only close-up (`?view=hand-closeup`).
 */
export const HAND_WRIST_END: 1 | -1 = 1;

/** Measured principal axis of the hand geometry (unit-ish vector, model space). */
export const HAND_PRINCIPAL_AXIS = [0.887, 0.065, 0.456] as const;
