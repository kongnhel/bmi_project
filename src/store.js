import { ACCEPTED_LIMITS, CATEGORY_KEYS, LIMITS, validateAge } from './bmi.js';

export const STORAGE_KEY = 'blackbox.bmi.v1';
export const STORAGE_VERSION = 1;
export const MAX_HISTORY = 50;

export const DEFAULT_PREFERENCES = Object.freeze({
  version: STORAGE_VERSION,
  language: null,
  theme: null,
  unit: 'metric',
  age: null,
  historyConsent: false,
  history: [],
});

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function isStorageAvailable(storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    const probe = `${STORAGE_KEY}.probe`;
    target.setItem(probe, '1');
    target.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.id !== 'string' || entry.id.length === 0) return null;
  if (!isFiniteNumber(entry.ts) || entry.ts <= 0) return null;
  if (!isFiniteNumber(entry.bmi) || entry.bmi <= 0) return null;
  if (!CATEGORY_KEYS.includes(entry.categoryKey)) return null;
  if (!isFiniteNumber(entry.weightKg) || entry.weightKg <= 0) return null;
  if (!isFiniteNumber(entry.heightCm) || entry.heightCm <= 0) return null;
  if (
    entry.weightKg < ACCEPTED_LIMITS.weightKg.min
    || entry.weightKg > ACCEPTED_LIMITS.weightKg.max
  ) {
    return null;
  }
  if (
    entry.heightCm < ACCEPTED_LIMITS.heightCm.min
    || entry.heightCm > ACCEPTED_LIMITS.heightCm.max
  ) {
    return null;
  }

  return {
    id: entry.id,
    ts: entry.ts,
    bmi: entry.bmi,
    categoryKey: entry.categoryKey,
    weightKg: entry.weightKg,
    heightCm: entry.heightCm,
    age: Number.isInteger(entry.age) && entry.age >= LIMITS.age.min && entry.age <= LIMITS.age.max
      ? entry.age
      : null,
  };
}

export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const seen = new Set();
  return history
    .map(normalizeHistoryEntry)
    .filter((entry) => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, MAX_HISTORY);
}

export function readPreferences(storage) {
  const target = resolveStorage(storage);
  if (!target) return { ...DEFAULT_PREFERENCES };

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFERENCES };

    const ageResult = validateAge(parsed.age);
    return {
      version: STORAGE_VERSION,
      language: parsed.language === 'en' || parsed.language === 'km' ? parsed.language : null,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : null,
      unit: parsed.unit === 'imperial' ? 'imperial' : 'metric',
      age: ageResult.status === 'valid' ? ageResult.value : null,
      historyConsent: parsed.historyConsent === true,
      history: normalizeHistory(parsed.history),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences, storage) {
  const target = resolveStorage(storage);
  if (!target) return false;

  const age = validateAge(preferences.age);
  const payload = {
    version: STORAGE_VERSION,
    language: preferences.language === 'en' || preferences.language === 'km' ? preferences.language : null,
    theme: preferences.theme === 'light' || preferences.theme === 'dark' ? preferences.theme : null,
    unit: preferences.unit === 'imperial' ? 'imperial' : 'metric',
    age: age.status === 'valid' ? age.value : null,
    historyConsent: preferences.historyConsent === true,
    history: normalizeHistory(preferences.history),
  };

  try {
    target.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredData(storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function createHistoryEntry(result, age, now = Date.now()) {
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    ts: now,
    bmi: result.bmi,
    categoryKey: result.categoryKey,
    weightKg: result.weightKg,
    heightCm: result.heightCm,
    age: Number.isInteger(age) ? age : null,
  };
}

export function addHistoryEntry(history, entry) {
  return normalizeHistory([entry, ...history.filter((item) => item.id !== entry.id)]);
}

export function removeHistoryEntry(history, id) {
  return history.filter((entry) => entry.id !== id);
}
