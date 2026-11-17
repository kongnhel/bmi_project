/**
 * Adaptive rendering quality for the 3D assistant.
 *
 * Tiers are chosen from real device capabilities (CPU cores, device memory,
 * DPR and the WebGL max texture size). The user agent string is only used as
 * a weak hint for coarse mobile detection — never as the sole signal.
 *
 *  - low:    low-end phones / software WebGL (DPR 1.0, no shadows, no AA)
 *  - medium: mid phones and older laptops (DPR 1.25, small shadows)
 *  - high:   desktops and modern phones (DPR 1.5, full quality)
 */

export const QUALITY_TIERS = Object.freeze({
  low: Object.freeze({
    key: 'low',
    dprCap: 1.0,
    antialias: false,
    shadowMapEnabled: false,
    shadowMapSize: 512,
    segScale: 0.55,
    textureSize: 64,
    anisotropy: 1,
    envCanvasWidth: 256,
    envCanvasHeight: 128,
    physicalMaterials: false,
    rimLights: false,
    renderInterval: 2,
  }),
  medium: Object.freeze({
    key: 'medium',
    dprCap: 1.25,
    antialias: true,
    shadowMapEnabled: true,
    shadowMapSize: 512,
    segScale: 0.75,
    textureSize: 96,
    anisotropy: 2,
    envCanvasWidth: 512,
    envCanvasHeight: 256,
    physicalMaterials: true,
    rimLights: true,
    renderInterval: 1,
  }),
  high: Object.freeze({
    key: 'high',
    dprCap: 1.5,
    antialias: true,
    shadowMapEnabled: true,
    shadowMapSize: 1024,
    segScale: 1,
    textureSize: 128,
    anisotropy: 4,
    envCanvasWidth: 1024,
    envCanvasHeight: 512,
    physicalMaterials: true,
    rimLights: true,
    renderInterval: 1,
  }),
});

export const TIER_ORDER = Object.freeze(['low', 'medium', 'high']);

function normaliseTier(tier) {
  return TIER_ORDER.includes(tier) ? tier : 'medium';
}

let cachedRenderer = null;

function probeWebgl() {
  if (cachedRenderer !== null) return cachedRenderer;
  cachedRenderer = false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = debugInfo
        ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
        : '';
      cachedRenderer = {
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048,
        isSoftware: /swiftshader|software|basic render/i.test(rendererName),
      };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    cachedRenderer = false;
  }
  return cachedRenderer;
}

/**
 * Pick a starting tier from device capabilities. Never throws; falls back to
 * 'medium' when the environment reveals nothing useful. A `?quality=low|medium|high`
 * query parameter acts as an explicit override for testing and support.
 */
export function detectQualityTier() {
  try {
    const override = new URLSearchParams(window.location.search).get('quality');
    if (TIER_ORDER.includes(override)) return override;
  } catch {
    // Ignore URL parsing issues and continue with capability detection.
  }

  const gl = probeWebgl();
  if (!gl) return 'low';
  if (gl.isSoftware) return 'low';

  const cores = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4;
  const memory = Number(navigator.deviceMemory) || 0;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;

  let score = 0;
  if (cores >= 8) score += 2;
  else if (cores >= 6) score += 1;
  if (memory === 0) score += 1;
  else if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  if (gl.maxTextureSize >= 8192) score += 2;
  else if (gl.maxTextureSize >= 4096) score += 1;
  if (!coarse) score += 1;
  if ((window.devicePixelRatio || 1) <= 1.5) score += 1;

  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export function stepTier(tier, direction) {
  const index = TIER_ORDER.indexOf(normaliseTier(tier));
  const nextIndex = Math.min(TIER_ORDER.length - 1, Math.max(0, index + direction));
  return TIER_ORDER[nextIndex];
}
