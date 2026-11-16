import {
  ACCEPTED_LIMITS,
  LIMITS,
  calculateBmi,
  classifyBmi,
  cmToFtIn,
  formatBmi,
  formatDecimal,
  ftInToCm,
  getHealthyWeightRange,
  getWeightRelation,
  kgToLb,
  lbToKg,
  parseDecimalInput,
  validateAge,
  validateNumber,
} from './bmi.js';
import {
  addHistoryEntry,
  clearStoredData,
  createHistoryEntry,
  isStorageAvailable,
  readPreferences,
  removeHistoryEntry,
  savePreferences,
} from './store.js';
import { t } from './i18n.js';
import {
  formatDate,
  formatHealthyRange,
  formatHeight,
  formatTime,
  formatWeight,
  formatWeightAmount,
  formatWholeNumber,
} from './format.js';
import { BmiGauge } from './gauge.js';
import { buildReportHtml } from './report.js';
import { assistant } from './assistant.js';

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function detectLanguage() {
  const language = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  return language.startsWith('km') ? 'km' : 'en';
}

const state = {
  lang: 'en',
  theme: 'light',
  themeExplicit: false,
  unit: 'metric',
  gender: 'male',
  age: null,
  consent: false,
  history: [],
  lastResult: null,
  lastSignature: '',
  savedSignature: '',
  lastSavedId: null,
  comparisonBase: null,
  touched: new Set(),
  attemptedSubmit: false,
  liveTimer: null,
  toastTimer: null,
  toastActionHandler: null,
  pendingConsentAction: null,
};

const el = {
  form: document.getElementById('bmiForm'),
  weightInput: document.getElementById('weightInput'),
  heightInput: document.getElementById('heightInput'),
  feetInput: document.getElementById('feetInput'),
  inchesInput: document.getElementById('inchesInput'),
  weightUnit: document.getElementById('weightUnit'),
  weightUnitHint: document.getElementById('weightUnitHint'),
  metricHeight: document.getElementById('metricHeight'),
  imperialHeight: document.getElementById('imperialHeight'),
  weightError: document.getElementById('weightError'),
  heightError: document.getElementById('heightError'),
  unitRadios: [...document.querySelectorAll('input[name="unit"]')],
  resetButton: document.getElementById('resetButton'),

  resultEmpty: document.getElementById('resultEmpty'),
  resultContent: document.getElementById('resultContent'),
  resultCategoryPill: document.getElementById('resultCategoryPill'),
  resultCategoryName: document.getElementById('resultCategoryName'),
  bmiValue: document.getElementById('bmiValue'),
  healthyWeightRange: document.getElementById('healthyWeightRange'),
  rangeRelation: document.getElementById('rangeRelation'),
  comparisonCard: document.getElementById('comparisonCard'),
  comparisonText: document.getElementById('comparisonText'),
  comparisonIconUse: document.getElementById('comparisonIconUse'),
  ageWarning: document.getElementById('ageWarning'),
  adviceText: document.getElementById('adviceText'),
  saveResultBtn: document.getElementById('saveResultBtn'),
  saveResultLabel: document.getElementById('saveResultLabel'),
  exportResultBtn: document.getElementById('exportResultBtn'),
  resultLive: document.getElementById('resultLive'),
  gaugeSegments: document.getElementById('gaugeSegments'),
  gaugeNeedle: document.getElementById('gaugeNeedle'),
  categoryCards: [...document.querySelectorAll('[data-category-card]')],

  exportHistoryBtn: document.getElementById('exportHistoryBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  historyCount: document.getElementById('historyCount'),
  historyConsentPanel: document.getElementById('historyConsentPanel'),
  historyConsentTitle: document.getElementById('historyConsentTitle'),
  historyConsentText: document.getElementById('historyConsentText'),
  historyConsentBtn: document.getElementById('historyConsentBtn'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyList: document.getElementById('historyList'),

  languageSelect: document.getElementById('languageSelect'),
  themeToggle: document.getElementById('themeToggle'),
  metaThemeColor: document.getElementById('metaThemeColor'),
  metaDescription: document.querySelector('meta[name="description"]'),
  menuButton: document.getElementById('menuButton'),
  primaryNav: document.getElementById('primaryNav'),
  siteHeader: document.querySelector('.site-header'),
  settingsButtons: [...document.querySelectorAll('.js-open-settings')],

  consentDialog: document.getElementById('consentDialog'),
  consentAllowBtn: document.getElementById('consentAllowBtn'),
  clearHistoryDialog: document.getElementById('clearHistoryDialog'),
  clearHistoryText: document.getElementById('clearHistoryText'),
  clearDataDialog: document.getElementById('clearDataDialog'),
  settingsDialog: document.getElementById('settingsDialog'),
  settingsForm: document.getElementById('settingsForm'),
  ageInput: document.getElementById('ageInput'),
  ageError: document.getElementById('ageError'),
  historyConsentToggle: document.getElementById('historyConsentToggle'),
  clearDataBtn: document.getElementById('clearDataBtn'),

  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage'),
  toastAction: document.getElementById('toastAction'),
  toastClose: document.getElementById('toastClose'),
  printReport: document.getElementById('printReport'),
  copyright: document.getElementById('copyrightNotice'),
};

const prefs = readPreferences();
state.lang = prefs.language ?? detectLanguage();
state.themeExplicit = Boolean(prefs.theme);
state.theme = prefs.theme ?? (systemThemeQuery.matches ? 'dark' : 'light');
state.unit = prefs.unit === 'imperial' ? 'imperial' : 'metric';
state.gender = prefs.gender === 'female' ? 'female' : 'male';
state.age = prefs.age;
state.consent = prefs.historyConsent === true;
state.history = prefs.history;

const gauge = new BmiGauge(el.gaugeSegments, el.gaugeNeedle);
const storage = {
  get available() {
    return isStorageAvailable();
  },
};

/* --------------------------------------------------------------------------
   Static copy, theme and language
   -------------------------------------------------------------------------- */

function applyStaticTranslations() {
  document.documentElement.lang = state.lang;
  document.title = t(state.lang, 'meta.title');
  el.metaDescription?.setAttribute('content', t(state.lang, 'meta.description'));
  el.languageSelect.value = state.lang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = t(state.lang, node.dataset.i18n);
    if (value) node.textContent = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(state.lang, node.dataset.i18nPlaceholder));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(state.lang, node.dataset.i18nAriaLabel));
  });

  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.setAttribute('title', t(state.lang, node.dataset.i18nTitle));
  });

  el.copyright.textContent = t(state.lang, 'footer.rights', {
    year: new Date().getFullYear(),
  });
}

function applyTheme(theme, { remember = false } = {}) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  if (remember) state.themeExplicit = true;
  document.documentElement.dataset.theme = state.theme;
  el.metaThemeColor?.setAttribute(
    'content',
    state.theme === 'dark' ? '#061319' : '#f2f7fb',
  );
  el.themeToggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
  updateThemeControlLabel();
  assistant.setTheme(state.theme);
}

function updateThemeControlLabel() {
  el.themeToggle.setAttribute(
    'aria-label',
    t(state.lang, state.theme === 'dark' ? 'theme.toLight' : 'theme.toDark'),
  );
}

function applyLanguage(language, { remember = true } = {}) {
  state.lang = language === 'km' ? 'km' : 'en';
  applyStaticTranslations();
  updateThemeControlLabel();
  assistant.setLanguage(state.lang);
  syncMenuButton();
  syncUnitUi();
  refreshFieldErrors();
  if (state.lastResult) {
    renderResultView(state.lastResult, { animate: false, announce: false });
  }
  renderHistory();
  updateExportButtons();
  updateDynamicDialogCopy();

  if (remember) persistPreferences();
}

function persistPreferences(showError = false) {
  const ok = savePreferences({
    language: state.lang,
    theme: state.themeExplicit ? state.theme : null,
    unit: state.unit,
    gender: state.gender,
    age: state.age,
    historyConsent: state.consent,
    history: state.history,
  });
  if (!ok && showError) {
    showToast(t(state.lang, 'toast.storageUnavailable'));
  }
  return ok;
}

/* --------------------------------------------------------------------------
   Unit UI
   -------------------------------------------------------------------------- */

function syncUnitUi() {
  const imperial = state.unit === 'imperial';
  el.unitRadios.forEach((radio) => {
    radio.checked = radio.value === state.unit;
  });
  el.metricHeight.hidden = imperial;
  el.imperialHeight.hidden = !imperial;
  el.weightUnit.textContent = imperial ? 'lb' : 'kg';
  el.weightUnitHint.textContent = t(
    state.lang,
    imperial ? 'calc.weightUnitLabelImperial' : 'calc.weightUnitLabel',
  );
  el.weightInput.setAttribute(
    'placeholder',
    t(state.lang, imperial ? 'calc.weightPlaceholderImperial' : 'calc.weightPlaceholder'),
  );
  el.heightInput.setAttribute('placeholder', t(state.lang, 'calc.heightPlaceholder'));
  el.heightInput.setAttribute('aria-label', t(state.lang, 'calc.heightUnitLabel'));
  el.feetInput.setAttribute('placeholder', t(state.lang, 'calc.feetPlaceholder'));
  el.inchesInput.setAttribute('placeholder', t(state.lang, 'calc.inchesPlaceholder'));
  el.exportResultBtn.title = t(state.lang, 'result.exportHint');
}

function formatInputNumber(value) {
  const rounded = Number(value.toFixed(1));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function switchUnit(nextUnit) {
  if (nextUnit === state.unit) return;

  if (nextUnit === 'imperial') {
    const weightKg = parseDecimalInput(el.weightInput.value);
    if (weightKg !== null) {
      el.weightInput.value = formatInputNumber(kgToLb(weightKg));
    }

    const heightCm = parseDecimalInput(el.heightInput.value);
    if (heightCm !== null) {
      const converted = cmToFtIn(heightCm);
      el.feetInput.value = String(converted.feet);
      el.inchesInput.value = formatInputNumber(converted.inches);
    } else {
      el.feetInput.value = '';
      el.inchesInput.value = '';
    }
  } else {
    const weightLb = parseDecimalInput(el.weightInput.value);
    if (weightLb !== null) {
      el.weightInput.value = formatInputNumber(lbToKg(weightLb));
    }

    const feet = parseDecimalInput(el.feetInput.value);
    const inches = el.inchesInput.value.trim()
      ? parseDecimalInput(el.inchesInput.value)
      : 0;
    if (feet !== null || inches !== null) {
      el.heightInput.value = formatInputNumber(ftInToCm(feet ?? 0, inches ?? 0));
    } else {
      el.heightInput.value = '';
    }
  }

  state.unit = nextUnit === 'imperial' ? 'imperial' : 'metric';
  state.touched.clear();
  state.attemptedSubmit = false;
  hideAllFieldErrors();
  syncUnitUi();
  persistPreferences();
  scheduleLiveUpdate(0);
}

/* --------------------------------------------------------------------------
   Validation and live calculation
   -------------------------------------------------------------------------- */

function rangeError(field, min, max, unit) {
  return {
    key: `error.${field}Range`,
    vars: {
      min: formatWholeNumber(min),
      max: formatWholeNumber(max),
      unit,
    },
  };
}

function evaluateForm() {
  const errors = { weight: null, height: null };
  const imperial = state.unit === 'imperial';
  let weightKg = null;
  let heightCm = null;

  const displayWeightLimits = imperial ? LIMITS.imperial.weight : LIMITS.metric.weight;
  const acceptedWeight = imperial
    ? {
        min: displayWeightLimits.min,
        max: kgToLb(ACCEPTED_LIMITS.weightKg.max),
      }
    : ACCEPTED_LIMITS.weightKg;
  const weight = validateNumber(el.weightInput.value, acceptedWeight);
  if (weight.status === 'empty') {
    errors.weight = { key: 'error.weightRequired' };
  } else if (weight.status === 'invalid') {
    errors.weight = { key: 'error.weightInvalid' };
  } else if (weight.status === 'below' || weight.status === 'above') {
    errors.weight = rangeError(
      'weight',
      displayWeightLimits.min,
      displayWeightLimits.max,
      displayWeightLimits.unit,
    );
  } else {
    weightKg = imperial ? lbToKg(weight.value) : weight.value;
  }

  if (imperial) {
    const feetRaw = el.feetInput.value.trim();
    const inchesRaw = el.inchesInput.value.trim();

    if (!feetRaw && !inchesRaw) {
      errors.height = { key: 'error.heightRequired', target: 'feet' };
    } else if (!feetRaw) {
      errors.height = { key: 'error.heightPartsRequired', target: 'feet' };
    } else {
      const feet = parseDecimalInput(feetRaw);
      const inches = inchesRaw ? parseDecimalInput(inchesRaw) : 0;

      if (feet === null) {
        errors.height = { key: 'error.heightInvalid', target: 'feet' };
      } else if (!Number.isInteger(feet) || feet < LIMITS.imperial.feet.min || feet > LIMITS.imperial.feet.max) {
        errors.height = {
          key: 'error.feetInvalid',
          vars: { min: LIMITS.imperial.feet.min, max: LIMITS.imperial.feet.max },
          target: 'feet',
        };
      } else if (inches === null) {
        errors.height = { key: 'error.heightInvalid', target: 'inches' };
      } else if (inches < LIMITS.imperial.inches.min || inches > LIMITS.imperial.inches.max) {
        errors.height = {
          key: 'error.inchesInvalid',
          vars: { min: LIMITS.imperial.inches.min, max: LIMITS.imperial.inches.max },
          target: 'inches',
        };
      } else {
        const totalCm = ftInToCm(feet, inches);
        if (
          totalCm < ACCEPTED_LIMITS.heightCm.min
          || totalCm > ACCEPTED_LIMITS.heightCm.max
        ) {
          errors.height = { key: 'error.heightRangeImperial', target: 'inches' };
        } else {
          heightCm = totalCm;
        }
      }
    }
  } else {
    const height = validateNumber(el.heightInput.value, ACCEPTED_LIMITS.heightCm);
    if (height.status === 'empty') {
      errors.height = { key: 'error.heightRequired', target: 'height' };
    } else if (height.status === 'invalid') {
      errors.height = { key: 'error.heightInvalid', target: 'height' };
    } else if (height.status === 'below' || height.status === 'above') {
      errors.height = {
        ...rangeError('height', LIMITS.metric.height.min, LIMITS.metric.height.max, 'cm'),
        target: 'height',
      };
    } else {
      heightCm = height.value;
    }
  }

  return {
    ok: !errors.weight && !errors.height && weightKg !== null && heightCm !== null,
    weightKg,
    heightCm,
    errors,
  };
}

function errorText(error) {
  return error ? t(state.lang, error.key, error.vars) : '';
}

function fieldErrorVisible(field) {
  return state.attemptedSubmit || state.touched.has(field);
}

function setErrorState({ errorElement, error, visible, shells, inputs }) {
  const hasError = Boolean(error) && visible;
  errorElement.hidden = !hasError;
  errorElement.textContent = hasError ? errorText(error) : '';
  shells.forEach((shell) => shell?.classList.toggle('is-invalid', hasError));
  inputs.forEach((input) => {
    if (hasError) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

function updateFieldErrors(evaluation) {
  setErrorState({
    errorElement: el.weightError,
    error: evaluation.errors.weight,
    visible: fieldErrorVisible('weight'),
    shells: [el.weightInput.closest('.input-shell')],
    inputs: [el.weightInput],
  });

  const heightShells = state.unit === 'metric'
    ? [el.heightInput.closest('.input-shell')]
    : [
        el.feetInput.closest('.input-shell'),
        el.inchesInput.closest('.input-shell'),
      ];
  const heightInputs = state.unit === 'metric'
    ? [el.heightInput]
    : [el.feetInput, el.inchesInput];

  setErrorState({
    errorElement: el.heightError,
    error: evaluation.errors.height,
    visible: fieldErrorVisible('height'),
    shells: heightShells,
    inputs: heightInputs,
  });
}

function hideAllFieldErrors() {
  [el.weightError, el.heightError].forEach((node) => {
    node.hidden = true;
    node.textContent = '';
  });
  [el.weightInput, el.heightInput, el.feetInput, el.inchesInput].forEach((input) => {
    input.removeAttribute('aria-invalid');
    input.closest('.input-shell')?.classList.remove('is-invalid');
  });
}

function refreshFieldErrors() {
  const evaluation = evaluateForm();
  updateFieldErrors(evaluation);
}

function scheduleLiveUpdate(delay = 180) {
  window.clearTimeout(state.liveTimer);
  state.liveTimer = window.setTimeout(() => {
    const evaluation = evaluateForm();
    updateFieldErrors(evaluation);
    if (evaluation.ok) {
      commitResult(evaluation, { animate: true, announce: true });
    } else {
      clearResultView();
    }
  }, delay);
}

function signatureFor(evaluation) {
  return `${evaluation.weightKg.toFixed(1)}|${evaluation.heightCm.toFixed(1)}`;
}

function commitResult(evaluation, { animate = true, announce = false } = {}) {
  const bmi = calculateBmi(evaluation.weightKg, evaluation.heightCm);
  const signature = signatureFor(evaluation);
  const isNew = signature !== state.lastSignature;

  if (isNew) {
    state.comparisonBase = state.history[0] ?? null;
    state.lastSignature = signature;
  }

  const result = {
    bmi,
    categoryKey: classifyBmi(bmi),
    weightKg: evaluation.weightKg,
    heightCm: evaluation.heightCm,
  };
  state.lastResult = result;
  renderResultView(result, { animate: isNew || animate, announce });
}

function clearResultView() {
  state.lastResult = null;
  state.lastSignature = '';
  state.comparisonBase = null;
  el.resultContent.hidden = true;
  el.resultEmpty.hidden = false;
  el.exportResultBtn.disabled = true;
  el.saveResultBtn.disabled = true;
  el.saveResultLabel.textContent = t(state.lang, 'result.save');
  el.bmiValue.textContent = '--';
  el.resultCategoryPill.textContent = '';
  el.resultCategoryPill.className = 'category-pill';
  el.resultCategoryName.textContent = '';
  el.healthyWeightRange.textContent = '—';
  el.rangeRelation.textContent = '';
  el.comparisonCard.hidden = true;
  el.comparisonText.textContent = '';
  el.ageWarning.hidden = true;
  el.adviceText.textContent = '';
  gauge.reset();
  updateCategoryHighlight(null);
  el.resultLive.textContent = '';
  assistant.setResult(null);
}

function focusFirstInvalid(evaluation) {
  if (evaluation.errors.weight) {
    el.weightInput.focus();
    return;
  }
  if (evaluation.errors.height) {
    const target = evaluation.errors.height.target;
    if (target === 'inches') el.inchesInput.focus();
    else if (target === 'feet') el.feetInput.focus();
    else el.heightInput.focus();
  }
}

/* --------------------------------------------------------------------------
   Result rendering
   -------------------------------------------------------------------------- */

function updateCategoryHighlight(activeKey) {
  el.categoryCards.forEach((card) => {
    const active = card.dataset.categoryCard === activeKey;
    card.classList.toggle('is-active', active);
    const badge = card.querySelector('.category-you');
    if (badge) badge.hidden = !active;
    if (active) card.setAttribute('aria-current', 'true');
    else card.removeAttribute('aria-current');
  });
}

function updateSaveButton() {
  const isSaved = Boolean(state.lastResult) && state.lastSignature === state.savedSignature;
  el.saveResultLabel.textContent = t(state.lang, isSaved ? 'result.saved' : 'result.save');
  el.saveResultBtn.disabled = !state.lastResult || isSaved;
}

function renderResultView(result, { animate = false, announce = false } = {}) {
  const categoryLabel = t(state.lang, `cat.${result.categoryKey}`);
  const healthyRange = getHealthyWeightRange(result.heightCm);
  const relation = getWeightRelation(result.weightKg, result.heightCm, result.bmi);

  el.resultEmpty.hidden = true;
  el.resultContent.hidden = false;
  el.resultCategoryPill.className = `category-pill cat--${result.categoryKey}`;
  el.resultCategoryPill.textContent = categoryLabel;
  el.bmiValue.textContent = formatBmi(result.bmi);
  el.resultCategoryName.textContent = t(state.lang, `cat.${result.categoryKey}.desc`);
  el.healthyWeightRange.textContent = formatHealthyRange(
    healthyRange.minKg,
    healthyRange.maxKg,
    state.unit,
  );

  if (relation.direction === 'within') {
    el.rangeRelation.textContent = t(state.lang, 'result.within');
  } else {
    const amount = formatWeightAmount(relation.amountKg, state.unit);
    el.rangeRelation.textContent = t(
      state.lang,
      relation.direction === 'below' ? 'result.below' : 'result.above',
      { amount: amount.amount, unit: amount.unit },
    );
  }

  renderComparison(result, categoryLabel);

  el.ageWarning.hidden = !(Number.isInteger(state.age) && state.age < 20);
  el.adviceText.textContent = t(state.lang, `cat.${result.categoryKey}.advice`);
  el.exportResultBtn.disabled = false;
  gauge.update(result.bmi, { animate });
  updateCategoryHighlight(result.categoryKey);
  updateSaveButton();

  assistant.setResult({
    categoryKey: result.categoryKey,
    bmi: result.bmi,
    age: state.age,
  });

  if (announce) {
    el.resultLive.textContent = '';
    window.requestAnimationFrame(() => {
      el.resultLive.textContent = t(state.lang, 'result.live', {
        bmi: formatBmi(result.bmi),
        category: categoryLabel,
      });
    });
  }
}

function renderComparison(result, categoryLabel) {
  const base = state.comparisonBase;
  if (!base) {
    el.comparisonCard.hidden = true;
    return;
  }

  const delta = result.bmi - base.bmi;
  const same = Math.abs(delta) < 0.05;
  const date = formatDate(base.ts, state.lang);
  let text;

  if (same) {
    text = t(state.lang, 'result.compareSame', { date });
  } else {
    text = t(
      state.lang,
      delta < 0 ? 'result.compareLower' : 'result.compareHigher',
      { delta: formatDecimal(Math.abs(delta), 1), date },
    );
  }

  if (base.categoryKey !== result.categoryKey) {
    text += ` ${t(state.lang, 'result.categoryChanged', {
      from: t(state.lang, `cat.${base.categoryKey}`),
      to: categoryLabel,
    })}`;
  }

  el.comparisonText.textContent = text;
  const icon = same ? '#icon-check' : delta < 0 ? '#icon-trend-down' : '#icon-trend-up';
  el.comparisonIconUse.setAttribute('href', icon);
  el.comparisonCard.hidden = false;
}

/* --------------------------------------------------------------------------
   History
   -------------------------------------------------------------------------- */

function updateExportButtons() {
  el.exportHistoryBtn.disabled = state.history.length === 0;
  el.clearHistoryBtn.disabled = state.history.length === 0;
  el.exportResultBtn.disabled = !state.lastResult;
}

function renderHistory() {
  el.historyCount.textContent = state.history.length
    ? t(state.lang, 'history.count', { count: state.history.length })
    : '';
  el.historyConsentPanel.hidden = state.consent;

  if (!state.consent) {
    const hasHistory = state.history.length > 0;
    el.historyConsentTitle.textContent = t(
      state.lang,
      hasHistory ? 'history.pausedTitle' : 'history.enableTitle',
    );
    el.historyConsentText.textContent = t(
      state.lang,
      hasHistory ? 'history.pausedText' : 'history.enableText',
    );
    el.historyConsentBtn.textContent = t(
      state.lang,
      hasHistory ? 'history.reEnable' : 'history.enable',
    );
  }

  el.historyEmpty.hidden = !(state.consent && state.history.length === 0);
  el.historyList.hidden = state.history.length === 0;
  el.historyList.replaceChildren(
    ...state.history.map((entry, index) => createHistoryItem(entry, index)),
  );
  updateExportButtons();
}

function createHistoryItem(entry, index) {
  const item = document.createElement('li');
  item.className = 'history-item';
  item.innerHTML = `
    <div class="history-bmi" aria-hidden="true">
      <strong></strong>
      <span>BMI</span>
    </div>
    <div class="history-body">
      <div class="history-line">
        <span class="category-pill"></span>
        <span class="latest-badge"></span>
      </div>
      <p class="history-meta">
        <time></time>
        <span class="dot" aria-hidden="true">·</span>
        <span class="history-weight"></span>
        <span class="dot" aria-hidden="true">·</span>
        <span class="history-height"></span>
      </p>
    </div>
    <button class="icon-button history-delete" type="button">
      <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
    </button>`;

  item.querySelector('.history-bmi strong').textContent = formatBmi(entry.bmi);
  const pill = item.querySelector('.category-pill');
  pill.classList.add(`cat--${entry.categoryKey}`);
  pill.textContent = t(state.lang, `cat.${entry.categoryKey}`);
  const latest = item.querySelector('.latest-badge');
  latest.textContent = t(state.lang, 'history.latest');
  if (index > 0) latest.hidden = true;

  const time = item.querySelector('time');
  time.dateTime = new Date(entry.ts).toISOString();
  time.textContent = formatDate(entry.ts, state.lang);
  time.title = formatTime(entry.ts, state.lang);
  item.querySelector('.history-weight').textContent = formatWeight(entry.weightKg, state.unit);
  item.querySelector('.history-height').textContent = formatHeight(entry.heightCm, state.unit);

  const deleteButton = item.querySelector('.history-delete');
  deleteButton.dataset.id = entry.id;
  deleteButton.setAttribute(
    'aria-label',
    t(state.lang, 'history.deleteAria', {
      date: formatDate(entry.ts, state.lang),
      bmi: formatBmi(entry.bmi),
    }),
  );

  return item;
}

function requestSaveResult() {
  if (!state.lastResult) return;
  if (!storage.available) {
    showToast(t(state.lang, 'error.storage'));
    return;
  }
  if (!state.consent) {
    openConsentDialog('save');
    return;
  }
  saveCurrentResult();
}

function saveCurrentResult() {
  if (!state.lastResult) return;
  if (state.lastSignature === state.savedSignature) return;
  if (!storage.available) {
    showToast(t(state.lang, 'error.storage'));
    return;
  }

  const entry = createHistoryEntry(state.lastResult, state.age);
  const previous = state.history;
  state.history = addHistoryEntry(state.history, entry);

  if (!persistPreferences(true)) {
    state.history = previous;
    return;
  }

  state.savedSignature = state.lastSignature;
  state.lastSavedId = entry.id;
  renderHistory();
  updateSaveButton();
  showToast(t(state.lang, 'toast.saved'));
}

function deleteHistoryEntry(id) {
  const index = state.history.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const removed = state.history[index];
  const previous = state.history;
  state.history = removeHistoryEntry(state.history, id);

  if (!persistPreferences(true)) {
    state.history = previous;
    return;
  }

  if (state.lastSavedId === id) {
    state.lastSavedId = null;
    state.savedSignature = '';
  }
  if (state.comparisonBase?.id === id) {
    state.comparisonBase = state.history[0] ?? null;
  }

  renderHistory();
  if (state.lastResult) {
    renderResultView(state.lastResult, { animate: false, announce: false });
  } else {
    updateSaveButton();
  }

  showToast(t(state.lang, 'history.deleted'), {
    actionLabel: t(state.lang, 'history.undo'),
    onAction: () => {
      const restored = addHistoryEntry(state.history, removed);
      const beforeUndo = state.history;
      state.history = restored;
      if (!persistPreferences(true)) {
        state.history = beforeUndo;
        return;
      }

      const restoredSignature = `${removed.weightKg.toFixed(1)}|${removed.heightCm.toFixed(1)}`;
      if (state.lastResult && restoredSignature === state.lastSignature) {
        state.savedSignature = state.lastSignature;
        state.lastSavedId = removed.id;
      }
      renderHistory();
      updateSaveButton();
      showToast(t(state.lang, 'history.restored'));
    },
  });
}

function clearAllHistory() {
  const previous = state.history;
  state.history = [];
  state.savedSignature = '';
  state.lastSavedId = null;
  state.comparisonBase = null;

  if (state.lastResult) {
    renderResultView(state.lastResult, { animate: false, announce: false });
  }
  renderHistory();

  if (!persistPreferences(true)) {
    state.history = previous;
    renderHistory();
    return;
  }

  showToast(t(state.lang, 'history.cleared'));
}

/* --------------------------------------------------------------------------
   Print / PDF report
   -------------------------------------------------------------------------- */

function populatePrintReport() {
  const html = buildReportHtml({
    language: state.lang,
    unit: state.unit,
    result: state.lastResult,
    history: state.history,
    age: state.age,
  });

  el.printReport.innerHTML = html;
  document.body.classList.toggle('has-print-report', Boolean(html));
  return Boolean(html);
}

function exportReport() {
  if (!state.lastResult && state.history.length === 0) {
    showToast(t(state.lang, 'toast.exportUnavailable'));
    return;
  }
  if (!populatePrintReport()) {
    showToast(t(state.lang, 'toast.exportUnavailable'));
    return;
  }
  window.print();
}

/* --------------------------------------------------------------------------
   Dialogs, consent and settings
   -------------------------------------------------------------------------- */

function openDialog(dialog) {
  dialog.returnValue = 'cancel';
  dialog.showModal();
}

function openConsentDialog(action) {
  if (!storage.available) {
    showToast(t(state.lang, 'error.storage'));
    return;
  }
  state.pendingConsentAction = action;
  updateConsentButtonLabel();
  openDialog(el.consentDialog);
}

function updateConsentButtonLabel() {
  el.consentAllowBtn.textContent = t(
    state.lang,
    state.pendingConsentAction === 'save' ? 'history.allowAndSave' : 'history.allow',
  );
}

function openSettingsDialog() {
  el.ageInput.value = state.age ?? '';
  el.historyConsentToggle.checked = state.consent;
  hideAgeError();
  openDialog(el.settingsDialog);
}

function hideAgeError() {
  el.ageError.hidden = true;
  el.ageError.textContent = '';
  el.ageInput.closest('.input-shell')?.classList.remove('is-invalid');
  el.ageInput.removeAttribute('aria-invalid');
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const age = validateAge(el.ageInput.value);

  if (age.status !== 'valid' && age.status !== 'empty') {
    el.ageError.hidden = false;
    el.ageError.textContent = t(state.lang, 'error.age', {
      min: LIMITS.age.min,
      max: LIMITS.age.max,
    });
    el.ageInput.closest('.input-shell')?.classList.add('is-invalid');
    el.ageInput.setAttribute('aria-invalid', 'true');
    el.ageInput.focus();
    return;
  }

  hideAgeError();
  const previousAge = state.age;
  const previousConsent = state.consent;
  state.age = age.status === 'valid' ? age.value : null;
  state.consent = el.historyConsentToggle.checked;

  if (!persistPreferences(true)) {
    state.age = previousAge;
    state.consent = previousConsent;
    return;
  }

  el.settingsDialog.close();
  renderHistory();
  if (state.lastResult) {
    renderResultView(state.lastResult, { animate: false, announce: false });
  }
  updateSaveButton();

  if (previousConsent !== state.consent) {
    showToast(t(state.lang, state.consent ? 'toast.historyEnabled' : 'toast.historyDisabled'));
  } else {
    showToast(t(state.lang, 'settings.saved'));
  }
}

function resetAfterDataClear() {
  el.form.reset();
  state.lang = detectLanguage();
  state.gender = 'male';
  state.themeExplicit = false;
  state.theme = systemThemeQuery.matches ? 'dark' : 'light';
  state.unit = 'metric';
  state.age = null;
  state.consent = false;
  state.history = [];
  state.lastResult = null;
  state.lastSignature = '';
  state.savedSignature = '';
  state.lastSavedId = null;
  state.comparisonBase = null;
  state.touched.clear();
  state.attemptedSubmit = false;

  hideAllFieldErrors();
  applyTheme(state.theme);
  applyLanguage(state.lang, { remember: false });
  assistant.setGender('male', { notify: false });
  clearResultView();
  syncUnitUi();
  renderHistory();
  updateSaveButton();
  updateExportButtons();
}

function clearAllData() {
  const cleared = clearStoredData();
  resetAfterDataClear();
  showToast(t(state.lang, cleared ? 'data.cleared' : 'error.storage'));
}

function updateDynamicDialogCopy() {
  updateConsentButtonLabel();
  el.clearHistoryText.textContent = t(state.lang, 'history.clearText', {
    count: state.history.length,
  });
}

function openClearHistoryDialog() {
  if (state.history.length === 0) return;
  updateDynamicDialogCopy();
  openDialog(el.clearHistoryDialog);
}

function showToast(message, { actionLabel = '', onAction = null, duration = 5000 } = {}) {
  window.clearTimeout(state.toastTimer);
  el.toastMessage.textContent = message;
  state.toastActionHandler = onAction;

  if (actionLabel && onAction) {
    el.toastAction.hidden = false;
    el.toastAction.textContent = actionLabel;
  } else {
    el.toastAction.hidden = true;
    el.toastAction.textContent = '';
    state.toastActionHandler = null;
  }

  el.toast.hidden = false;
  state.toastTimer = window.setTimeout(hideToast, duration);
}

function hideToast() {
  window.clearTimeout(state.toastTimer);
  state.toastTimer = null;
  el.toast.hidden = true;
}

function setMenuOpen(open, { focusButton = false } = {}) {
  const isOpen = Boolean(open);
  el.primaryNav.classList.toggle('is-open', isOpen);
  el.menuButton.setAttribute('aria-expanded', String(isOpen));
  syncMenuButton();
  if (isOpen) {
    el.primaryNav.querySelector('a, button')?.focus();
  } else if (focusButton) {
    el.menuButton.focus();
  }
}

function syncMenuButton() {
  const expanded = el.menuButton.getAttribute('aria-expanded') === 'true';
  el.menuButton.setAttribute(
    'aria-label',
    t(state.lang, expanded ? 'nav.menuClose' : 'nav.menuOpen'),
  );
}

/* --------------------------------------------------------------------------
   Events
   -------------------------------------------------------------------------- */

function inputField(target) {
  if (target === el.weightInput) return 'weight';
  if (target === el.heightInput || target === el.feetInput || target === el.inchesInput) {
    return 'height';
  }
  return null;
}

function bindEvents() {
  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    window.clearTimeout(state.liveTimer);
    state.attemptedSubmit = true;
    state.touched.add('weight');
    state.touched.add('height');

    const evaluation = evaluateForm();
    updateFieldErrors(evaluation);
    if (!evaluation.ok) {
      focusFirstInvalid(evaluation);
      return;
    }
    commitResult(evaluation, { animate: true, announce: true });
  });

  el.form.addEventListener('input', (event) => {
    const field = inputField(event.target);
    if (!field) return;
    if (fieldErrorVisible(field)) {
      updateFieldErrors(evaluateForm());
    }
    scheduleLiveUpdate();
  });

  el.form.addEventListener('focusout', (event) => {
    const field = inputField(event.target);
    if (!field) return;
    state.touched.add(field);
    updateFieldErrors(evaluateForm());
    scheduleLiveUpdate(0);
  });

  el.unitRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) switchUnit(radio.value);
    });
  });

  el.resetButton.addEventListener('click', () => {
    window.clearTimeout(state.liveTimer);
    el.form.reset();
    state.touched.clear();
    state.attemptedSubmit = false;
    state.lastSignature = '';
    state.savedSignature = '';
    state.lastSavedId = null;
    state.comparisonBase = null;
    hideAllFieldErrors();
    clearResultView();
    syncUnitUi();
    updateSaveButton();
    updateExportButtons();
    el.weightInput.focus();
  });

  el.languageSelect.addEventListener('change', () => {
    hideToast();
    applyLanguage(el.languageSelect.value);
  });

  el.themeToggle.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark', { remember: true });
    persistPreferences();
  });

  systemThemeQuery.addEventListener('change', (event) => {
    if (!state.themeExplicit) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });

  el.menuButton.addEventListener('click', () => {
    const expanded = el.menuButton.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!expanded);
  });

  el.primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (
      el.menuButton.getAttribute('aria-expanded') === 'true'
      && !el.siteHeader.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && el.menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false, { focusButton: true });
    }
  });

  const navQuery = window.matchMedia('(max-width: 980px)');
  navQuery.addEventListener('change', (event) => {
    if (!event.matches) setMenuOpen(false);
  });

  el.settingsButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMenuOpen(false);
      openSettingsDialog();
    });
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      button.closest('dialog')?.close('cancel');
    });
  });

  document.querySelectorAll('dialog.modal').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close('cancel');
    });
  });

  el.consentDialog.addEventListener('close', () => {
    const action = state.pendingConsentAction;
    const allowed = el.consentDialog.returnValue === 'allow';
    state.pendingConsentAction = null;
    updateConsentButtonLabel();

    if (!allowed) return;

    state.consent = true;
    renderHistory();
    if (!persistPreferences(true)) {
      state.consent = false;
      renderHistory();
      return;
    }

    if (action === 'save') {
      saveCurrentResult();
    } else {
      showToast(t(state.lang, 'toast.historyEnabled'));
    }
  });

  el.clearHistoryDialog.addEventListener('close', () => {
    if (el.clearHistoryDialog.returnValue === 'confirm') {
      clearAllHistory();
    }
  });

  el.clearDataDialog.addEventListener('close', () => {
    if (el.clearDataDialog.returnValue === 'confirm') {
      clearAllData();
    }
  });

  el.saveResultBtn.addEventListener('click', requestSaveResult);
  el.exportResultBtn.addEventListener('click', exportReport);
  el.exportHistoryBtn.addEventListener('click', exportReport);
  el.clearHistoryBtn.addEventListener('click', openClearHistoryDialog);
  el.historyConsentBtn.addEventListener('click', () => openConsentDialog('enable'));

  el.historyList.addEventListener('click', (event) => {
    const button = event.target.closest('.history-delete');
    const id = button?.dataset.id;
    if (id) deleteHistoryEntry(id);
  });

  el.settingsForm.addEventListener('submit', handleSettingsSubmit);
  el.ageInput.addEventListener('input', hideAgeError);

  el.clearDataBtn.addEventListener('click', () => {
    el.settingsDialog.close();
    openDialog(el.clearDataDialog);
  });

  el.toastAction.addEventListener('click', () => {
    const action = state.toastActionHandler;
    hideToast();
    if (action) action();
  });

  el.toastClose.addEventListener('click', hideToast);

  window.addEventListener('beforeprint', () => {
    if (state.lastResult || state.history.length > 0) {
      populatePrintReport();
    } else {
      el.printReport.innerHTML = '';
      document.body.classList.remove('has-print-report');
    }
  });
}

/* --------------------------------------------------------------------------
   Initialisation
   -------------------------------------------------------------------------- */

function init() {
  assistant.init({
    language: state.lang,
    theme: state.theme,
    gender: state.gender,
    onGenderChange: (gender) => {
      state.gender = gender;
      persistPreferences();
    },
  });
  applyTheme(state.theme);
  syncUnitUi();
  bindEvents();
  applyLanguage(state.lang, { remember: false });
  clearResultView();
  renderHistory();
  updateSaveButton();
  updateExportButtons();
}

init();


