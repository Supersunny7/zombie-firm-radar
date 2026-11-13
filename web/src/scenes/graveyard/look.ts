/**
 * Prototype look values for lights off (Batch 2b, Requirement 23.17).
 * Every value of 23.1, 23.4, 23.5, 23.7 to 23.11, 23.14 and 23.15 is defined here once.
 * Source: `reference/graveyard/horror-direction-params.md` (checked by `look.test.ts`).
 * Pure: plain numbers and hex strings; no React or three imports.
 * Units: metres, radians, seconds; colours are sRGB hex strings.
 */

/** Plot camera (23.1). CAMERA_BACK and TARGET_AHEAD are derived in design section 6. */
export const LOOK_CAMERA = {
  /** Vertical field of view in degrees. */
  fovDeg: 46,
  /** Eye height of the Plot_Camera_Pose above the ground. */
  eyeHeight: 1.2,
  /** Height of the plot look point. */
  lookHeight: 0.6,
  /**
   * Camera distance behind the front row anchor (design section 6). 2.7, not 3.0: the plot rect
   * front edge plus PLOT_GAP is at least frontZ + 2.7395 (smallest front-row extent 0.7395 m:
   * width 0.62, yaw 0, dz -0.30), so 2.7 is the largest 0.05 m step inside it (9.4, Property 46).
   */
  back: 2.7,
  /** Look point distance ahead of the front row anchor (design section 6). */
  targetAhead: 1.0,
} as const;

/** Plot_Fog in lights-off framed plots (23.4). */
export const LOOK_PLOT_FOG = {
  type: 'FogExp2',
  color: '#0a0d13',
  density: 0.075,
} as const;

/** Scene background in lights-off framed plots: the fog colour, so no horizon shows (23.5). */
export const LOOK_BACKGROUND = LOOK_PLOT_FOG.color;

/** Hemisphere light in lights-off framed plots (23.7). */
export const LOOK_HEMISPHERE = {
  skyColor: '#3a4a66',
  groundColor: '#0a0806',
  intensity: 0.18,
} as const;

/** Environment (HDRI) lighting intensity in lights-off framed plots (23.7). */
export const LOOK_ENVIRONMENT_INTENSITY = 0;

/** Shadow-casting directional moon in lights-off framed plots (23.8). */
export const LOOK_MOON = {
  color: '#7f9cd6',
  intensity: 1.1,
  /** Offset from the centre of the framed Plot: behind the stones, for rim light. */
  offset: [-4, 9, -22],
  castShadow: true,
} as const;

/** Flashlight spot light, both Lights_Mode values (23.9). */
export const LOOK_FLASHLIGHT = {
  color: '#ffe7c4',
  intensity: 55,
  distance: 26,
  /** Cone half-angle in radians. */
  angle: 0.36,
  penumbra: 0.95,
  decay: 2,
  castShadow: true,
  shadowBias: -0.0004,
  /** Intensity multiplier for the one flicker frame. */
  flickerFactor: 0.35,
  /** Chance per frame that a flicker starts (subject to the Flash_Limiter). */
  flickerChance: 0.006,
  /** Frames a flicker lasts. */
  flickerFrames: 1,
} as const;

/**
 * Lantern_Light point light (23.10).
 * intensity(t) = intensity * (flickerBase + flickerAmplitude * sin(freqA * t) * sin(freqB * t)),
 * t in seconds of the render-loop clock; constant `intensity` while Reduced_Motion is true.
 */
export const LOOK_LANTERN = {
  color: '#ff9a4a',
  intensity: 1.2,
  distance: 4,
  decay: 2,
  /** Height above the ground at the lantern prop. */
  height: 0.28,
  flickerBase: 0.85,
  flickerAmplitude: 0.15,
  /** Angular frequency of the first sine, rad/s. */
  flickerFreqA: 13,
  /** Angular frequency of the second sine, rad/s. */
  flickerFreqB: 7.3,
} as const;

/** CCTV_Grade, applied after tone mapping in lights off, steps (a) to (f) (23.11). */
export const LOOK_CCTV_GRADE = {
  /** (a) Saturation: mix of (1 - saturation) luma and saturation colour. */
  saturation: 0.6,
  /** (a) Luma weights for R, G, B. */
  lumaWeights: [0.3, 0.59, 0.11],
  /** (b) colour * gain + lift, clamped to [0, 1], then raised to gamma. */
  gain: 1.4,
  lift: 0.015,
  gamma: 0.9,
  /** (c) Vignette factor 1 - strength * r^power, clamped to [0, 1]; r = 1 at the edge midpoints. */
  vignetteStrength: 0.38,
  vignettePower: 2.5,
  /** (d) Gaussian grain standard deviation, new pattern every frame. */
  grainSigma: 0.035,
  /** (e) Every `scanlinePeriod`-th pixel row is multiplied by `scanlineFactor`. */
  scanlinePeriod: 3,
  scanlineFactor: 0.88,
  /** (f) Red mixed `redGhostMix` with red sampled `redGhostOffsetPx` to the left (ghost appears to the right). */
  redGhostMix: 0.4,
  redGhostOffsetPx: 2,
} as const;

/** Headstone base-colour multiplier in lights off (23.14). */
export const LOOK_STONE_COLOR_FACTOR = 0.55;

/** Tone mapping in lights off (23.15). */
export const LOOK_TONE_MAPPING = {
  mode: 'ACESFilmic',
  exposure: 1.0,
} as const;
