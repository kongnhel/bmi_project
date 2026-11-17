import test from 'node:test';
import assert from 'node:assert/strict';

import { QUALITY_TIERS, TIER_ORDER, stepTier } from '../src/character/quality.js';

test('quality tiers are ordered from low to high', () => {
  assert.deepEqual([...TIER_ORDER], ['low', 'medium', 'high']);
  for (const tier of TIER_ORDER) {
    assert.ok(QUALITY_TIERS[tier], `Missing quality tier ${tier}`);
    assert.equal(QUALITY_TIERS[tier].key, tier);
  }
});

test('DPR caps follow the 1.0 / 1.25 / 1.5 budget', () => {
  assert.equal(QUALITY_TIERS.low.dprCap, 1.0);
  assert.equal(QUALITY_TIERS.medium.dprCap, 1.25);
  assert.equal(QUALITY_TIERS.high.dprCap, 1.5);
});

test('detail budgets increase with the tier', () => {
  const low = QUALITY_TIERS.low;
  const medium = QUALITY_TIERS.medium;
  const high = QUALITY_TIERS.high;
  assert.ok(low.segScale < medium.segScale && medium.segScale < high.segScale);
  assert.ok(low.textureSize < medium.textureSize && medium.textureSize < high.textureSize);
  assert.ok(low.envCanvasWidth < medium.envCanvasWidth && medium.envCanvasWidth < high.envCanvasWidth);
  assert.ok(low.envCanvasHeight <= medium.envCanvasHeight && medium.envCanvasHeight <= high.envCanvasHeight);
  assert.ok(low.shadowMapSize <= medium.shadowMapSize && medium.shadowMapSize <= high.shadowMapSize);
});

test('low tier disables expensive rendering features', () => {
  const low = QUALITY_TIERS.low;
  assert.equal(low.antialias, false);
  assert.equal(low.shadowMapEnabled, false);
  assert.equal(low.rimLights, false);
  assert.equal(low.physicalMaterials, false);
  assert.ok(low.renderInterval >= 2);
});

test('high tier keeps full rendering features', () => {
  const high = QUALITY_TIERS.high;
  assert.equal(high.antialias, true);
  assert.equal(high.shadowMapEnabled, true);
  assert.equal(high.rimLights, true);
  assert.equal(high.physicalMaterials, true);
  assert.equal(high.renderInterval, 1);
});

test('every tier exposes finite, positive numeric budgets', () => {
  for (const tier of TIER_ORDER) {
    const entry = QUALITY_TIERS[tier];
    for (const key of ['dprCap', 'segScale', 'textureSize', 'anisotropy', 'envCanvasWidth', 'envCanvasHeight', 'renderInterval', 'shadowMapSize']) {
      assert.ok(Number.isFinite(entry[key]) && entry[key] > 0, `Invalid ${key} on ${tier}`);
    }
  }
});

test('stepTier walks one tier at a time and clamps at the edges', () => {
  assert.equal(stepTier('high', 1), 'high');
  assert.equal(stepTier('high', -1), 'medium');
  assert.equal(stepTier('medium', -1), 'low');
  assert.equal(stepTier('medium', 1), 'high');
  assert.equal(stepTier('low', -1), 'low');
  assert.equal(stepTier('low', 1), 'medium');
});

test('unknown tiers normalise to medium', () => {
  assert.equal(stepTier('ultra', 0), 'medium');
  assert.equal(stepTier(undefined, 0), 'medium');
  assert.equal(stepTier('ultra', -1), 'low');
});
