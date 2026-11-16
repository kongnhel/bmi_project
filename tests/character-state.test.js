import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORY_KEYS } from '../src/bmi.js';
import { t } from '../src/i18n.js';
import {
  CHARACTER_STATES,
  CHARACTER_STATE_KEYS,
  getAssistantMessageKey,
  getCharacterState,
  getCharacterStateForCategory,
} from '../src/character/state.js';

const EXPECTED_EXPRESSIONS = new Set(['warm', 'happy', 'caring', 'thoughtful', 'empathetic']);
const EXPECTED_GESTURES = new Set(['rest', 'support', 'welcome', 'explain', 'reassure']);

test('every BMI category maps to a defined character state', () => {
  for (const categoryKey of CATEGORY_KEYS) {
    const state = getCharacterStateForCategory(categoryKey);
    assert.equal(state.key, categoryKey);
    assert.ok(state.expression, `Missing expression for ${categoryKey}`);
    assert.ok(state.gesture, `Missing gesture for ${categoryKey}`);
    assert.ok(state.messageKey, `Missing message key for ${categoryKey}`);
  }
});

test('character states use supported expressions, gestures and safety copy', () => {
  for (const key of CHARACTER_STATE_KEYS) {
    const state = getCharacterState(key);
    assert.ok(EXPECTED_EXPRESSIONS.has(state.expression), `${key} expression`);
    assert.ok(EXPECTED_GESTURES.has(state.gesture), `${key} gesture`);
    assert.equal(typeof state.headTilt, 'number');
    assert.equal(getAssistantMessageKey(key), state.messageKey);
  }
});

test('unknown and missing categories fall back to the idle state', () => {
  assert.equal(getCharacterStateForCategory('unknown').key, 'idle');
  assert.equal(getCharacterStateForCategory(null).key, 'idle');
  assert.equal(getCharacterState('unknown').key, 'idle');
  assert.equal(getCharacterState(undefined).key, 'idle');
});

test('the required six BMI reactions each have distinct, supportive messages', () => {
  const categories = ['underweight', 'healthy', 'overweight', 'obesity1', 'obesity2', 'obesity3'];
  const messages = new Set(categories.map((key) => getAssistantMessageKey(key)));
  assert.equal(messages.size, categories.length);
  for (const key of categories) {
    const messageKey = getAssistantMessageKey(key);
    assert.notEqual(messageKey, CHARACTER_STATES.idle.messageKey);
    for (const language of ['en', 'km']) {
      const copy = t(language, messageKey);
      assert.notEqual(copy, messageKey, `${language} missing ${messageKey}`);
      assert.ok(copy.length > 60, `${language} ${messageKey} is too short`);
    }
  }
});

test('the idle state remains available before a calculation', () => {
  assert.ok(CHARACTER_STATE_KEYS.includes('idle'));
  assert.equal(getCharacterStateForCategory(null).gesture, 'rest');
});
