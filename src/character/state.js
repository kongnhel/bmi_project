export const CHARACTER_STATES = Object.freeze({
  idle: Object.freeze({
    key: 'idle',
    expression: 'warm',
    gesture: 'rest',
    headTilt: -0.02,
    messageKey: 'assistant.message.idle',
  }),
  underweight: Object.freeze({
    key: 'underweight',
    expression: 'caring',
    gesture: 'support',
    headTilt: -0.08,
    messageKey: 'assistant.message.underweight',
  }),
  healthy: Object.freeze({
    key: 'healthy',
    expression: 'happy',
    gesture: 'welcome',
    headTilt: 0.035,
    messageKey: 'assistant.message.healthy',
  }),
  overweight: Object.freeze({
    key: 'overweight',
    expression: 'thoughtful',
    gesture: 'explain',
    headTilt: -0.055,
    messageKey: 'assistant.message.overweight',
  }),
  obesity1: Object.freeze({
    key: 'obesity1',
    expression: 'caring',
    gesture: 'reassure',
    headTilt: -0.065,
    messageKey: 'assistant.message.obesity1',
  }),
  obesity2: Object.freeze({
    key: 'obesity2',
    expression: 'empathetic',
    gesture: 'reassure',
    headTilt: -0.09,
    messageKey: 'assistant.message.obesity2',
  }),
  obesity3: Object.freeze({
    key: 'obesity3',
    expression: 'empathetic',
    gesture: 'support',
    headTilt: -0.1,
    messageKey: 'assistant.message.obesity3',
  }),
});

export const CHARACTER_STATE_KEYS = Object.freeze(Object.keys(CHARACTER_STATES));

export function getCharacterState(key) {
  return CHARACTER_STATES[key] ?? CHARACTER_STATES.idle;
}

export function getCharacterStateForCategory(categoryKey) {
  if (typeof categoryKey === 'string' && Object.prototype.hasOwnProperty.call(CHARACTER_STATES, categoryKey)) {
    return CHARACTER_STATES[categoryKey];
  }
  return CHARACTER_STATES.idle;
}

export function getAssistantMessageKey(stateKey) {
  return getCharacterState(stateKey).messageKey;
}
