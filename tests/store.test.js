import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_HISTORY,
  STORAGE_KEY,
  addHistoryEntry,
  clearStoredData,
  createHistoryEntry,
  normalizeHistory,
  readPreferences,
  removeHistoryEntry,
  savePreferences,
} from '../src/store.js';

class MemoryStorage {
  constructor(initial = {}) {
    this.map = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

function entry(id, ts, overrides = {}) {
  return {
    id,
    ts,
    bmi: 22.5,
    categoryKey: 'healthy',
    weightKg: 70,
    heightCm: 175,
    age: null,
    ...overrides,
  };
}

test('preferences round-trip through storage', () => {
  const storage = new MemoryStorage();
  const history = [entry('a', 1000), entry('b', 900, { bmi: 25.1, categoryKey: 'overweight' })];

  const saved = savePreferences({
    language: 'km',
    theme: 'dark',
    unit: 'imperial',
    gender: 'female',
    age: 28,
    historyConsent: true,
    history,
  }, storage);
  assert.equal(saved, true);

  const loaded = readPreferences(storage);
  assert.equal(loaded.language, 'km');
  assert.equal(loaded.theme, 'dark');
  assert.equal(loaded.unit, 'imperial');
  assert.equal(loaded.gender, 'female');
  assert.equal(loaded.age, 28);
  assert.equal(loaded.historyConsent, true);
  assert.deepEqual(loaded.history.map((item) => item.id), ['a', 'b']);
});

test('malformed storage safely falls back to defaults', () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: '{not json' });
  const loaded = readPreferences(storage);
  assert.equal(loaded.language, null);
  assert.equal(loaded.theme, null);
  assert.equal(loaded.unit, 'metric');
  assert.equal(loaded.gender, 'male');
  assert.equal(loaded.age, null);
  assert.equal(loaded.historyConsent, false);
  assert.deepEqual(loaded.history, []);
});

test('invalid and out-of-range preferences are sanitized on save and load', () => {
  const storage = new MemoryStorage();
  savePreferences({
    language: 'fr',
    theme: 'blue',
    unit: 'stone',
    gender: 'other',
    age: 28.5,
    historyConsent: 'yes',
    history: 'nope',
  }, storage);

  const loaded = readPreferences(storage);
  assert.equal(loaded.language, null);
  assert.equal(loaded.theme, null);
  assert.equal(loaded.unit, 'metric');
  assert.equal(loaded.gender, 'male');
  assert.equal(loaded.age, null);
  assert.equal(loaded.historyConsent, false);
  assert.deepEqual(loaded.history, []);
});

test('history entries are validated and sorted newest first', () => {
  const normalized = normalizeHistory([
    entry('old', 100),
    entry('bad-category', 200, { categoryKey: 'unknown' }),
    entry('new', 300),
    entry('old', 100),
    entry('bad-weight', 400, { weightKg: 0 }),
    entry('bad-height', 500, { heightCm: Number.NaN }),
  ]);

  assert.deepEqual(normalized.map((item) => item.id), ['new', 'old']);
});

test('history retains measurements within unit-rounding tolerance', () => {
  const normalized = normalizeHistory([
    entry('low-end', 1000, { weightKg: 9.98, heightCm: 49.52 }),
    entry('high-end', 2000, { weightKg: 500.4, heightCm: 272.04 }),
  ]);
  assert.deepEqual(normalized.map((item) => item.id), ['high-end', 'low-end']);
});

test('history is capped at the documented maximum', () => {
  const entries = Array.from({ length: MAX_HISTORY + 10 }, (_, index) => (
    entry(`entry-${index}`, index + 1)
  ));
  const normalized = normalizeHistory(entries);
  assert.equal(normalized.length, MAX_HISTORY);
  assert.equal(normalized[0].id, `entry-${MAX_HISTORY + 9}`);
});

test('adding and removing history entries preserves strict uniqueness', () => {
  const first = entry('a', 1000);
  const second = entry('b', 2000);
  const history = addHistoryEntry(addHistoryEntry([], first), second);
  assert.deepEqual(history.map((item) => item.id), ['b', 'a']);

  const replaced = addHistoryEntry(history, entry('a', 3000, { bmi: 23 }));
  assert.equal(replaced.length, 2);
  assert.equal(replaced[0].id, 'a');
  assert.equal(replaced[0].bmi, 23);

  assert.deepEqual(removeHistoryEntry(replaced, 'a').map((item) => item.id), ['b']);
});

test('history entry creation includes canonical measurements and optional age', () => {
  const created = createHistoryEntry({
    bmi: 22.86,
    categoryKey: 'healthy',
    weightKg: 70,
    heightCm: 175,
  }, 28, 123456789);

  assert.ok(created.id);
  assert.equal(created.ts, 123456789);
  assert.equal(created.bmi, 22.86);
  assert.equal(created.categoryKey, 'healthy');
  assert.equal(created.weightKg, 70);
  assert.equal(created.heightCm, 175);
  assert.equal(created.age, 28);

  const noAge = createHistoryEntry({
    bmi: 22.86,
    categoryKey: 'healthy',
    weightKg: 70,
    heightCm: 175,
  }, null, 42);
  assert.equal(noAge.age, null);
});

test('clearing storage removes only the application key', () => {
  const storage = new MemoryStorage({ other: 'keep-me' });
  savePreferences({ language: 'en', history: [] }, storage);
  assert.equal(clearStoredData(storage), true);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(storage.getItem('other'), 'keep-me');
});
