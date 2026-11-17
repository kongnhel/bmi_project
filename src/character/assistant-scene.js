import * as THREE from '../../vendor/three/three.module.min.js';
import { createProceduralHuman } from './human.js';
import { MODEL_CONFIG } from './config.js';
import { loadConfiguredModel } from './model-loader.js';
import { getCharacterState } from './state.js';
import { QUALITY_TIERS, detectQualityTier, stepTier } from './quality.js';
import {
  getBodyMorphsForBmi,
  getModelMorphInfluences,
} from './body-shape.js';

const CAMERA_LIMITS = Object.freeze({
  yaw: [-1.45, 1.45],
  pitch: [-0.02, 0.24],
  distance: [3.05, 4.9],
});

const CAMERA_HOME = Object.freeze({
  yaw: 0.12,
  pitch: 0.075,
  distance: 3.6,
  targetY: 0.93,
});

const CAMERA_PRESETS = Object.freeze({
  threeQuarter: CAMERA_HOME,
  front: Object.freeze({ ...CAMERA_HOME, yaw: 0 }),
  side: Object.freeze({ ...CAMERA_HOME, yaw: 1.45 }),
});

const CAMERA_BASE_FOV = 30;
const CAMERA_NARROW_ASPECT = 0.52;
const CAMERA_MAX_NARROW_FOV = 45;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function damp(current, target, lambda, delta) {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

export class AssistantScene {
  constructor(canvas, { container, onError = () => {}, onModelInfo = () => {}, gender = 'male', bmi = 22 } = {}) {
    if (!canvas || !container) throw new Error('The 3D assistant requires a canvas and a container.');
    this.canvas = canvas;
    this.container = container;
    this.onError = onError;
    this.onModelInfo = onModelInfo;
    this.disposed = false;
    this.running = false;
    this.active = true;
    this.theme = 'light';
    this.reducedMotion = false;
    this.currentStateKey = 'idle';
    this.currentGender = gender === 'female' ? 'female' : 'male';
    this.currentBmi = Number.isFinite(bmi) ? bmi : 22;
    this.currentHeightCm = 170;
    this.currentWeightKg = null;
    this.currentStyle = 'natural';
    this.currentMorphState = getBodyMorphsForBmi(this.currentBmi);
    this.modelMixer = null;
    this.modelActions = new Map();
    this.modelActiveAction = null;
    this.model = null;
    this.morphEntries = new Map();
    this.morphCurrent = new Map();
    this.morphTargets = new Map();
    this.frame = null;
    this.lastTime = performance.now();
    this.cameraYaw = CAMERA_HOME.yaw;
    this.cameraPitch = CAMERA_HOME.pitch;
    this.cameraDistance = CAMERA_HOME.distance;
    this.targetYaw = CAMERA_HOME.yaw;
    this.targetPitch = CAMERA_HOME.pitch;
    this.targetDistance = CAMERA_HOME.distance;
    this.pointers = new Map();
    this.pinchDistance = null;
    this.abort = new AbortController();
    this.quality = detectQualityTier();
    this.tier = QUALITY_TIERS[this.quality];
    this.frameIndex = 0;
    this.fpsSamples = 0;
    this.fpsTime = 0;
    this.fpsWarmUntil = performance.now() + 2500;
    this.qualityDowngrades = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: this.tier.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier.dprCap));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = this.tier.shadowMapEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.environment = this.createStudioEnvironment();
    this.scene.environmentIntensity = 0.55;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    this.scene.add(this.camera);

    this.root = new THREE.Group();
    this.root.position.y = 0.012;
    this.scene.add(this.root);

    this.buildStage();
    this.buildLights();
    this.human = this.createHuman();

    this.bindInput();
    this.observeSize();
    this.configureTheme('light');
    this.canvas.dataset.renderer = 'three';
    this.canvas.dataset.engine = 'webgl';
    this.canvas.dataset.quality = this.quality;
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.onError(new Error('WebGL context lost'));
    }, { signal: this.abort.signal });

    this.resize();
    this.setActive(true);
    this.tryUpgradeToConfiguredModel();
  }

  createStudioEnvironment() {
    const width = this.tier.envCanvasWidth;
    const height = this.tier.envCanvasHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const vertical = context.createLinearGradient(0, 0, 0, height);
    vertical.addColorStop(0, '#f8fdff');
    vertical.addColorStop(0.46, '#eaf5f7');
    vertical.addColorStop(1, '#d4e2e5');
    context.fillStyle = vertical;
    context.fillRect(0, 0, width, height);

    const keyGlow = context.createRadialGradient(width * 0.29, height * 0.29, 10, width * 0.29, height * 0.29, width * 0.27);
    keyGlow.addColorStop(0, 'rgba(255, 248, 235, 0.95)');
    keyGlow.addColorStop(0.45, 'rgba(255, 248, 235, 0.25)');
    keyGlow.addColorStop(1, 'rgba(255, 248, 235, 0)');
    context.fillStyle = keyGlow;
    context.fillRect(0, 0, width, height);

    const coolGlow = context.createRadialGradient(width * 0.76, height * 0.49, 10, width * 0.76, height * 0.49, width * 0.3);
    coolGlow.addColorStop(0, 'rgba(178, 235, 255, 0.65)');
    coolGlow.addColorStop(0.5, 'rgba(178, 235, 255, 0.16)');
    coolGlow.addColorStop(1, 'rgba(178, 235, 255, 0)');
    context.fillStyle = coolGlow;
    context.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const generator = new THREE.PMREMGenerator(this.renderer);
    const renderTarget = generator.fromEquirectangular(texture);
    generator.dispose();
    texture.dispose();
    this.environmentRenderTarget = renderTarget;
    this.environmentTexture = renderTarget.texture;
    return this.environmentTexture;
  }

  createHuman() {
    const human = createProceduralHuman({
      gender: this.currentGender,
      initialBmi: this.currentBmi,
      quality: this.quality,
      initialHeightCm: this.currentHeightCm,
    });
    human.setBodyMorphs(this.currentMorphState);
    human.setState(this.currentStateKey);
    human.setReducedMotion(this.reducedMotion);
    human.setModelStyle(this.currentStyle);
    this.root.add(human.group);
    return human;
  }

  rebuildHuman() {
    if (this.human) {
      this.root.remove(this.human.group);
      this.human.dispose();
      this.human = null;
    }
    this.human = this.createHuman();
    this.human.setState(this.currentStateKey);
  }

  buildStage() {
    const seg = (value) => Math.max(8, Math.round(value * this.tier.segScale));
    this.platformMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfbfdfc,
      roughness: 0.6,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
    });
    this.platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.49, 0.53, 0.035, seg(72)),
      this.platformMaterial,
    );
    this.platform.position.y = -0.018;
    this.platform.receiveShadow = true;
    this.scene.add(this.platform);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.32,
    });
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.0026, seg(8), seg(96)),
      this.ringMaterial,
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.004;
    this.scene.add(this.ring);

    this.shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.17 });
    this.contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.43, seg(64)),
      this.shadowMaterial,
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.003;
    this.contactShadow.receiveShadow = true;
    this.scene.add(this.contactShadow);
  }

  buildLights() {
    this.hemisphere = new THREE.HemisphereLight(0xf5fbff, 0x91a9ac, 1.25);
    this.scene.add(this.hemisphere);

    const target = new THREE.Object3D();
    target.position.set(0, 1, 0);
    this.scene.add(target);

    this.keyLight = new THREE.DirectionalLight(0xfff4e6, 2.4);
    this.keyLight.position.set(2.4, 3.9, 3.6);
    this.keyLight.target = target;
    this.keyLight.castShadow = this.tier.shadowMapEnabled;
    this.keyLight.shadow.mapSize.set(this.tier.shadowMapSize, this.tier.shadowMapSize);
    this.keyLight.shadow.camera.left = -1.8;
    this.keyLight.shadow.camera.right = 1.8;
    this.keyLight.shadow.camera.top = 3;
    this.keyLight.shadow.camera.bottom = -0.5;
    this.keyLight.shadow.camera.near = 0.2;
    this.keyLight.shadow.camera.far = 12;
    this.keyLight.shadow.bias = -0.00015;
    this.keyLight.shadow.normalBias = 0.025;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xb9e8ff, 0.75);
    this.fillLight.position.set(-3.2, 2.1, 2.7);
    this.fillLight.target = target;
    this.fillLight.visible = this.tier.rimLights;
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0x6ee7d8, 1.15);
    this.rimLight.position.set(-0.6, 2.8, -3.4);
    this.rimLight.target = target;
    this.rimLight.visible = this.tier.rimLights;
    this.scene.add(this.rimLight);
  }

  configureTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    if (!this.platformMaterial) return;
    this.platformMaterial.color.set(this.theme === 'dark' ? 0x0e262c : 0xfbfdfc);
    this.platformMaterial.roughness = this.theme === 'dark' ? 0.72 : 0.6;
    this.ringMaterial.color.set(this.theme === 'dark' ? 0x2dd4bf : 0x0f766e);
    this.ringMaterial.opacity = this.theme === 'dark' ? 0.5 : 0.28;
    this.hemisphere.intensity = this.theme === 'dark' ? 1.05 : 1.25;
    this.keyLight.intensity = this.theme === 'dark' ? 2.1 : 2.4;
    this.fillLight.intensity = this.theme === 'dark' ? 0.6 : 0.75;
    this.rimLight.intensity = this.theme === 'dark' ? 1.65 : 1.15;
    this.shadowMaterial.opacity = this.theme === 'dark' ? 0.3 : 0.17;
    this.renderer.toneMappingExposure = this.theme === 'dark' ? 0.96 : 1.06;
    this.render();
  }

  bindInput() {
    const signal = this.abort.signal;
    const canvas = this.canvas;

    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
      this.pinchDistance = this.currentPinchDistance();
      canvas.classList.add('is-dragging');
    }, { signal });

    canvas.addEventListener('pointermove', (event) => {
      const pointer = this.pointers.get(event.pointerId);
      if (!pointer) return;
      const previousX = pointer.x;
      const previousY = pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (this.pointers.size === 1) {
        const dx = event.clientX - previousX;
        const dy = event.clientY - previousY;
        this.targetYaw = clamp(this.targetYaw + dx * 0.006, ...CAMERA_LIMITS.yaw);
        this.targetPitch = clamp(this.targetPitch + dy * 0.003, ...CAMERA_LIMITS.pitch);
      } else if (this.pointers.size === 2) {
        const distance = this.currentPinchDistance();
        if (distance !== null && this.pinchDistance !== null) {
          const delta = distance - this.pinchDistance;
          this.targetDistance = clamp(
            this.targetDistance - delta * 0.005,
            ...CAMERA_LIMITS.distance,
          );
        }
        this.pinchDistance = distance;
      }
    }, { signal });

    const endPointer = (event) => {
      this.pointers.delete(event.pointerId);
      if (this.pointers.size < 2) this.pinchDistance = null;
      if (this.pointers.size === 0) canvas.classList.remove('is-dragging');
      canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener('pointerup', endPointer, { signal });
    canvas.addEventListener('pointercancel', endPointer, { signal });
    canvas.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        this.pointers.delete(event.pointerId);
        canvas.classList.remove('is-dragging');
      }
    }, { signal });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const modeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
      this.targetDistance = clamp(
        this.targetDistance + event.deltaY * modeScale * 0.0016,
        ...CAMERA_LIMITS.distance,
      );
    }, { signal, passive: false });

    canvas.addEventListener('dblclick', () => this.resetCamera(), { signal });
  }

  currentPinchDistance() {
    if (this.pointers.size !== 2) return null;
    const [first, second] = [...this.pointers.values()];
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  observeSize() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = aspect;
    if (aspect < CAMERA_NARROW_ASPECT) {
      const baseTan = Math.tan((CAMERA_BASE_FOV / 2) * (Math.PI / 180));
      const narrowTan = (baseTan * CAMERA_NARROW_ASPECT) / aspect;
      const narrowFov = 2 * Math.atan(narrowTan) * (180 / Math.PI);
      this.camera.fov = Math.min(CAMERA_MAX_NARROW_FOV, Math.max(CAMERA_BASE_FOV, narrowFov));
    } else {
      this.camera.fov = CAMERA_BASE_FOV;
    }
    this.camera.updateProjectionMatrix();
    this.render();
  }

  rotateBy(delta) {
    this.targetYaw = clamp(this.targetYaw + delta, ...CAMERA_LIMITS.yaw);
  }

  zoomBy(delta) {
    this.targetDistance = clamp(this.targetDistance - delta, ...CAMERA_LIMITS.distance);
  }

  resetCamera() {
    this.targetYaw = CAMERA_HOME.yaw;
    this.targetPitch = CAMERA_HOME.pitch;
    this.targetDistance = CAMERA_HOME.distance;
  }

  setCameraPreset(preset) {
    const next = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.threeQuarter;
    this.targetYaw = next.yaw;
    this.targetPitch = next.pitch;
    this.targetDistance = next.distance;
  }

  setModelStyle(style) {
    this.currentStyle = style === 'clay' || style === 'scan' ? style : 'natural';
    this.human?.setModelStyle(this.currentStyle);
    this.render();
  }

  setTheme(theme) {
    this.configureTheme(theme);
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
    this.human?.setReducedMotion(this.reducedMotion);
    if (this.reducedMotion) {
      this.targetYaw = CAMERA_HOME.yaw;
      this.targetPitch = CAMERA_HOME.pitch;
    }
  }

  /**
   * Single character controller entry point. Gender, actual BMI, category and
   * animation state are applied together so the body, face and UI stay in sync.
   */
  updateCharacter({
    gender = this.currentGender,
    bmi = this.currentBmi,
    heightCm = this.currentHeightCm,
    weightKg = this.currentWeightKg,
    categoryKey = this.currentStateKey,
    animationState = categoryKey,
  } = {}) {
    this.setGender(gender);

    const nextBmi = Number.isFinite(bmi) ? bmi : 22;
    this.currentBmi = nextBmi;
    this.currentHeightCm = Number.isFinite(heightCm) ? heightCm : 170;
    this.currentWeightKg = Number.isFinite(weightKg) ? weightKg : null;
    this.currentMorphState = getBodyMorphsForBmi(nextBmi);
    this.human?.setBodyMorphs(this.currentMorphState);
    this.human?.setAnthropometrics({ heightCm: this.currentHeightCm, weightKg: this.currentWeightKg });

    this.currentStateKey = getCharacterState(animationState ?? categoryKey).key;
    this.human?.setState(this.currentStateKey);

    if (this.modelMixer) {
      this.applyModelAnimation(this.currentStateKey);
      this.applyModelExpression(this.currentStateKey);
    }
    this.canvas.dataset.bmi = nextBmi.toFixed(3);
    this.canvas.dataset.height = this.currentHeightCm.toFixed(1);
    this.render();
  }

  setCharacterState(stateKey) {
    this.updateCharacter({ categoryKey: stateKey, animationState: stateKey });
  }

  setGender(gender) {
    const next = gender === 'female' ? 'female' : 'male';
    if (next === this.currentGender) return;
    this.currentGender = next;

    if (this.modelMixer || this.model) {
      this.modelMixer?.stopAllAction();
      this.modelMixer = null;
      this.modelActiveAction = null;
      this.modelActions.clear();
      if (this.model) {
        this.root.remove(this.model);
        this.disposeObject(this.model);
        this.model = null;
      }
      this.morphEntries.clear();
      this.morphCurrent.clear();
      this.morphTargets.clear();
    }

    if (this.human) {
      this.root.remove(this.human.group);
      this.human.dispose();
      this.human = null;
    }
    this.human = this.createHuman();
    this.human.setState(this.currentStateKey);
    this.render();
  }

  getGender() {
    return this.currentGender;
  }

  disposeObject(object) {
    object.traverse((child) => {
      child.geometry?.dispose?.();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose();
        }
        material.dispose?.();
      }
    });
  }

  setActive(active) {
    this.active = Boolean(active);
    if (this.active) this.start();
    else this.stop();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now();
    // Resuming after being offscreen or hidden can be momentarily janky, so
    // restart the FPS warm-up window before trusting samples again.
    this.fpsWarmUntil = performance.now() + 1200;
    this.fpsSamples = 0;
    this.fpsTime = 0;
    const tick = (now) => {
      if (!this.running || this.disposed) return;
      const delta = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.step(delta);
      this.frameIndex = (this.frameIndex + 1) % this.tier.renderInterval;
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  /**
   * Live quality switch. Applies the DPR cap, shadow map, rim lights and a
   * rebuilt human (lower segment counts) without recreating the scene.
   */
  setQualityTier(tier, { rebuild = true } = {}) {
    if (!QUALITY_TIERS[tier] || tier === this.quality) return;
    this.quality = tier;
    this.tier = QUALITY_TIERS[tier];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier.dprCap));

    const shadowEnabled = this.tier.shadowMapEnabled;
    if (this.keyLight) {
      this.keyLight.castShadow = shadowEnabled;
      const size = this.tier.shadowMapSize;
      if (this.keyLight.shadow.mapSize.x !== size) {
        this.keyLight.shadow.mapSize.set(size, size);
        this.keyLight.shadow.map?.dispose();
        this.keyLight.shadow.map = null;
      }
      if (this.renderer.shadowMap.enabled !== shadowEnabled) {
        this.renderer.shadowMap.enabled = shadowEnabled;
        if (!shadowEnabled) {
          this.keyLight.shadow.map?.dispose();
          this.keyLight.shadow.map = null;
        }
      }
    }
    if (this.fillLight) this.fillLight.visible = this.tier.rimLights;
    if (this.rimLight) this.rimLight.visible = this.tier.rimLights;

    this.canvas.dataset.quality = tier;
    if (rebuild && this.human) this.rebuildHuman();
    this.resize();
  }

  /**
   * Rolling FPS sample (90 frames). The first 2.5 seconds after construction
   * are ignored because shader compilation makes the opening frames janky.
   * Sustained frames below ~34fps then downgrade the tier — at most twice
   * (high → medium → low) so the scene settles instead of oscillating.
   */
  monitorPerformance(delta) {
    if (this.qualityDowngrades >= 2) return;
    if (performance.now() < this.fpsWarmUntil) {
      this.fpsSamples = 0;
      this.fpsTime = 0;
      return;
    }
    this.fpsSamples += 1;
    this.fpsTime += delta;
    if (this.fpsSamples < 90) return;
    const fps = this.fpsSamples / this.fpsTime;
    this.fpsSamples = 0;
    this.fpsTime = 0;
    if (fps < 34 && this.quality !== 'low') {
      this.qualityDowngrades += 1;
      const nextTier = stepTier(this.quality, -1);
      const rebuild = QUALITY_TIERS[nextTier].segScale < this.tier.segScale;
      this.setQualityTier(nextTier, { rebuild });
    }
  }

  step(delta) {
    this.cameraYaw = damp(this.cameraYaw, this.targetYaw, 7, delta);
    this.cameraPitch = damp(this.cameraPitch, this.targetPitch, 7, delta);
    this.cameraDistance = damp(this.cameraDistance, this.targetDistance, 7, delta);

    const cosPitch = Math.cos(this.cameraPitch);
    this.camera.position.set(
      Math.sin(this.cameraYaw) * cosPitch * this.cameraDistance,
      CAMERA_HOME.targetY + Math.sin(this.cameraPitch) * this.cameraDistance,
      Math.cos(this.cameraYaw) * cosPitch * this.cameraDistance,
    );
    this.camera.lookAt(0, CAMERA_HOME.targetY, 0);

    this.human?.update(delta);
    if (this.modelMixer) {
      this.modelMixer.update(delta);
      this.updateMorphs(delta);
    }
    this.monitorPerformance(delta);
    if (this.frameIndex === 0) this.render();
  }

  render() {
    if (!this.renderer || this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  }

  async tryUpgradeToConfiguredModel() {
    if (!MODEL_CONFIG.modelUrl) return;
    const { gltf, reason } = await loadConfiguredModel();
    if (this.disposed) return;
    if (!gltf) {
      this.onModelInfo({ active: false, reason });
      return;
    }
    try {
      this.useRiggedModel(gltf);
      this.onModelInfo({ active: true });
    } catch (error) {
      this.onModelInfo({
        active: false,
        reason: error instanceof Error ? error.message : 'rig-failed',
      });
    }
  }

  useRiggedModel(gltf) {
    const model = gltf.scene;
    if (!model) throw new Error('The GLB did not contain a scene.');

    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = MODEL_CONFIG.castShadow;
      object.receiveShadow = true;
    });

    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    if (!Number.isFinite(size.y) || size.y <= 0) {
      throw new Error('The GLB has no measurable height.');
    }
    const scale = (1.8 / size.y) * MODEL_CONFIG.scale;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    bounds.setFromObject(model);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= bounds.min.y;
    model.position.y += 0.014;

    this.root.remove(this.human.group);
    this.human.dispose();
    this.human = null;
    this.model = model;
    this.root.add(model);

    this.modelMixer = new THREE.AnimationMixer(model);
    this.modelActions.clear();
    const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
    for (const [stateKey, clipName] of Object.entries(MODEL_CONFIG.animations)) {
      const clip = clips.get(clipName);
      if (!clip) continue;
      const action = this.modelMixer.clipAction(clip);
      action.enabled = true;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      this.modelActions.set(stateKey, action);
    }

    this.captureMorphTargets(model);
    this.setCharacterState(this.currentStateKey);
    this.modelMixer.update(0);
  }

  captureMorphTargets(model) {
    this.morphEntries.clear();
    this.morphCurrent.clear();
    this.morphTargets.clear();
    model.traverse((object) => {
      if (!object.isMesh || !object.morphTargetDictionary || !object.morphTargetInfluences) return;
      for (const [name, index] of Object.entries(object.morphTargetDictionary)) {
        if (!this.morphEntries.has(name)) this.morphEntries.set(name, []);
        this.morphEntries.get(name).push({ object, index });
        object.morphTargetInfluences[index] = 0;
        this.morphCurrent.set(name, 0);
      }
    });
  }

  applyModelAnimation(stateKey) {
    if (!this.modelMixer) return;
    const desired = this.modelActions.get(stateKey) ?? this.modelActions.get('idle');
    if (!desired) return;
    if (desired === this.modelActiveAction) return;
    const previous = this.modelActiveAction;
    desired.reset().setEffectiveWeight(1).fadeIn(0.35).play();
    if (previous) previous.fadeOut(0.35);
    this.modelActiveAction = desired;
  }

  applyModelExpression(stateKey) {
    const state = getCharacterState(stateKey);
    const weights = MODEL_CONFIG.expressions[state.expression] ?? {};
    this.morphTargets.clear();
    for (const [name, value] of Object.entries(weights)) {
      if (this.morphEntries.has(name)) this.morphTargets.set(name, value);
    }

    const bodyWeights = getModelMorphInfluences(this.currentMorphState);
    for (const [kind, name] of Object.entries(MODEL_CONFIG.bodyMorphs ?? {})) {
      if (name && this.morphEntries.has(name)) {
        this.morphTargets.set(name, bodyWeights[kind] ?? 0);
      }
    }

    for (const name of this.morphEntries.keys()) {
      if (!this.morphTargets.has(name)) this.morphTargets.set(name, 0);
    }
  }

  updateMorphs(delta) {
    if (this.morphEntries.size === 0) return;
    for (const [name, entries] of this.morphEntries) {
      const target = this.morphTargets.get(name) ?? 0;
      const current = damp(this.morphCurrent.get(name) ?? 0, target, 6, delta);
      this.morphCurrent.set(name, current);
      for (const entry of entries) {
        entry.object.morphTargetInfluences[entry.index] = current;
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.abort.abort();
    this.resizeObserver?.disconnect();
    if (this.modelMixer) this.modelMixer.stopAllAction();
    this.human?.dispose();
    this.human = null;
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.();
      const entries = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of entries) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose();
        }
        material.dispose?.();
      }
    });
    this.scene.clear();
    this.environmentRenderTarget?.dispose();
    this.environmentTexture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.canvas.dataset.renderer = '';
    this.canvas.dataset.engine = '';
  }
}
