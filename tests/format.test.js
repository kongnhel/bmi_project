import test from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  formatDate,
  formatHealthyRange,
  formatHeight,
  formatWeight,
  formatWeightAmount,
} from '../src/format.js';

const NOV_16_2026 = new Date(2026, 10, 16, 9, 30).getTime();

test('formats English and Khmer dates without relying on browser locale data', () => {
  assert.equal(formatDate(NOV_16_2026, 'en'), '16 Nov 2026');
  assert.equal(formatDate(NOV_16_2026, 'km'), '16 វិច្ឆិកា 2026');
});

test('formats weight in metric and imperial units', () => {
  assert.equal(formatWeight(70, 'metric'), '70 kg');
  assert.equal(formatWeight(68.5, 'metric'), '68.5 kg');
  assert.equal(formatWeight(70, 'imperial'), '154.3 lb');
});

test('formats height in metric and imperial units', () => {
  assert.equal(formatHeight(175, 'metric'), '175 cm');
  assert.equal(formatHeight(175, 'imperial'), '5′ 8.9″');
  assert.equal(formatHeight(182.88, 'imperial'), '6′ 0″');
});

test('formats healthy weight ranges by unit', () => {
  assert.equal(formatHealthyRange(56.65625, 76.27744, 'metric'), '56.7–76.3 kg');
  assert.equal(formatHealthyRange(56.65625, 76.27744, 'imperial'), '125–168 lb');
});

test('formats weight differences with one decimal', () => {
  assert.deepEqual(formatWeightAmount(2.345, 'metric'), { amount: '2.3', unit: 'kg' });
  assert.deepEqual(formatWeightAmount(2.345, 'imperial'), { amount: '5.2', unit: 'lb' });
});

test('escapes report content safely', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
  );
});
