import { t } from './i18n.js';
import {
  getAssistantMessageKey,
  getCharacterStateForCategory,
} from './character/state.js';
import { getBodyShapeKey, getBodyShapeLevel } from './character/body-shape.js';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const view = {
  language: 'en',
  theme: 'light',
  categoryKey: null,
  bmi: null,
  heightCm: null,
  weightKg: null,
  age: null,
  gender: 'male',
  onGenderChange: null,
  voiceEnabled: false,
  voiceSupported: false,
  reducedMotion: reducedMotionQuery.matches,
  sceneStatus: 'idle',
  visible: false,
  loadStarted: false,
  initialized: false,
};

let elements = null;
let scene = null;
let observer = null;
let loadStarted = false;

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function currentStateKey() {
  return getCharacterStateForCategory(view.categoryKey).key;
}

function cacheElements() {
  const byId = (id) => document.getElementById(id);
  elements = {
    section: byId('assistant'),
    stage: byId('assistantStage'),
    viewport: byId('assistantViewport'),
    canvas: byId('assistantCanvas'),
    loader: byId('assistantLoader'),
    fallback: byId('assistantFallback'),
    engineBadge: byId('assistantEngineBadge'),
    message: byId('assistantMessage'),
    statePill: byId('assistantStatePill'),
    voiceButton: byId('assistantVoiceBtn'),
    voiceLabel: byId('assistantVoiceLabel'),
    genderGroup: byId('assistantGender'),
    genderButtons: [...document.querySelectorAll('.gender-card')],
    previewMale: byId('assistantPreviewMale'),
    previewFemale: byId('assistantPreviewFemale'),
    shapeBadge: byId('assistantShapeBadge'),
    shapeLabel: byId('assistantShapeLabel'),
    status: byId('assistantStatus'),
    rotateLeft: byId('assistantRotateLeft'),
    rotateRight: byId('assistantRotateRight'),
    zoomIn: byId('assistantZoomIn'),
    zoomOut: byId('assistantZoomOut'),
    reset: byId('assistantReset'),
  };
  return Boolean(elements.section && elements.canvas && elements.stage);
}

function setControlsEnabled(enabled) {
  for (const key of ['rotateLeft', 'rotateRight', 'zoomIn', 'zoomOut', 'reset']) {
    const node = elements[key];
    if (node) node.disabled = !enabled;
  }
}

function bodyShapeLabelKey() {
  return `assistant.shape.${getBodyShapeKey(getBodyShapeLevel(currentStateKey()))}`;
}

function updateShapeDisplay() {
  if (!elements?.shapeLabel) return;
  elements.shapeLabel.textContent = t(view.language, bodyShapeLabelKey());
  if (elements.section) {
    elements.section.dataset.bodyShape = getBodyShapeKey(getBodyShapeLevel(currentStateKey()));
  }
}

function updateGenderUi() {
  if (!elements?.genderButtons?.length) return;
  for (const button of elements.genderButtons) {
    const selected = button.dataset.gender === view.gender;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  }
  if (elements.stage) elements.stage.dataset.gender = view.gender;
}

function updateEngineBadge() {
  const badgeKey = view.sceneStatus === 'ready'
    ? 'assistant.badge3d'
    : view.sceneStatus === 'fallback'
      ? 'assistant.badgeFallback'
      : 'assistant.badgeLoading';
  elements.engineBadge.textContent = t(view.language, badgeKey);
  if (elements.stage) {
    elements.stage.dataset.engine = view.sceneStatus === 'idle' ? 'loading' : view.sceneStatus;
    elements.stage.dataset.character = scene?.model ? 'glb' : 'procedural';
  }
  if (elements.shapeBadge) {
    elements.shapeBadge.hidden = view.sceneStatus === 'fallback';
  }
  if (elements.genderGroup) {
    elements.genderGroup.hidden = view.sceneStatus === 'fallback';
  }
}

function updateContent({ speak = false } = {}) {
  if (!elements) return;
  const stateKey = currentStateKey();
  const messageKey = getAssistantMessageKey(stateKey);
  elements.message.textContent = t(view.language, messageKey);

  if (view.categoryKey) {
    elements.statePill.textContent = t(view.language, `cat.${view.categoryKey}`);
    elements.statePill.className = `assistant-state-pill cat--${view.categoryKey}`;
  } else {
    elements.statePill.textContent = t(view.language, 'assistant.stateIdle');
    elements.statePill.className = 'assistant-state-pill';
  }

  elements.section.dataset.assistantState = stateKey;
  elements.stage.dataset.state = stateKey;
  updateShapeDisplay();
  scene?.updateCharacter({
    gender: view.gender,
    bmi: Number.isFinite(view.bmi) ? view.bmi : 22,
    heightCm: Number.isFinite(view.heightCm) ? view.heightCm : null,
    weightKg: Number.isFinite(view.weightKg) ? view.weightKg : null,
    categoryKey: view.categoryKey,
    animationState: stateKey,
  });

  if (speak && view.voiceEnabled) {
    speakCurrentMessage();
  }
}

function updateVoiceUi() {
  if (!elements?.voiceButton) return;
  const button = elements.voiceButton;
  if (!view.voiceSupported) {
    button.disabled = true;
    button.setAttribute('aria-pressed', 'false');
    button.title = t(view.language, 'assistant.voiceUnsupported');
    elements.voiceLabel.textContent = t(view.language, 'assistant.voiceUnavailable');
    return;
  }

  button.disabled = false;
  button.setAttribute('aria-pressed', String(view.voiceEnabled));
  button.title = t(
    view.language,
    view.voiceEnabled ? 'assistant.voiceOn' : 'assistant.voiceOff',
  );
  elements.voiceLabel.textContent = t(
    view.language,
    view.voiceEnabled ? 'assistant.voiceOn' : 'assistant.voiceOff',
  );
}

function cancelSpeech() {
  if (view.voiceSupported) window.speechSynthesis?.cancel();
}

function speakCurrentMessage() {
  if (!view.voiceSupported || !elements?.message) return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(elements.message.textContent);
  utterance.lang = view.language === 'km' ? 'km-KH' : 'en-US';
  utterance.rate = 0.96;
  utterance.pitch = 1.02;
  utterance.volume = 1;

  const prefix = view.language === 'km' ? 'km' : 'en';
  const voice = synth.getVoices().find((entry) => entry.lang?.toLowerCase().startsWith(prefix));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

function toggleVoice() {
  if (!view.voiceSupported) return;
  view.voiceEnabled = !view.voiceEnabled;
  updateVoiceUi();
  if (view.voiceEnabled) speakCurrentMessage();
  else cancelSpeech();
}

function showFallback(error = null) {
  if (view.sceneStatus === 'fallback') return;
  view.sceneStatus = 'fallback';
  if (scene) {
    try {
      scene.dispose();
    } catch {
      // The renderer may already be lost.
    }
    scene = null;
  }
  elements.loader.hidden = true;
  elements.canvas.hidden = true;
  elements.fallback.hidden = false;
  elements.stage.classList.add('is-fallback');
  elements.stage.classList.remove('is-loading', 'is-ready');
  elements.stage.setAttribute('aria-busy', 'false');
  setControlsEnabled(false);
  updateEngineBadge();
  elements.status.textContent = t(view.language, 'assistant.fallbackAnnounce');
  if (error) {
    elements.fallback.dataset.reason = error.message ?? String(error);
  }
}

function showScene() {
  view.sceneStatus = 'ready';
  elements.loader.hidden = true;
  elements.fallback.hidden = true;
  elements.canvas.hidden = false;
  elements.stage.classList.remove('is-loading', 'is-fallback');
  elements.stage.classList.add('is-ready');
  elements.stage.setAttribute('aria-busy', 'false');
  setControlsEnabled(true);
  updateEngineBadge();
  elements.status.textContent = t(view.language, 'assistant.sceneReady');
  loadGenderPreviews();
}

function onSceneError(error) {
  showFallback(error);
}

async function loadGenderPreviews() {
  if (!elements?.previewMale || !elements?.previewFemale) return;
  elements.genderGroup?.classList.add('is-loading');
  elements.genderGroup?.classList.remove('has-previews', 'is-preview-failed');

  try {
    const { generateGenderPreviews } = await import('./character/preview.js');
    await generateGenderPreviews({
      maleCanvas: elements.previewMale,
      femaleCanvas: elements.previewFemale,
    });
    elements.genderGroup?.classList.remove('is-loading', 'is-preview-failed');
    elements.genderGroup?.classList.add('has-previews');
  } catch {
    elements.genderGroup?.classList.remove('is-loading', 'has-previews');
    elements.genderGroup?.classList.add('is-preview-failed');
  }
}

function bindControls() {
  elements.rotateLeft?.addEventListener('click', () => scene?.rotateBy(-0.22));
  elements.rotateRight?.addEventListener('click', () => scene?.rotateBy(0.22));
  elements.zoomIn?.addEventListener('click', () => scene?.zoomBy(0.35));
  elements.zoomOut?.addEventListener('click', () => scene?.zoomBy(-0.35));
  elements.reset?.addEventListener('click', () => scene?.resetCamera());
  elements.voiceButton?.addEventListener('click', toggleVoice);

  for (const button of elements.genderButtons ?? []) {
    button.addEventListener('click', () => {
      assistant.setGender(button.dataset.gender);
    });
  }
}

function setupObserver() {
  if (!('IntersectionObserver' in window)) {
    view.visible = true;
    startScene();
    return;
  }

  observer = new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting);
    view.visible = visible;
    if (visible) {
      startScene();
      scene?.setActive(!document.hidden);
    } else {
      scene?.setActive(false);
    }
  }, { rootMargin: '380px 0px', threshold: 0.01 });

  observer.observe(elements.section);
}

async function startScene() {
  if (loadStarted || view.sceneStatus === 'fallback') return;
  loadStarted = true;
  view.loadStarted = true;
  view.sceneStatus = 'loading';
  elements.stage.classList.add('is-loading');
  elements.stage.setAttribute('aria-busy', 'true');
  elements.loader.hidden = false;
  elements.fallback.hidden = true;
  setControlsEnabled(false);
  updateEngineBadge();

  if (!canUseWebGL()) {
    showFallback(new Error('WebGL unavailable'));
    return;
  }

  try {
    const { AssistantScene } = await import('./character/assistant-scene.js');
    if (view.sceneStatus === 'fallback') return;
    const nextScene = new AssistantScene(elements.canvas, {
      container: elements.viewport,
      gender: view.gender,
      bmi: Number.isFinite(view.bmi) ? view.bmi : 22,
      onError: onSceneError,
      onModelInfo: (info) => {
        if (elements.stage) elements.stage.dataset.character = info.active ? 'glb' : 'procedural';
      },
    });
    if (!view.visible) nextScene.setActive(false);
    nextScene.setTheme(view.theme);
    nextScene.setReducedMotion(view.reducedMotion);
    scene = nextScene;
    showScene();
    scene.updateCharacter({
      gender: view.gender,
      bmi: Number.isFinite(view.bmi) ? view.bmi : 22,
      heightCm: Number.isFinite(view.heightCm) ? view.heightCm : null,
      weightKg: Number.isFinite(view.weightKg) ? view.weightKg : null,
      categoryKey: view.categoryKey,
      animationState: currentStateKey(),
    });
    scene.setActive(view.visible && !document.hidden);
  } catch {
    showFallback();
  }
}

function handleReducedMotionChange(event) {
  view.reducedMotion = event.matches;
  scene?.setReducedMotion(view.reducedMotion);
}

function handleVisibilityChange() {
  scene?.setActive(view.visible && !document.hidden);
}

export const assistant = {
  init({ language = 'en', theme = 'light', gender = 'male', onGenderChange = null } = {}) {
    if (view.initialized) return;
    if (!cacheElements()) return;
    view.initialized = true;
    view.language = language;
    view.theme = theme;
    view.gender = gender === 'female' ? 'female' : 'male';
    view.onGenderChange = typeof onGenderChange === 'function' ? onGenderChange : null;
    view.voiceSupported = Boolean(
      window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function',
    );

    bindControls();
    updateVoiceUi();
    updateGenderUi();
    updateEngineBadge();
    setupObserver();

    reducedMotionQuery.addEventListener?.('change', handleReducedMotionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    updateContent();
  },

  setLanguage(language) {
    view.language = language === 'km' ? 'km' : 'en';
    cancelSpeech();
    if (!view.initialized) return;
    updateContent();
    updateVoiceUi();
    updateEngineBadge();
  },

  setTheme(theme) {
    view.theme = theme === 'dark' ? 'dark' : 'light';
    scene?.setTheme(view.theme);
  },

  setGender(gender, { notify = true } = {}) {
    const next = gender === 'female' ? 'female' : 'male';
    const changed = next !== view.gender;
    view.gender = next;
    if (view.initialized) updateGenderUi();
    if (changed) {
      scene?.setGender(next);
      if (notify) view.onGenderChange?.(next);
    }
  },

  setResult(result) {
    const previousState = currentStateKey();
    view.categoryKey = result?.categoryKey ?? null;
    view.bmi = Number.isFinite(result?.bmi) ? result.bmi : null;
    view.heightCm = Number.isFinite(result?.heightCm) ? result.heightCm : null;
    view.weightKg = Number.isFinite(result?.weightKg) ? result.weightKg : null;
    view.age = Number.isInteger(result?.age) ? result.age : null;
    const nextState = currentStateKey();
    const categoryChanged = previousState !== nextState;

    if (!view.initialized) return;
    if (!view.categoryKey) cancelSpeech();
    updateContent({ speak: categoryChanged && Boolean(view.categoryKey) });
  },
};
