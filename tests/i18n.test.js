import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getTranslationKeys, t } from '../src/i18n.js';

test('English and Khmer have identical translation keys', () => {
  const english = new Set(getTranslationKeys('en'));
  const khmer = new Set(getTranslationKeys('km'));

  const missingInKhmer = [...english].filter((key) => !khmer.has(key));
  const missingInEnglish = [...khmer].filter((key) => !english.has(key));

  assert.deepEqual(missingInKhmer, [], 'Khmer is missing keys');
  assert.deepEqual(missingInEnglish, [], 'English is missing keys');
});

test('every translation attribute in index.html resolves in both languages', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const keys = new Set();
  const patterns = [
    /data-i18n="([^"]+)"/g,
    /data-i18n-placeholder="([^"]+)"/g,
    /data-i18n-aria-label="([^"]+)"/g,
    /data-i18n-title="([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) keys.add(match[1]);
  }

  const english = new Set(getTranslationKeys('en'));
  const khmer = new Set(getTranslationKeys('km'));

  for (const key of keys) {
    assert.ok(english.has(key), `English missing HTML key: ${key}`);
    assert.ok(khmer.has(key), `Khmer missing HTML key: ${key}`);
  }
});

test('translation interpolation fills variables and preserves missing ones', () => {
  assert.equal(
    t('en', 'result.above', { amount: '2.4', unit: 'kg' }),
    'About 2.4 kg above the healthy reference range.',
  );
  assert.match(t('km', 'history.count', { count: 3 }), /3/);
  assert.equal(t('en', 'missing.key'), 'missing.key');
  assert.equal(t('km', 'unknown', { value: 1 }), 'unknown');
});

test('health safety copy is present in both languages', () => {
  for (const language of ['en', 'km']) {
    assert.ok(t(language, 'result.disclaimer').length > 80);
    assert.ok(t(language, 'footer.disclaimerText').length > 60);
    assert.ok(t(language, 'learn.useWell1').length > 40);
  }
});
