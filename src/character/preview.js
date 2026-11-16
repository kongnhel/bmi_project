import * as THREE from '../../vendor/three/three.module.min.js';
import { createProceduralHuman } from './human.js';

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 200;

/**
 * Renders two small, genuine Three.js portraits for the character picker.
 * A single temporary WebGL context is used, then disposed immediately.
 */
export async function generateGenderPreviews({ maleCanvas, femaleCanvas }) {
  if (!maleCanvas || !femaleCanvas) throw new Error('Missing preview canvases.');

  await new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(resolve, { timeout: 800 });
    } else {
      window.setTimeout(resolve, 60);
    }
  });

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = PREVIEW_WIDTH;
  renderCanvas.height = PREVIEW_HEIGHT;
  const renderer = new THREE.WebGLRenderer({
    canvas: renderCanvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(PREVIEW_WIDTH, PREVIEW_HEIGHT, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, PREVIEW_WIDTH / PREVIEW_HEIGHT, 0.05, 10);
  camera.position.set(0.2, 1.5, 2.18);
  camera.lookAt(0, 1.4, 0);

  const hemisphere = new THREE.HemisphereLight(0xf6fbff, 0x8ea4a8, 1.3);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xfff2df, 2.4);
  key.position.set(2.1, 3.2, 3.1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb7e6ff, 0.8);
  fill.position.set(-2.8, 1.9, 2.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x5eead4, 1.15);
  rim.position.set(-0.4, 2.6, -2.8);
  scene.add(rim);

  let human = null;
  try {
    for (const [gender, targetCanvas] of [
      ['male', maleCanvas],
      ['female', femaleCanvas],
    ]) {
      human = createProceduralHuman({ gender, initialShape: 0 });
      scene.add(human.group);
      renderer.render(scene, camera);
      drawPreview(targetCanvas, renderer.domElement);
      scene.remove(human.group);
      human.dispose();
      human = null;
    }
  } finally {
    if (human) {
      scene.remove(human.group);
      human.dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderCanvas.width = 1;
    renderCanvas.height = 1;
  }
}

function drawPreview(targetCanvas, sourceCanvas) {
  targetCanvas.width = PREVIEW_WIDTH;
  targetCanvas.height = PREVIEW_HEIGHT;
  const context = targetCanvas.getContext('2d');
  context.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  context.drawImage(sourceCanvas, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
}
