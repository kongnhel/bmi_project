import { t } from './i18n.js';
import {
  getAssistantMessageKey,
  getCharacterStateForCategory,
} from './character/state.js';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const view = {
  language: 'en',
  theme: 'light',
  categoryKey: null,
  bmi: null,
  age: null,
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
  scene?.setCharacterState(stateKey);

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
}

function onSceneError(error) {
  showFallback(error);
}

function bindControls() {
  elements.rotateLeft?.addEventListener('click', () => scene?.rotateBy(-0.22));
  elements.rotateRight?.addEventListener('click', () => scene?.rotateBy(0.22));
  elements.zoomIn?.addEventListener('click', () => scene?.zoomBy(0.35));
  elements.zoomOut?.addEventListener('click', () => scene?.zoomBy(-0.35));
  elements.reset?.addEventListener('click', () => scene?.resetCamera());
  elements.voiceButton?.addEventListener('click', toggleVoice);
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
    scene.setCharacterState(currentStateKey());
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
  init({ language = 'en', theme = 'light' } = {}) {
    if (view.initialized) return;
    if (!cacheElements()) return;
    view.initialized = true;
    view.language = language;
    view.theme = theme;
    view.voiceSupported = Boolean(
      window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function',
    );

    bindControls();
    updateVoiceUi();
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

  setResult(result) {
    const previousState = currentStateKey();
    view.categoryKey = result?.categoryKey ?? null;
    view.bmi = Number.isFinite(result?.bmi) ? result.bmi : null;
    view.age = Number.isInteger(result?.age) ? result.age : null;
    const nextState = currentStateKey();
    const categoryChanged = previousState !== nextState;

    if (!view.initialized) return;
    if (!view.categoryKey) cancelSpeech();
    updateContent({ speak: categoryChanged && Boolean(view.categoryKey) });
  },
};
