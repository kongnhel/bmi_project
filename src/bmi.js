/**
 * Pure BMI domain logic.
 * Kept free of DOM and storage concerns so it can be unit tested in Node.
 */

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const LIMITS = Object.freeze({
  metric: Object.freeze({
    weight: Object.freeze({ min: 10, max: 500, unit: 'kg' }),
    height: Object.freeze({ min: 50, max: 272, unit: 'cm' }),
  }),
  imperial: Object.freeze({
    weight: Object.freeze({ min: 22, max: 1102, unit: 'lb' }),
    height: Object.freeze({ min: 50, max: 272, unit: 'cm' }),
    feet: Object.freeze({ min: 1, max: 8 }),
    inches: Object.freeze({ min: 0, max: 11.9 }),
  }),
  age: Object.freeze({ min: 2, max: 120 }),
});

/**
 * A 0.5-unit tolerance keeps unit switching stable when values are rounded
 * for display (for example 272 cm -> 8 ft 11.1 in -> 272.03 cm).
 */
export const ACCEPTED_LIMITS = Object.freeze({
  weightKg: Object.freeze({
    min: LIMITS.metric.weight.min - 0.5,
    max: LIMITS.metric.weight.max + 0.5,
  }),
  heightCm: Object.freeze({
    min: LIMITS.metric.height.min - 0.5,
    max: LIMITS.metric.height.max + 0.5,
  }),
});

/** Ordered from lowest to highest. Upper bound is exclusive. */
export const CATEGORIES = Object.freeze([
  Object.freeze({ key: 'underweight', min: -Infinity, max: 18.5 }),
  Object.freeze({ key: 'healthy', min: 18.5, max: 25 }),
  Object.freeze({ key: 'overweight', min: 25, max: 30 }),
  Object.freeze({ key: 'obesity1', min: 30, max: 35 }),
  Object.freeze({ key: 'obesity2', min: 35, max: 40 }),
  Object.freeze({ key: 'obesity3', min: 40, max: Infinity }),
]);

export const CATEGORY_KEYS = Object.freeze(CATEGORIES.map((category) => category.key));

export const HEALTHY_BMI = Object.freeze({ min: 18.5, max: 24.9, threshold: 25 });

/** Used only for drawing the gauge; values outside are clamped for display. */
export const GAUGE_BOUNDS = Object.freeze({ min: 12, max: 45 });

const KHMER_DIGIT_START = 0x17e0;
const KHMER_DIGIT_END = 0x17e9;

function normalizeDigits(value) {
  let result = '';
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code >= KHMER_DIGIT_START && code <= KHMER_DIGIT_END) {
      result += String(code - KHMER_DIGIT_START);
    } else {
      result += character;
    }
  }
  return result;
}

/**
 * Parses a user-entered decimal. Accepts one comma as a decimal separator and
 * Khmer digits. Returns null for empty, malformed, or non-finite input.
 */
export function parseDecimalInput(raw) {
  if (raw === null || raw === undefined) return null;
  const text = normalizeDigits(String(raw)).trim();
  if (!text) return null;

  const compact = text.replace(/\s+/g, '');
  const commaCount = (compact.match(/,/g) ?? []).length;
  if (commaCount > 1) return null;
  if (commaCount === 1 && compact.includes('.')) return null;

  const normalized = compact.replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Generic numeric field validation.
 * @returns {{status: 'empty'|'invalid'|'below'|'above'|'valid', value: number|null}}
 */
export function validateNumber(raw, { min, max }) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { status: 'empty', value: null };
  }
  const value = parseDecimalInput(raw);
  if (value === null) return { status: 'invalid', value: null };
  if (value < min) return { status: 'below', value };
  if (value > max) return { status: 'above', value };
  return { status: 'valid', value };
}

export function validateAge(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { status: 'empty', value: null };
  }
  const result = validateNumber(raw, LIMITS.age);
  if (result.status !== 'valid') return result;
  if (!Number.isInteger(result.value)) return { status: 'invalid', value: result.value };
  return result;
}

export function calculateBmi(weightKg, heightCm) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) {
    throw new TypeError('Weight and height must be finite numbers.');
  }
  if (weightKg <= 0) throw new RangeError('Weight must be greater than zero.');
  if (heightCm <= 0) throw new RangeError('Height must be greater than zero.');

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** Returns a category key. Boundaries are evaluated on the unrounded BMI. */
export function classifyBmi(bmi) {
  if (!Number.isFinite(bmi) || bmi <= 0) {
    throw new TypeError('BMI must be a positive finite number.');
  }
  const category = CATEGORIES.find((entry) => bmi < entry.max);
  return category ? category.key : 'obesity3';
}

export function getCategory(key) {
  return CATEGORIES.find((category) => category.key === key) ?? null;
}

/**
 * Healthy reference weight for a height, using the displayed adult BMI range
 * of 18.5–24.9. Values are raw and should be rounded for presentation.
 */
export function getHealthyWeightRange(heightCm) {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new RangeError('Height must be a positive finite number.');
  }
  const heightM = heightCm / 100;
  const square = heightM * heightM;
  return {
    minKg: HEALTHY_BMI.min * square,
    maxKg: HEALTHY_BMI.max * square,
  };
}

/**
 * Formats BMI for display while avoiding a rounded value that crosses a
 * classification boundary (e.g. 18.46 must not appear as the healthy 18.5).
 */
export function formatBmi(bmi) {
  if (!Number.isFinite(bmi)) return '';
  for (const decimals of [1, 2, 3]) {
    const rounded = Number(bmi.toFixed(decimals));
    if (classifyBmi(rounded) === classifyBmi(bmi)) {
      return bmi.toFixed(decimals);
    }
  }
  return bmi.toFixed(4);
}

export function kgToLb(kg) {
  return kg / KG_PER_LB;
}

export function lbToKg(lb) {
  return lb * KG_PER_LB;
}

export function cmToFtIn(cm) {
  const totalInches = cm / CM_PER_IN;
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: totalInches - feet * 12 };
}

export function ftInToCm(feet, inches) {
  return (feet * 12 + inches) * CM_PER_IN;
}

export function roundTo(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Number formatting that stays Latin-digit and stable across languages. */
export function formatDecimal(value, decimals = 1) {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getWeightRelation(weightKg, heightCm, bmi) {
  const range = getHealthyWeightRange(heightCm);
  const category = classifyBmi(bmi);
  if (bmi < HEALTHY_BMI.min) {
    return { direction: 'below', amountKg: Math.max(0, range.minKg - weightKg) };
  }
  if (category === 'healthy') {
    return { direction: 'within', amountKg: 0 };
  }
  return { direction: 'above', amountKg: Math.max(0, weightKg - range.maxKg) };
}
