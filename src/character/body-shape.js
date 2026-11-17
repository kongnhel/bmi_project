export const BODY_SHAPES = Object.freeze({
  lean: Object.freeze({ key: 'lean', level: -1, labelKey: 'assistant.shape.lean' }),
  average: Object.freeze({ key: 'average', level: 0, labelKey: 'assistant.shape.average' }),
  larger: Object.freeze({ key: 'larger', level: 0.55, labelKey: 'assistant.shape.larger' }),
  veryLarge: Object.freeze({ key: 'veryLarge', level: 1, labelKey: 'assistant.shape.veryLarge' }),
});

/**
 * Category-level values are only used for descriptive UI labels. Actual body
 * geometry is computed continuously from the unrounded BMI.
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

export const BODY_MORPH_CONTROLS = Object.freeze([
  'torso_width',
  'waist_width',
  'abdomen_volume',
  'chest_volume',
  'upper_arm_volume',
  'forearm_volume',
  'thigh_volume',
  'leg_volume',
  'hip_width',
]);

/**
 * Reference knots from severe thinness through the largest supported adult
 * illustration. Values are normalized 0–1 and interpolated with a smoothstep
 * so there is no jump at 18.5, 25, 30, 35 or 40.
 */
export const BODY_MORPH_ANCHORS = Object.freeze([15, 16, 17, 18.5, 22, 25, 30, 35, 40, 50]);

const CONTROL_TABLES = Object.freeze({
  torso_width: Object.freeze([0.04, 0.05, 0.1, 0.2, 0.34, 0.42, 0.55, 0.68, 0.8, 0.96]),
  waist_width: Object.freeze([0.03, 0.04, 0.08, 0.18, 0.33, 0.43, 0.58, 0.73, 0.87, 1]),
  abdomen_volume: Object.freeze([0.02, 0.03, 0.07, 0.16, 0.31, 0.42, 0.6, 0.77, 0.9, 1]),
  chest_volume: Object.freeze([0.06, 0.07, 0.11, 0.22, 0.37, 0.45, 0.57, 0.68, 0.78, 0.9]),
  upper_arm_volume: Object.freeze([0.05, 0.06, 0.1, 0.21, 0.36, 0.43, 0.55, 0.68, 0.8, 0.94]),
  forearm_volume: Object.freeze([0.08, 0.09, 0.13, 0.24, 0.38, 0.45, 0.55, 0.67, 0.77, 0.9]),
  thigh_volume: Object.freeze([0.03, 0.04, 0.09, 0.19, 0.35, 0.43, 0.57, 0.72, 0.86, 1]),
  leg_volume: Object.freeze([0.07, 0.08, 0.12, 0.23, 0.38, 0.45, 0.55, 0.66, 0.76, 0.9]),
  hip_width: Object.freeze([0.06, 0.07, 0.11, 0.22, 0.37, 0.44, 0.55, 0.67, 0.78, 0.9]),
});

const AVERAGE_BMI = 22;
const AVERAGE_INDEX = BODY_MORPH_ANCHORS.indexOf(AVERAGE_BMI);

export const BODY_MORPH_BASELINE = Object.freeze(
  Object.fromEntries(
    BODY_MORPH_CONTROLS.map((key) => [key, CONTROL_TABLES[key][AVERAGE_INDEX]]),
  ),
);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function interpolate(table, bmi) {
  if (!Number.isFinite(bmi)) return table[AVERAGE_INDEX];
  if (bmi <= BODY_MORPH_ANCHORS[0]) return table[0];
  const lastIndex = BODY_MORPH_ANCHORS.length - 1;
  if (bmi >= BODY_MORPH_ANCHORS[lastIndex]) return table[lastIndex];

  for (let index = 1; index < BODY_MORPH_ANCHORS.length; index += 1) {
    const upper = BODY_MORPH_ANCHORS[index];
    if (bmi > upper) continue;
    const lower = BODY_MORPH_ANCHORS[index - 1];
    const t = (bmi - lower) / (upper - lower);
    const smooth = t * t * (3 - 2 * t);
    return table[index - 1] + (table[index] - table[index - 1]) * smooth;
  }
  return table[lastIndex];
}

export function getThinnessClass(bmi) {
  if (!Number.isFinite(bmi) || bmi >= 18.5) return null;
  if (bmi < 16) return 'severe';
  if (bmi < 17) return 'moderate';
  return 'mild';
}

/**
 * Continuous full-body controller input derived from the actual unrounded BMI.
 * The result is a normalized 0–1 vector for all required morph controls.
 */
export function getBodyMorphsForBmi(bmi) {
  const value = Number.isFinite(bmi) ? bmi : AVERAGE_BMI;
  const controls = {};
  for (const key of BODY_MORPH_CONTROLS) {
    controls[key] = interpolate(CONTROL_TABLES[key], value);
  }
  return Object.freeze({
    bmi: value,
    controls: Object.freeze(controls),
    thinness: getThinnessClass(value),
  });
}

/**
 * The torso/clothing mesh uses four named growth targets plus a lean target.
 * Positive growth is normalized above the average BMI reference; lean is the
 * residual below that reference.
 */
export function getTorsoMorphInfluences(morphState) {
  const controls = morphState?.controls ?? {};
  const growth = {};
  for (const key of ['torso_width', 'waist_width', 'abdomen_volume', 'chest_volume']) {
    const value = Number.isFinite(controls[key]) ? controls[key] : BODY_MORPH_BASELINE[key];
    const baseline = BODY_MORPH_BASELINE[key];
    growth[key] = clamp((value - baseline) / Math.max(0.0001, 1 - baseline));
  }

  const torsoKeys = ['torso_width', 'waist_width', 'abdomen_volume', 'chest_volume'];
  const currentAverage = torsoKeys.reduce((sum, key) => {
    const value = Number.isFinite(controls[key]) ? controls[key] : BODY_MORPH_BASELINE[key];
    return sum + value;
  }, 0) / torsoKeys.length;
  const baselineAverage = torsoKeys.reduce(
    (sum, key) => sum + BODY_MORPH_BASELINE[key],
    0,
  ) / torsoKeys.length;
  growth.lean = clamp((baselineAverage - currentAverage) / Math.max(0.0001, baselineAverage));
  return growth;
}

/**
 * Signed deviation from the average reference for bone-style volume scaling.
 * Returns -1..1 where negative means leaner than average.
 */
/**
 * Production-GLB influence map for all nine growth controls plus the lean
 * target. Limb and hip keys are optional in a delivered GLB; if present they
 * receive the normalized growth above the average reference.
 */
export function getModelMorphInfluences(morphState) {
  const controls = morphState?.controls ?? {};
  const influences = {};
  for (const key of BODY_MORPH_CONTROLS) {
    const value = Number.isFinite(controls[key]) ? controls[key] : BODY_MORPH_BASELINE[key];
    const baseline = BODY_MORPH_BASELINE[key];
    influences[key] = clamp((value - baseline) / Math.max(0.0001, 1 - baseline));
  }
  influences.lean = getTorsoMorphInfluences(morphState).lean;
  return influences;
}

export function getMorphDelta(morphState, key) {
  const controls = morphState?.controls ?? {};
  const value = Number.isFinite(controls[key]) ? controls[key] : BODY_MORPH_BASELINE[key];
  const baseline = BODY_MORPH_BASELINE[key];
  if (value >= baseline) {
    return clamp((value - baseline) / Math.max(0.0001, 1 - baseline), 0, 1);
  }
  return -clamp((baseline - value) / Math.max(0.0001, baseline), 0, 1);
}

export function getBodyShapeLevel(stateKey) {
  const level = BODY_SHAPE_LEVELS[stateKey];
  return Number.isFinite(level) ? level : 0;
}

export function getBodyShapeKey(level) {
  const clamped = clamp(level, -1, 1);
  if (clamped < -0.16) return 'lean';
  if (clamped < 0.24) return 'average';
  if (clamped < 0.76) return 'larger';
  return 'veryLarge';
}

export function getBodyShapeState(level) {
  return BODY_SHAPES[getBodyShapeKey(level)];
}
