import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORY_KEYS } from '../src/bmi.js';
import {
  BODY_SHAPES,
  getBodyMorphWeights,
  getBodyShapeKey,
  getBodyShapeLevel,
  getBodyShapeState,
} from '../src/character/body-shape.js';
import { t } from '../src/i18n.js';

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

test('the required body states follow the BMI progression', () => {
  assert.equal(getBodyShapeKey(getBodyShapeLevel('underweight')), 'lean');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('healthy')), 'average');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('overweight')), 'larger');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('obesity1')), 'larger');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('obesity2')), 'veryLarge');
  assert.equal(getBodyShapeKey(getBodyShapeLevel('obesity3')), 'veryLarge');
});

test('body shape levels increase monotonically across BMI categories', () => {
  const sequence = ['underweight', 'healthy', 'overweight', 'obesity1', 'obesity2', 'obesity3'];
  const levels = sequence.map((key) => getBodyShapeLevel(key));
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(levels[index] > levels[index - 1], `${sequence[index]} should be larger`);
  }
});

test('morph weights provide smooth lean and volume controls', () => {
  assert.deepEqual(getBodyMorphWeights(0), { lean: 0, volume: 0 });
  assert.deepEqual(getBodyMorphWeights(-1), { lean: 1, volume: 0 });
  assert.deepEqual(getBodyMorphWeights(1), { lean: 0, volume: 1 });
  assert.deepEqual(getBodyMorphWeights(0.5), { lean: 0, volume: 0.5 });
  const states = [
    getBodyShapeState(-1),
    getBodyShapeState(0),
    getBodyShapeState(0.55),
    getBodyShapeState(1),
  ];
  assert.deepEqual(states.map((state) => state.key), ['lean', 'average', 'larger', 'veryLarge']);
});

test('body state labels are localized in English and Khmer', () => {
  for (const shape of Object.values(BODY_SHAPES)) {
    for (const language of ['en', 'km']) {
      const label = t(language, shape.labelKey);
      assert.notEqual(label, shape.labelKey);
      assert.ok(label.length > 0);
    }
  }
});
