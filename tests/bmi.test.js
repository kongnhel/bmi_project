import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBmi,
  classifyBmi,
  cmToFtIn,
  formatBmi,
  ftInToCm,
  getHealthyWeightRange,
  getWeightRelation,
  kgToLb,
  lbToKg,
  parseDecimalInput,
  roundTo,
  validateAge,
  validateNumber,
} from '../src/bmi.js';

test('calculates BMI with the standard formula', () => {
  assert.equal(roundTo(calculateBmi(70, 175), 2), 22.86);
  assert.equal(roundTo(calculateBmi(50, 160), 2), 19.53);
  assert.equal(roundTo(calculateBmi(100, 200), 2), 25);
});

test('rejects invalid measurements in the core calculation', () => {
  assert.throws(() => calculateBmi(0, 175), RangeError);
  assert.throws(() => calculateBmi(70, 0), RangeError);
  assert.throws(() => calculateBmi(-1, 175), RangeError);
  assert.throws(() => calculateBmi(Number.NaN, 175), TypeError);
  assert.throws(() => calculateBmi(70, Number.POSITIVE_INFINITY), TypeError);
});

test('classifies every adult threshold from the unrounded BMI', () => {
  const cases = [
    [15, 'underweight'],
    [18.49, 'underweight'],
    [18.5, 'healthy'],
    [22.9, 'healthy'],
    [24.99, 'healthy'],
    [25, 'overweight'],
    [29.99, 'overweight'],
    [30, 'obesity1'],
    [34.99, 'obesity1'],
    [35, 'obesity2'],
    [39.99, 'obesity2'],
    [40, 'obesity3'],
    [55, 'obesity3'],
  ];

  for (const [bmi, expected] of cases) {
    assert.equal(classifyBmi(bmi), expected, `BMI ${bmi}`);
  }
});

test('classifies BMI values that sit just under a boundary', () => {
  assert.equal(classifyBmi(24.999999), 'healthy');
  assert.equal(classifyBmi(29.999999), 'overweight');
  assert.equal(classifyBmi(39.999999), 'obesity2');
});

test('rejects non-positive or non-finite BMI values for classification', () => {
  assert.throws(() => classifyBmi(0), TypeError);
  assert.throws(() => classifyBmi(-5), TypeError);
  assert.throws(() => classifyBmi(Number.NaN), TypeError);
});

test('formats BMI without rounding across a category boundary', () => {
  assert.equal(formatBmi(22.857), '22.9');
  assert.equal(formatBmi(18.5), '18.5');
  assert.equal(formatBmi(18.46), '18.46');
  assert.equal(formatBmi(24.96), '24.96');
  assert.equal(formatBmi(25), '25.0');
});

test('calculates the healthy reference weight range', () => {
  const range = getHealthyWeightRange(180);
  assert.equal(roundTo(range.minKg, 2), 59.94);
  assert.equal(roundTo(range.maxKg, 2), 80.68);
});

test('describes weight relative to the healthy reference range', () => {
  const below = getWeightRelation(50, 180, calculateBmi(50, 180));
  assert.equal(below.direction, 'below');
  assert.equal(roundTo(below.amountKg, 2), 9.94);

  const within = getWeightRelation(70, 180, calculateBmi(70, 180));
  assert.equal(within.direction, 'within');
  assert.equal(within.amountKg, 0);

  const above = getWeightRelation(90, 180, calculateBmi(90, 180));
  assert.equal(above.direction, 'above');
  assert.equal(roundTo(above.amountKg, 2), 9.32);
});

test('parses decimal input safely, including commas and Khmer digits', () => {
  assert.equal(parseDecimalInput('70.5'), 70.5);
  assert.equal(parseDecimalInput('70,5'), 70.5);
  assert.equal(parseDecimalInput(' 175 '), 175);
  assert.equal(parseDecimalInput('៧០.៥'), 70.5);
  assert.equal(parseDecimalInput('.5'), 0.5);
  assert.equal(parseDecimalInput('70.'), 70);
  assert.equal(parseDecimalInput('-5'), -5);
  assert.equal(parseDecimalInput(''), null);
  assert.equal(parseDecimalInput('abc'), null);
  assert.equal(parseDecimalInput('1e3'), null);
  assert.equal(parseDecimalInput('1,2,3'), null);
  assert.equal(parseDecimalInput('1,2.3'), null);
  assert.equal(parseDecimalInput('NaN'), null);
});

test('validates numeric fields and statuses', () => {
  const limits = { min: 10, max: 500 };
  assert.deepEqual(validateNumber('', limits), { status: 'empty', value: null });
  assert.deepEqual(validateNumber('abc', limits), { status: 'invalid', value: null });
  assert.equal(validateNumber('0', limits).status, 'below');
  assert.equal(validateNumber('-1', limits).status, 'below');
  assert.equal(validateNumber('501', limits).status, 'above');
  assert.deepEqual(validateNumber('70,5', limits), { status: 'valid', value: 70.5 });
});

test('validates optional age as a whole number in range', () => {
  assert.equal(validateAge('').status, 'empty');
  assert.equal(validateAge('28').status, 'valid');
  assert.equal(validateAge('28.5').status, 'invalid');
  assert.equal(validateAge('1').status, 'below');
  assert.equal(validateAge('121').status, 'above');
});

test('converts metric and imperial units reliably', () => {
  assert.equal(roundTo(lbToKg(kgToLb(70)), 6), 70);
  assert.equal(roundTo(kgToLb(70), 2), 154.32);

  const imperial = cmToFtIn(175);
  assert.equal(imperial.feet, 5);
  assert.equal(roundTo(imperial.inches, 2), 8.9);
  assert.ok(Math.abs(roundTo(ftInToCm(5, 8.9), 6) - 175) < 0.01);

  assert.equal(roundTo(ftInToCm(6, 0), 2), 182.88);
  assert.equal(roundTo(ftInToCm(0, 0), 2), 0);
});

test('boundary weights classify as expected', () => {
  const heightCm = 180;
  const weightFor = (bmi) => bmi * (heightCm / 100) ** 2;
  assert.equal(classifyBmi(calculateBmi(weightFor(18.5), heightCm)), 'healthy');
  assert.equal(classifyBmi(calculateBmi(weightFor(25), heightCm)), 'overweight');
  assert.equal(classifyBmi(calculateBmi(weightFor(30), heightCm)), 'obesity1');
  assert.equal(classifyBmi(calculateBmi(weightFor(35), heightCm)), 'obesity2');
  assert.equal(classifyBmi(calculateBmi(weightFor(40), heightCm)), 'obesity3');
});
