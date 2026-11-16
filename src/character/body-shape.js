export const BODY_SHAPES = Object.freeze({
  lean: Object.freeze({ key: 'lean', level: -1, labelKey: 'assistant.shape.lean' }),
  average: Object.freeze({ key: 'average', level: 0, labelKey: 'assistant.shape.average' }),
  larger: Object.freeze({ key: 'larger', level: 0.55, labelKey: 'assistant.shape.larger' }),
  veryLarge: Object.freeze({ key: 'veryLarge', level: 1, labelKey: 'assistant.shape.veryLarge' }),
});

/**
 * Continuous illustrative body levels derived directly from the BMI state.
 * These are visual categories only, not measurements of a person's body.
 */
export const BODY_SHAPE_LEVELS = Object.freeze({
  idle: 0,
  underweight: -1,
  healthy: 0,
  overweight: 0.42,
  obesity1: 0.65,
  obesity2: 0.84,
  obesity3: 1,
});

function clamp(value, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function getBodyShapeLevel(stateKey) {
  const level = BODY_SHAPE_LEVELS[stateKey];
  return Number.isFinite(level) ? level : 0;
}

export function getBodyShapeKey(level) {
  const clamped = clamp(level);
  if (clamped < -0.16) return 'lean';
  if (clamped < 0.24) return 'average';
  if (clamped < 0.76) return 'larger';
  return 'veryLarge';
}

export function getBodyShapeState(level) {
  return BODY_SHAPES[getBodyShapeKey(level)];
}

/**
 * Two additive morph influences used by the procedural torso and available to
 * a future production GLB (BodyLean / BodyVolume shape keys).
 */
export function getBodyMorphWeights(level) {
  const clamped = clamp(level);
  return {
    lean: Math.max(0, -clamped),
    volume: Math.max(0, clamped),
  };
}
