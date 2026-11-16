import { MODEL_CONFIG } from './config.js';

/**
 * Load a configured production GLB. The GLTFLoader is fetched only when a
 * real model URL is configured, so the procedural preview stays lightweight.
 * @returns {Promise<{gltf: object|null, reason?: string}>}
 */
export async function loadConfiguredModel() {
  if (!MODEL_CONFIG.modelUrl) {
    return { gltf: null, reason: 'not-configured' };
  }

  try {
    const { GLTFLoader } = await import('../../vendor/three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(MODEL_CONFIG.modelUrl);
    return { gltf };
  } catch (error) {
    return { gltf: null, reason: error instanceof Error ? error.message : 'load-failed' };
  }
}
