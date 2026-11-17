import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORY_KEYS, calculateBmi, classifyBmi } from '../src/bmi.js';
import {
  BODY_MORPH_BASELINE,
  BODY_MORPH_CONTROLS,
  BODY_SHAPES,
  getBodyMorphsForBmi,
  getBodyShapeKey,
  getBodyShapeLevel,
  getBodyShapeState,
  getMorphDelta,
  getModelMorphInfluences,
  getThinnessClass,
  getTorsoMorphInfluences,
} from '../src/character/body-shape.js';
import { t } from '../src/i18n.js';

const TEST_BMIS = [16, 17, 18.49, 18.5, 22, 24.9, 25, 27.1, 29.8, 30, 34.7, 35, 39.8, 40];

function maxControlDifference(first, second) {
  return Math.max(...BODY_MORPH_CONTROLS.map(
    (key) => Math.abs(first.controls[key] - second.controls[key]),
  ));
}

test('every BMI category maps to a defined illustrative body level', () => {
  for (const categoryKey of CATEGORY_KEYS) {
    const level = getBodyShapeLevel(categoryKey);
    assert.equal(typeof level, 'number');
    assert.ok(level >= -1 && level <= 1);
    assert.ok(Object.prototype.hasOwnProperty.call(BODY_SHAPES, getBodyShapeKey(level)));
  }
  assert.equal(getBodyShapeLevel('idle'), 0);
  assert.equal(getBodyShapeLevel('unknown'), 0);
});

test('body-state labels follow the BMI progression', () => {
  assert.equal(getBodyShapeKey(getBodyShapeLevel('underweight')), 'lean');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('healthy')), 'average');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('overweight')), 'larger');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('obesity1')), 'larger');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('obesity2')), 'veryLarge');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('obesity3')), 'veryLarge');
});

test('all required morph values are finite, normalized and continuous', () => {
  let previous = null;
  for (const bmi of TEST_BMIS) {
    const state = getBodyMorphsForBmi(bmi);
    for (const key of BODY_MORPH_CONTROLS) {
      assert.ok(state.controls[key] >= 0 && state.controls[key] <= 1, `${key} at BMI ${bmi}`);
    }
    if (previous) {
      for (const key of BODY_MORPH_CONTROLS) {
        assert.ok(state.controls[key] >= previous.controls[key], `${key} should not reverse at ${bmi}`);
      }
      assert.ok(maxControlDifference(previous, state) > 0, `BMI ${bmi} should change the body`);
    }
    previous = state;
  }
});

test('specific intermediate BMIs produce different continuous shapes', () => {
  for (const [first, second] of [[27.1, 29.8], [30.2, 34.7], [36, 39.8]]) {
    const firstShape = getBodyMorphsForBmi(first);
    const secondShape = getBodyMorphsForBmi(second);
    assert.ok(maxControlDifference(firstShape, secondShape) > 0.01, `${first} vs ${second}`);
  }
});

test('category boundaries do not jump the body shape', () => {
  const boundaryPairs = [[18.49, 18.5], [24.9, 25], [29.9, 30], [34.9, 35], [39.9, 40]];
  for (const [before, after] of boundaryPairs) {
    const difference = maxControlDifference(
      getBodyMorphsForBmi(before),
      getBodyMorphsForBmi(after),
    );
    assert.ok(difference < 0.01, `${before} to ${after} difference ${difference}`);
  }
});

test('classifications and intermediate states stay correct', () => {
  const expectedCategories = {
    16: 'underweight',
    17: 'underweight',
    18.49: 'underweight',
    18.5: 'healthy',
    22: 'healthy',
    24.9: 'healthy',
    25: 'overweight',
    27.1: 'overweight',
    29.8: 'overweight',
    30: 'obesity1',
    34.7: 'obesity1',
    35: 'obesity2',
    39.8: 'obesity2',
    40: 'obesity3',
  };
  for (const [bmi, category] of Object.entries(expectedCategories)) {
    assert.equal(classifyBmi(Number(bmi)), category, `BMI ${bmi}`);
  }
});

test('actual calculated BMI drives the continuous morph state', () => {
  const heightCm = 200;
  const weightFor = (bmi) => bmi * (heightCm / 100) ** 2;
  const first = getBodyMorphsForBmi(calculateBmi(weightFor(27.1), heightCm));
  const second = getBodyMorphsForBmi(calculateBmi(weightFor(29.8), heightCm));
  const third = getBodyMorphsForBmi(calculateBmi(weightFor(36), heightCm));
  const fourth = getBodyMorphsForBmi(calculateBmi(weightFor(39.8), heightCm));
  assert.ok(maxControlDifference(first, second) > 0.01);
  assert.ok(maxControlDifference(third, fourth) > 0.01);
  assert.equal(first.bmi, 27.1);
  assert.equal(second.bmi, 29.8);
});

test('every required control changes from severe thinness to the largest state', () => {
  const lean = getBodyMorphsForBmi(16);
  const largest = getBodyMorphsForBmi(45);
  for (const key of BODY_MORPH_CONTROLS) {
    assert.ok(largest.controls[key] - lean.controls[key] > 0.2, key);
  }
});

test('underweight thinness subcategories follow the reference thresholds', () => {
  assert.equal(getThinnessClass(15.9), 'severe');
  assert.equal(getThinnessClass(16), 'moderate');
  assert.equal(getThinnessClass(16.99), 'moderate');
  assert.equal(getThinnessClass(17), 'mild');
  assert.equal(getThinnessClass(18.49), 'mild');
  assert.equal(getThinnessClass(18.5), null);
  assert.equal(getThinnessClass(22), null);
});

test('production model morph map covers all nine controls plus lean', () => {
  const average = getModelMorphInfluences(getBodyMorphsForBmi(22));
  for (const key of BODY_MORPH_CONTROLS) {
    assert.equal(average[key], 0, key);
  }
  assert.equal(average.lean, 0);

  const lean = getModelMorphInfluences(getBodyMorphsForBmi(16));
  assert.ok(lean.lean > 0.5);

  const largest = getModelMorphInfluences(getBodyMorphsForBmi(40));
  assert.ok(largest.lean === 0);
  for (const key of BODY_MORPH_CONTROLS) {
    assert.ok(largest[key] > 0 && largest[key] <= 1, key);
  }
});

test('torso morph targets blend from lean through growth', () => {
  const lean = getTorsoMorphInfluences(getBodyMorphsForBmi(16));
  const average = getTorsoMorphInfluences(getBodyMorphsForBmi(22));
  const larger = getTorsoMorphInfluences(getBodyMorphsForBmi(30));
  const largest = getTorsoMorphInfluences(getBodyMorphsForBmi(45));
  assert.ok(lean.lean > 0.5);
  assert.equal(average.lean, 0);
  assert.ok(larger.abdomen_volume > average.abdomen_volume);
  assert.ok(largest.abdomen_volume > larger.abdomen_volume);
  for (const key of ['torso_width', 'waist_width', 'abdomen_volume', 'chest_volume']) {
    assert.ok(largest[key] > 0.5, `${key} largest influence`);
    assert.ok(largest[key] <= 1, `${key} influence cap`);
  }
});

test('limb volume deltas are signed around the average reference', () => {
  const lean = getBodyMorphsForBmi(16);
  const average = getBodyMorphsForBmi(22);
  const larger = getBodyMorphsForBmi(35);
  assert.ok(getMorphDelta(lean, 'upper_arm_volume') < 0);
  assert.equal(getMorphDelta(average, 'upper_arm_volume'), 0);
  assert.ok(getMorphDelta(larger, 'upper_arm_volume') > 0);
  assert.equal(Object.keys(BODY_MORPH_BASELINE).length, BODY_MORPH_CONTROLS.length);
});

test('the four display states include the required labels in both languages', () => {
  const states = [
    getBodyShapeState(-1),
    getBodyShapeState(0),
    getBodyShapeState(0.55),
    getBodyShapeState(1),
  ];
  assert.deepEqual(states.map((state) => state.key), ['lean', 'average', 'larger', 'veryLarge']);
  for (const shape of Object.values(BODY_SHAPES)) {
    for (const language of ['en', 'km']) {
      const label = t(language, shape.labelKey);
      assert.notEqual(label, shape.labelKey);
      assert.ok(label.length > 0);
    }
  }
});
