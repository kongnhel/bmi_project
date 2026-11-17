import * as THREE from '../../vendor/three/three.module.min.js';
import { getCharacterState } from './state.js';
import { QUALITY_TIERS } from './quality.js';
import {
  getBodyMorphsForBmi,
  getMorphDelta,
  getTorsoMorphInfluences,
} from './body-shape.js';

const SKIN = 0xd6a57e;
const HAIR = 0x2b211d;
const TEAL = 0x0d837a;
const TEAL_DARK = 0x09635d;
const TROUSERS = 0x253646;
const SHOE = 0xf2f6f5;
const EYE_WHITE = 0xf7f3ed;
const IRIS = 0x4b3426;
const PUPIL = 0x151110;
const LIP = 0xa26b64;
const METAL = 0xb9c4c5;

const VARIANTS = Object.freeze({
  male: Object.freeze({
    key: 'male',
    shoulderX: 0.232,
    hipX: 0.095,
    shoeX: 0.1,
    torsoScale: [1.17, 1, 0.68],
    pelvisScale: [1.2, 1, 0.72],
    hemScale: [1.14, 1, 0.7],
    legScale: [1.03, 1, 0.9],
    armVolume: 1,
    headScale: [0.9, 1.08, 0.94],
    browRadius: 0.0037,
    browLength: 0.032,
    lipThickness: 1,
    hairStyle: 'short',
  }),
  female: Object.freeze({
    key: 'female',
    shoulderX: 0.211,
    hipX: 0.103,
    shoeX: 0.107,
    torsoScale: [1.11, 1, 0.66],
    pelvisScale: [1.27, 1, 0.76],
    hemScale: [1.18, 1, 0.72],
    legScale: [1.01, 1, 0.88],
    armVolume: 0.94,
    headScale: [0.88, 1.06, 0.93],
    browRadius: 0.0032,
    browLength: 0.029,
    lipThickness: 1.16,
    hairStyle: 'bun',
  }),
});

const TORSO_PROFILES = Object.freeze({
  male: Object.freeze([
    Object.freeze({ t: 0, rx: 0.204, rz: 0.122, z: 0 }),
    Object.freeze({ t: 0.085, rx: 0.199, rz: 0.117, z: 0 }),
    Object.freeze({ t: 0.26, rx: 0.181, rz: 0.109, z: 0.002 }),
    Object.freeze({ t: 0.44, rx: 0.196, rz: 0.118, z: 0.003 }),
    Object.freeze({ t: 0.64, rx: 0.221, rz: 0.13, z: 0.002 }),
    Object.freeze({ t: 0.79, rx: 0.238, rz: 0.126, z: 0 }),
    Object.freeze({ t: 0.88, rx: 0.206, rz: 0.113, z: -0.001 }),
    Object.freeze({ t: 0.955, rx: 0.085, rz: 0.07, z: -0.002 }),
    Object.freeze({ t: 1, rx: 0.068, rz: 0.058, z: -0.002 }),
  ]),
  female: Object.freeze([
    Object.freeze({ t: 0, rx: 0.212, rz: 0.124, z: 0 }),
    Object.freeze({ t: 0.085, rx: 0.207, rz: 0.119, z: 0 }),
    Object.freeze({ t: 0.26, rx: 0.171, rz: 0.104, z: 0.002 }),
    Object.freeze({ t: 0.44, rx: 0.187, rz: 0.113, z: 0.003 }),
    Object.freeze({ t: 0.64, rx: 0.206, rz: 0.124, z: 0.002 }),
    Object.freeze({ t: 0.79, rx: 0.221, rz: 0.12, z: 0 }),
    Object.freeze({ t: 0.88, rx: 0.194, rz: 0.108, z: -0.001 }),
    Object.freeze({ t: 0.955, rx: 0.082, rz: 0.067, z: -0.002 }),
    Object.freeze({ t: 1, rx: 0.065, rz: 0.056, z: -0.002 }),
  ]),
});

const HIP_PROFILES = Object.freeze({
  male: Object.freeze([
    Object.freeze({ t: 0, y: 0.83, rx: 0.135, rz: 0.092 }),
    Object.freeze({ t: 0.22, y: 0.855, rx: 0.16, rz: 0.103 }),
    Object.freeze({ t: 0.55, y: 0.905, rx: 0.175, rz: 0.109 }),
    Object.freeze({ t: 0.8, y: 0.965, rx: 0.18, rz: 0.111 }),
    Object.freeze({ t: 1, y: 1.02, rx: 0.163, rz: 0.101 }),
  ]),
  female: Object.freeze([
    Object.freeze({ t: 0, y: 0.83, rx: 0.147, rz: 0.099 }),
    Object.freeze({ t: 0.22, y: 0.855, rx: 0.171, rz: 0.109 }),
    Object.freeze({ t: 0.55, y: 0.905, rx: 0.185, rz: 0.113 }),
    Object.freeze({ t: 0.8, y: 0.965, rx: 0.186, rz: 0.114 }),
    Object.freeze({ t: 1, y: 1.02, rx: 0.166, rz: 0.103 }),
  ]),
});

const LEG_PROFILE = Object.freeze([
  Object.freeze({ t: 0, rx: 0.08, rz: 0.086, z: 0 }),
  Object.freeze({ t: 0.08, rx: 0.084, rz: 0.09, z: 0 }),
  Object.freeze({ t: 0.3, rx: 0.079, rz: 0.084, z: 0 }),
  Object.freeze({ t: 0.48, rx: 0.068, rz: 0.074, z: -0.001 }),
  Object.freeze({ t: 0.56, rx: 0.058, rz: 0.061, z: -0.002 }),
  Object.freeze({ t: 0.68, rx: 0.063, rz: 0.069, z: -0.005 }),
  Object.freeze({ t: 0.85, rx: 0.044, rz: 0.049, z: -0.002 }),
  Object.freeze({ t: 0.94, rx: 0.036, rz: 0.041, z: 0.005 }),
  Object.freeze({ t: 1, rx: 0.034, rz: 0.038, z: 0.012 }),
]);

const SLEEVE_PROFILE = Object.freeze([
  Object.freeze({ t: 0, rx: 0.03, rz: 0.028 }),
  Object.freeze({ t: 0.16, rx: 0.062, rz: 0.058 }),
  Object.freeze({ t: 0.45, rx: 0.059, rz: 0.055 }),
  Object.freeze({ t: 1, rx: 0.051, rz: 0.048 }),
]);

const UPPER_ARM_PROFILE = Object.freeze([
  Object.freeze({ t: 0, rx: 0.049, rz: 0.047 }),
  Object.freeze({ t: 0.55, rx: 0.046, rz: 0.044 }),
  Object.freeze({ t: 1, rx: 0.042, rz: 0.04 }),
]);

const FOREARM_PROFILE = Object.freeze([
  Object.freeze({ t: 0, rx: 0.043, rz: 0.041 }),
  Object.freeze({ t: 0.25, rx: 0.041, rz: 0.039 }),
  Object.freeze({ t: 0.7, rx: 0.035, rz: 0.033 }),
  Object.freeze({ t: 1, rx: 0.029, rz: 0.027 }),
]);

function sampleProfile(keys, t) {
  if (t <= keys[0].t) return { ...keys[0] };
  const last = keys[keys.length - 1];
  if (t >= last.t) return { ...last };
  for (let index = 1; index < keys.length; index += 1) {
    const upper = keys[index];
    if (t > upper.t) continue;
    const lower = keys[index - 1];
    const span = Math.max(0.00001, upper.t - lower.t);
    const raw = (t - lower.t) / span;
    const smooth = raw * raw * (3 - 2 * raw);
    const result = { t };
    for (const key of Object.keys(upper)) {
      if (key === 't') continue;
      result[key] = lower[key] + (upper[key] - lower[key]) * smooth;
    }
    return result;
  }
  return { ...last };
}

function createLoftGeometry(stacks, slices, profile, { deform = null, band = null } = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((stacks + 1) * slices * 3);
  const indices = [];
  let pointer = 0;

  for (let stack = 0; stack <= stacks; stack += 1) {
    const t = stack / stacks;
    const ring = profile(t);
    for (let slice = 0; slice < slices; slice += 1) {
      const theta = (slice / slices) * Math.PI * 2;
      let x = (ring.x ?? 0) + Math.cos(theta) * ring.rx;
      let y = ring.y;
      let z = (ring.z ?? 0) + Math.sin(theta) * ring.rz;
      if (deform) {
        const adjusted = deform({ x, y, z, t, theta });
        if (adjusted) {
          x = adjusted.x;
          y = adjusted.y;
          z = adjusted.z;
        }
      }
      positions[pointer++] = x;
      positions[pointer++] = y;
      positions[pointer++] = z;
    }
  }

  for (let stack = 0; stack < stacks; stack += 1) {
    for (let slice = 0; slice < slices; slice += 1) {
      const next = (slice + 1) % slices;
      const a = stack * slices + slice;
      const b = (stack + 1) * slices + slice;
      const c = (stack + 1) * slices + next;
      const d = stack * slices + next;
      indices.push(a, b, d, b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  if (band) {
    const indicesPerStack = slices * 6;
    let start = 0;
    let count = 0;
    let materialIndex = null;
    for (let stack = 0; stack < stacks; stack += 1) {
      const nextMaterial = band((stack + 0.5) / stacks);
      if (materialIndex === null) {
        materialIndex = nextMaterial;
      } else if (nextMaterial !== materialIndex) {
        geometry.addGroup(start, count, materialIndex);
        start += count;
        count = 0;
        materialIndex = nextMaterial;
      }
      count += indicesPerStack;
    }
    if (count > 0) geometry.addGroup(start, count, materialIndex ?? 0);
  }

  geometry.computeVertexNormals();
  return geometry;
}

const SHAPE_SMOOTHING = 3.2;

const REST_POSE = Object.freeze({
  shoulderL: { x: 0.03, z: -0.09 },
  elbowL: { x: 0.11, z: 0.03 },
  handL: { x: 0, y: 0, z: 0.02 },
  shoulderR: { x: 0.03, z: 0.09 },
  elbowR: { x: 0.11, z: -0.03 },
  handR: { x: 0, y: 0, z: -0.02 },
  spineZ: 0,
  spineX: 0,
});

const GESTURE_POSES = Object.freeze({
  rest: REST_POSE,
  support: Object.freeze({
    shoulderL: { x: 0.02, z: -0.1 },
    elbowL: { x: 0.16, z: 0.04 },
    handL: { x: 0, y: 0, z: 0.02 },
    shoulderR: { x: -0.65, z: 0.4 },
    elbowR: { x: -1.1, z: 0.1 },
    handR: { x: -0.1, y: -0.2, z: 0.25 },
    spineZ: 0.012,
    spineX: 0.012,
  }),
  welcome: Object.freeze({
    shoulderL: { x: -0.08, z: -0.24 },
    elbowL: { x: 0.18, z: 0.08 },
    handL: { x: 0.1, y: 0.05, z: 0.11 },
    shoulderR: { x: -0.28, z: 0.76 },
    elbowR: { x: -0.35, z: 0.23 },
    handR: { x: 0.18, y: -0.25, z: 0.24 },
    spineZ: 0.02,
    spineX: -0.01,
  }),
  explain: Object.freeze({
    shoulderL: { x: -0.65, z: -0.35 },
    elbowL: { x: -1.1, z: -0.08 },
    handL: { x: -0.1, y: 0.2, z: 0.25 },
    shoulderR: { x: -0.65, z: 0.35 },
    elbowR: { x: -1.1, z: 0.08 },
    handR: { x: -0.1, y: -0.2, z: 0.25 },
    spineZ: 0,
    spineX: 0.012,
  }),
  reassure: Object.freeze({
    shoulderL: { x: -0.55, z: -0.4 },
    elbowL: { x: -0.9, z: -0.1 },
    handL: { x: -0.05, y: 0.16, z: 0.22 },
    shoulderR: { x: -0.55, z: 0.4 },
    elbowR: { x: -0.9, z: 0.1 },
    handR: { x: -0.05, y: -0.16, z: 0.22 },
    spineZ: 0,
    spineX: 0.012,
  }),
});

const EXPRESSION_TARGETS = Object.freeze({
  warm: Object.freeze({
    smile: 0.22,
    innerBrow: 0.02,
    eyeOpen: 1,
    brows: { left: 0.08, right: -0.08 },
    headTilt: -0.02,
  }),
  happy: Object.freeze({
    smile: 1,
    innerBrow: 0.08,
    eyeOpen: 1,
    brows: { left: -0.03, right: 0.03 },
    headTilt: 0.03,
  }),
  caring: Object.freeze({
    smile: 0.18,
    innerBrow: 0.18,
    eyeOpen: 0.97,
    brows: { left: 0.18, right: -0.18 },
    headTilt: -0.06,
  }),
  thoughtful: Object.freeze({
    smile: 0.02,
    innerBrow: 0.12,
    eyeOpen: 0.91,
    brows: { left: 0.03, right: -0.18 },
    headTilt: -0.05,
  }),
  empathetic: Object.freeze({
    smile: -0.35,
    innerBrow: 0.26,
    eyeOpen: 0.93,
    brows: { left: 0.23, right: -0.23 },
    headTilt: -0.1,
  }),
});

function damp(current, target, lambda, delta) {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

function dampVec(current, target, lambda, delta) {
  current.x = damp(current.x, target.x, lambda, delta);
  current.y = damp(current.y, target.y, lambda, delta);
  current.z = damp(current.z, target.z, lambda, delta);
}

export function createProceduralHuman({
  gender = 'male',
  initialBmi = 22,
  quality = 'high',
  initialHeightCm = 170,
} = {}) {
  const variant = VARIANTS[gender === 'female' ? 'female' : 'male'];
  const profile = QUALITY_TIERS[quality] ?? QUALITY_TIERS.high;
  // Scale every explicit segment count by the quality tier so low-end devices
  // build lighter geometry (fewer vertices also speed up morph-target setup).
  const S = (value) => Math.max(4, Math.round(value * profile.segScale));
  const root = new THREE.Group();
  root.name = `WellnessAssistant-${variant.key}`;
  root.userData.gender = variant.key;
  const figure = new THREE.Group();
  root.add(figure);

  function heightScaleFor(value) {
    if (!Number.isFinite(value)) return 1;
    const normalised = Math.min(1, Math.max(0, (value - 140) / 70));
    return 0.96 + normalised * 0.07;
  }

  let currentHeightScale = heightScaleFor(initialHeightCm);
  let targetHeightScale = currentHeightScale;

  const shapeRefs = {
    torso: null,
    hem: null,
    waist: null,
    pelvis: null,
    frontDetails: null,
    legs: [],
    shoes: [],
    arms: [],
  };
  let targetMorphState = getBodyMorphsForBmi(initialBmi);
  const currentMorphs = { ...targetMorphState.controls };

  const geometries = new Set();
  const materials = new Set();

  const textures = new Set();

  const material = (options) => {
    const next = new THREE.MeshStandardMaterial(options);
    materials.add(next);
    return next;
  };

  const physicalMaterial = (options) => {
    if (profile.physicalMaterials) {
      const next = new THREE.MeshPhysicalMaterial(options);
      materials.add(next);
      return next;
    }
    const { clearcoat, clearcoatRoughness, sheen, sheenColor, ...standardOptions } = options;
    const next = new THREE.MeshStandardMaterial(standardOptions);
    materials.add(next);
    return next;
  };

  function makeTexture(kind) {
    const size = profile.textureSize;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        let value = 128;
        if (kind === 'fabric') {
          const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 3 : -3;
          value = 128 + weave + (Math.random() * 5 - 2.5);
        } else {
          value = 128 + (Math.random() * 12 - 6);
        }
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(kind === 'fabric' ? 7 : 4, kind === 'fabric' ? 7 : 4);
    texture.anisotropy = profile.anisotropy;
    textures.add(texture);
    return texture;
  }

  const fabricBump = makeTexture('fabric');
  const skinBump = makeTexture('skin');

  const skin = physicalMaterial({
    color: SKIN,
    roughness: 0.64,
    clearcoat: 0.025,
    clearcoatRoughness: 0.7,
    sheen: 0.05,
    sheenColor: new THREE.Color(0xf6d1b3),
    bumpMap: skinBump,
    bumpScale: 0.0011,
  });
  const hair = material({ color: HAIR, roughness: 0.46, bumpMap: skinBump, bumpScale: 0.0015 });
  const scrub = material({ color: TEAL, roughness: 0.94, bumpMap: fabricBump, bumpScale: 0.002 });
  const scrubDark = material({ color: TEAL_DARK, roughness: 0.95, bumpMap: fabricBump, bumpScale: 0.002 });
  const shirt = material({ color: 0xf4faf7, roughness: 0.96, bumpMap: fabricBump, bumpScale: 0.0015 });
  const trousers = material({ color: TROUSERS, roughness: 0.95, bumpMap: fabricBump, bumpScale: 0.002 });
  const shoe = material({ color: SHOE, roughness: 0.68 });
  const sole = material({ color: 0xc4d0d2, roughness: 0.82 });
  const eyeWhite = material({ color: EYE_WHITE, roughness: 0.36 });
  const iris = material({ color: IRIS, roughness: 0.3 });
  const pupil = material({ color: PUPIL, roughness: 0.24 });
  const glint = physicalMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.2 });
  const lip = material({ color: LIP, roughness: 0.68 });
  const metal = physicalMaterial({ color: METAL, roughness: 0.28, metalness: 0.72 });
  const scope = material({ color: 0x2d3a40, roughness: 0.72 });
  const badgeTeal = material({ color: 0x0f766e, roughness: 0.6 });
  const badgeLine = material({ color: 0x92a5ab, roughness: 0.8 });

  function mesh(geometry, meshMaterial, parent, options = {}) {
    const object = new THREE.Mesh(geometry, meshMaterial);
    geometries.add(geometry);
    object.castShadow = options.castShadow !== false;
    object.receiveShadow = options.receiveShadow !== false;
    if (options.position) object.position.set(...options.position);
    if (options.rotation) object.rotation.set(...options.rotation);
    if (options.scale) object.scale.set(...options.scale);
    parent.add(object);
    return object;
  }

  function sphere(radius, meshMaterial, parent, options = {}) {
    return mesh(
      new THREE.SphereGeometry(radius, options.segments ? S(options.segments) : S(24), options.rings ? S(options.rings) : S(18)),
      meshMaterial,
      parent,
      options,
    );
  }

  function capsule(radius, length, meshMaterial, parent, options = {}) {
    return mesh(
      new THREE.CapsuleGeometry(radius, length, S(6), S(14)),
      meshMaterial,
      parent,
      options,
    );
  }

  function cylinder(radiusTop, radiusBottom, height, meshMaterial, parent, options = {}) {
    return mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, S(options.segments ?? 20)),
      meshMaterial,
      parent,
      options,
    );
  }

  function smoothRange(start, end, value) {
    const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Adds real morph targets to the procedural tunic. The production GLB can
   * use equivalent Blender shape keys (BodyLean, torso_width, waist_width,
   * abdomen_volume, chest_volume); the controls use the same morphTargetInfluences contract.
   */
  function addTorsoMorphTargets(torsoMesh) {
    const geometry = torsoMesh.geometry;
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const positions = geometry.attributes.position;
    const base = positions.array;
    const leanDeltas = new Float32Array(base.length);
    const torsoWidthDeltas = new Float32Array(base.length);
    const waistWidthDeltas = new Float32Array(base.length);
    const abdomenDeltas = new Float32Array(base.length);
    const chestDeltas = new Float32Array(base.length);
    const minY = bounds.min.y;
    const height = Math.max(0.0001, bounds.max.y - minY);
    const maxDepth = Math.max(0.0001, bounds.max.z, -bounds.min.z);

    for (let index = 0; index < base.length; index += 3) {
      const x = base[index];
      const z = base[index + 2];
      const normalisedY = (base[index + 1] - minY) / height;
      const front = Math.max(0, z) / maxDepth;
      const abdomen = smoothRange(0.02, 0.24, normalisedY)
        * (1 - smoothRange(0.42, 0.68, normalisedY));
      const waist = smoothRange(0.02, 0.3, normalisedY)
        * (1 - smoothRange(0.52, 0.76, normalisedY));
      const chest = smoothRange(0.55, 0.94, normalisedY);
      const upper = smoothRange(0.35, 0.85, normalisedY);

      leanDeltas[index] = -x * (0.28 * waist + 0.07 * chest);
      leanDeltas[index + 1] = -base[index + 1] * 0.006 * waist;
      leanDeltas[index + 2] = -z * (0.24 * waist + 0.04 * chest);

      torsoWidthDeltas[index] = x * 0.15 * (0.55 + 0.45 * upper);
      torsoWidthDeltas[index + 2] = z * 0.045 * (0.55 + 0.45 * upper);

      waistWidthDeltas[index] = x * 0.24 * waist;
      waistWidthDeltas[index + 2] = z * 0.09 * waist;

      abdomenDeltas[index] = x * 0.22 * abdomen;
      abdomenDeltas[index + 2] = z * 0.3 * abdomen + 0.075 * abdomen * front;

      chestDeltas[index] = x * 0.15 * chest;
      chestDeltas[index + 2] = z * 0.16 * chest + 0.025 * chest * front;
    }

    const targets = [
      ['BodyLean', leanDeltas],
      ['torso_width', torsoWidthDeltas],
      ['waist_width', waistWidthDeltas],
      ['abdomen_volume', abdomenDeltas],
      ['chest_volume', chestDeltas],
    ];
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = targets.map(([, values]) => {
      const attribute = new THREE.BufferAttribute(values, 3);
      return attribute;
    });
    geometry.morphAttributes.position.forEach((attribute, index) => {
      attribute.name = targets[index][0];
    });

    torsoMesh.morphTargetDictionary = Object.fromEntries(
      targets.map(([name], index) => [name, index]),
    );
    torsoMesh.morphTargetInfluences = targets.map(() => 0);
  }

  // Legs and feet -----------------------------------------------------------
  const legMaterial = trousers;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * variant.hipX, 0.92, 0);
    leg.rotation.z = side * -0.014;
    figure.add(leg);
    shapeRefs.legs.push({
      group: leg,
      side,
      baseX: side * variant.hipX,
      baseScaleX: 1,
      baseScaleZ: 1,
    });

    mesh(
      createLoftGeometry(S(24), S(18), (t) => {
        const ring = sampleProfile(LEG_PROFILE, t);
        return { ...ring, y: -t * 0.77 };
      }),
      legMaterial,
      leg,
      { scale: [...variant.legScale] },
    );

    // Soft sock bridge from trouser hem to shoe.
    cylinder(0.039, 0.045, 0.14, shirt, leg, {
      position: [0, -0.755, 0.004],
      scale: [1, 1, 0.86],
      segments: 18,
    });

    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(side * variant.shoeX, 0.052, 0.04);
    shoeGroup.rotation.y = side * 0.025;
    figure.add(shoeGroup);
    shapeRefs.shoes.push({
      group: shoeGroup,
      side,
      baseX: side * variant.shoeX,
    });
    mesh(new THREE.BoxGeometry(0.135, 0.028, 0.245), sole, shoeGroup, {
      position: [0, -0.021, 0.018],
      castShadow: true,
    });
    sphere(0.068, shoe, shoeGroup, {
      position: [0, 0.012, 0.028],
      scale: [1.02, 0.62, 1.72],
    });
    sphere(0.056, shoe, shoeGroup, {
      position: [0, 0.042, -0.032],
      scale: [1, 0.72, 0.9],
    });
    mesh(new THREE.BoxGeometry(0.052, 0.05, 0.014), badgeTeal, shoeGroup, {
      position: [0, 0.036, -0.088],
      castShadow: false,
    });
    mesh(new THREE.BoxGeometry(0.092, 0.012, 0.075), scrubDark, shoeGroup, {
      position: [0, 0.046, 0.086],
      castShadow: false,
    });
  }

  // Pelvis and torso -------------------------------------------------------
  const pelvis = mesh(
    createLoftGeometry(S(10), S(24), (t) => sampleProfile(HIP_PROFILES[variant.key], t)),
    trousers,
    figure,
  );
  pelvis.name = 'pelvis';
  pelvis.receiveShadow = true;
  shapeRefs.pelvis = { mesh: pelvis, baseScale: [1, 1, 1] };

  const spine = new THREE.Group();
  spine.position.set(0, 0.96, 0);
  figure.add(spine);

  const torsoKeys = TORSO_PROFILES[variant.key];
  const isFemale = variant.key === 'female';
  const torso = mesh(
    createLoftGeometry(
      S(34),
      S(28),
      (t) => {
        const ring = sampleProfile(torsoKeys, t);
        return { ...ring, y: -0.075 + t * 0.6 };
      },
      {
        deform: ({ x, y, z, t, theta }) => {
          const sin = Math.sin(theta);
          if (isFemale && sin > 0.08) {
            const bust = Math.exp(-0.5 * ((t - 0.68) / 0.07) ** 2);
            z += 0.023 * bust * Math.sin(theta) ** 1.35;
          }
          if (sin < -0.72) {
            const spineGroove = Math.exp(-0.5 * ((t - 0.5) / 0.28) ** 2);
            z += 0.0045 * spineGroove * (-sin) ** 4;
          }
          return { x, y, z };
        },
        band: (t) => (t < 0.028 || t > 0.952 ? 1 : 0),
      },
    ),
    [scrub, scrubDark],
    spine,
  );
  torso.name = 'torso';
  addTorsoMorphTargets(torso);
  shapeRefs.torso = torso;

  const frontDetails = new THREE.Group();
  frontDetails.name = 'FrontDetails';
  spine.add(frontDetails);
  shapeRefs.frontDetails = frontDetails;

  // White V-neck undershirt.
  const vShape = new THREE.Shape();
  vShape.moveTo(-0.038, 0.022);
  vShape.lineTo(0.038, 0.022);
  vShape.lineTo(0, -0.062);
  vShape.closePath();
  mesh(new THREE.ShapeGeometry(vShape), shirt, frontDetails, {
    position: [0, 0.43, 0.129],
    castShadow: false,
  });
  mesh(new THREE.BoxGeometry(0.014, 0.095, 0.01), scrubDark, frontDetails, {
    position: [-0.03, 0.39, 0.136],
    rotation: [0, 0, -0.38],
    castShadow: false,
  });
  mesh(new THREE.BoxGeometry(0.014, 0.095, 0.01), scrubDark, frontDetails, {
    position: [0.03, 0.39, 0.136],
    rotation: [0, 0, 0.38],
    castShadow: false,
  });

  // Badge and small pocket seam.
  mesh(new THREE.BoxGeometry(0.052, 0.066, 0.009), shirt, frontDetails, {
    position: [-0.082, 0.315, 0.127],
    rotation: [0, -0.06, -0.03],
    castShadow: false,
  });
  mesh(new THREE.BoxGeometry(0.052, 0.017, 0.0025), badgeTeal, frontDetails, {
    position: [-0.082, 0.337, 0.133],
    rotation: [0, -0.06, -0.03],
    castShadow: false,
  });
  mesh(new THREE.BoxGeometry(0.034, 0.006, 0.0025), scrubDark, frontDetails, {
    position: [0.09, 0.19, 0.111],
    rotation: [0, 0.08, 0.02],
    castShadow: false,
  });
  mesh(new THREE.BoxGeometry(0.033, 0.0035, 0.002), badgeLine, frontDetails, {
    position: [-0.077, 0.302, 0.134],
    castShadow: false,
  });
  mesh(new THREE.BoxGeometry(0.024, 0.0035, 0.002), badgeLine, frontDetails, {
    position: [-0.081, 0.293, 0.134],
    castShadow: false,
  });

  // Stethoscope around the neck and down to a chest piece.
  mesh(new THREE.TorusGeometry(0.07, 0.006, S(8), S(28)), scope, spine, {
    position: [0, 0.5, 0.005],
    rotation: [Math.PI / 2, 0, 0],
    castShadow: false,
  });
  const scopeCurveLeft = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.062, 0.49, 0.07),
    new THREE.Vector3(-0.077, 0.4, 0.125),
    new THREE.Vector3(-0.025, 0.3, 0.135),
    new THREE.Vector3(0.04, 0.29, 0.145),
  ]);
  mesh(new THREE.TubeGeometry(scopeCurveLeft, S(20), 0.0055, S(6), false), scope, frontDetails, {
    castShadow: false,
  });
  const scopeCurveRight = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.062, 0.49, 0.07),
    new THREE.Vector3(0.075, 0.41, 0.128),
    new THREE.Vector3(0.047, 0.32, 0.135),
    new THREE.Vector3(0.044, 0.292, 0.145),
  ]);
  mesh(new THREE.TubeGeometry(scopeCurveRight, S(18), 0.005, S(6), false), scope, frontDetails, {
    castShadow: false,
  });
  cylinder(0.017, 0.017, 0.01, metal, frontDetails, {
    position: [0.044, 0.287, 0.152],
    rotation: [Math.PI / 2, 0, 0],
    castShadow: false,
  });

  // Neck and head ----------------------------------------------------------
  const neck = cylinder(0.052, 0.057, 0.1, skin, spine, {
    position: [0, 0.515, 0],
    segments: 20,
  });
  shapeRefs.neck = neck;

  const head = new THREE.Group();
  head.position.set(0, 0.58, 0);
  spine.add(head);

  const headMesh = sphere(0.13, skin, head, {
    position: [0, 0.13, 0],
    scale: [...variant.headScale],
    segments: 40,
    rings: 28,
  });
  headMesh.name = 'head';

  // Ears.
  for (const side of [-1, 1]) {
    sphere(0.028, skin, head, {
      position: [side * 0.13 * variant.headScale[0], 0.126, -0.002],
      scale: [0.55, 1, 0.76],
      segments: 18,
      rings: 14,
    });
  }

  // Nose. Facial accents do not cast their own shadows at this scale;
  // that keeps the lower face soft rather than reading as a moustache.
  sphere(0.017, skin, head, {
    position: [0, 0.106, 0.118],
    scale: [0.66, 1.02, 1.02],
    segments: 18,
    rings: 14,
    castShadow: false,
  });

  // Eyes.
  const eyeGroups = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.045, 0.158, 0.102);
    head.add(eye);
    eyeGroups.push(eye);

    sphere(0.0235, eyeWhite, eye, {
      scale: [1.18, 0.82, 0.52],
      segments: 22,
      rings: 16,
      castShadow: false,
    });
    sphere(0.011, iris, eye, {
      position: [0, 0.001, 0.012],
      scale: [1, 1, 0.48],
      segments: 18,
      rings: 14,
      castShadow: false,
    });
    sphere(0.0056, pupil, eye, {
      position: [0, 0.001, 0.017],
      scale: [1, 1, 0.38],
      segments: 14,
      rings: 10,
      castShadow: false,
    });
    sphere(0.0028, glint, eye, {
      position: [side * -0.0035, 0.0038, 0.0182],
      segments: 10,
      rings: 8,
      castShadow: false,
    });

    // A soft upper lid line keeps the eyes from feeling like floating spheres.
    const lidCurve = new THREE.EllipseCurve(
      0,
      0,
      0.026,
      0.014,
      0.18,
      Math.PI - 0.18,
      false,
      0,
    );
    const lidPoints = lidCurve.getPoints(16).map((point) => new THREE.Vector3(point.x, point.y, 0));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lidPoints), S(16), 0.0018, S(5), false), hair, eye, {
      position: [0, 0.008, 0.009],
      castShadow: false,
    });
  }

  // Eyebrows.
  const brows = [];
  for (const side of [-1, 1]) {
    const brow = new THREE.Group();
    brow.position.set(side * 0.047, 0.198, 0.109);
    brow.rotation.z = side * 0.08;
    head.add(brow);
    brows.push(brow);
    const browMesh = capsule(variant.browRadius, variant.browLength, hair, brow, {
      rotation: [0, 0, Math.PI / 2],
      scale: [1, 1, 0.7],
      castShadow: false,
    });
    browMesh.castShadow = false;
  }

  // Smiling mouth built from a small tube.
  const mouth = new THREE.Group();
  mouth.position.set(0, 0.068, 0.112);
  head.add(mouth);
  let mouthGeometry = null;
  let lastSmile = -10;

  function buildMouth(smile) {
    if (Math.abs(smile - lastSmile) < 0.008) return;
    lastSmile = smile;
    if (mouthGeometry) {
      mouth.remove(mouth.children[0]);
      geometries.delete(mouthGeometry);
      mouthGeometry.dispose();
    }
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.039, smile * 0.008, 0),
      new THREE.Vector3(-0.019, -smile * 0.001, 0.0025),
      new THREE.Vector3(0, -smile * 0.006, 0.0035),
      new THREE.Vector3(0.019, -smile * 0.001, 0.0025),
      new THREE.Vector3(0.039, smile * 0.008, 0),
    ]);
    mouthGeometry = new THREE.TubeGeometry(curve, S(18), 0.0032 * variant.lipThickness, S(6), false);
    geometries.add(mouthGeometry);
    const object = new THREE.Mesh(mouthGeometry, lip);
    object.castShadow = false;
    object.receiveShadow = false;
    mouth.add(object);
  }
  buildMouth(0.14);

  // Hair: a shaped top cap, a back/side mass, a swept fringe and side pieces.
  mesh(
    new THREE.SphereGeometry(0.138, S(36), S(24), 0, Math.PI * 2, 0, Math.PI * 0.34),
    hair,
    head,
    {
      position: [0, 0.141, -0.008],
      scale: [0.94, 1.04, 0.99],
      castShadow: true,
    },
  );
  sphere(0.124, hair, head, {
    position: [0, 0.16, -0.05],
    scale: [0.98, 1.02, 0.88],
    segments: 32,
    rings: 22,
    castShadow: true,
  });
  if (variant.hairStyle === 'bun') {
    sphere(0.108, hair, head, {
      position: [0.018, 0.238, 0.068],
      scale: [1.06, 0.38, 0.63],
      rotation: [0.18, -0.3, 0.18],
      segments: 24,
      rings: 16,
      castShadow: true,
    });
    sphere(0.058, hair, head, {
      position: [-0.079, 0.205, 0.073],
      scale: [1.12, 0.35, 0.6],
      rotation: [0.2, 0.35, -0.45],
      segments: 20,
      rings: 14,
      castShadow: true,
    });
  } else {
    sphere(0.1, hair, head, {
      position: [0.01, 0.245, 0.065],
      scale: [1.08, 0.35, 0.62],
      rotation: [0.18, -0.15, 0.12],
      segments: 24,
      rings: 16,
      castShadow: true,
    });
    sphere(0.056, hair, head, {
      position: [-0.073, 0.218, 0.077],
      scale: [1.1, 0.36, 0.58],
      rotation: [0.2, 0.3, -0.35],
      segments: 20,
      rings: 14,
      castShadow: true,
    });
  }
  if (variant.hairStyle === 'bun') {
    sphere(0.064, hair, head, {
      position: [0, 0.145, -0.158],
      scale: [0.9, 1, 0.86],
      segments: 24,
      rings: 18,
      castShadow: true,
    });
    mesh(new THREE.TorusGeometry(0.031, 0.006, S(6), S(22)), scrubDark, head, {
      position: [0, 0.145, -0.108],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: false,
    });
    for (const side of [-1, 1]) {
      capsule(0.017, 0.1, hair, head, {
        position: [side * 0.102, 0.09, 0.01],
        rotation: [0.04, 0, side * 0.12],
        scale: [1, 1, 0.7],
        castShadow: false,
      });
      capsule(0.015, 0.13, hair, head, {
        position: [side * 0.108, 0.02, -0.035],
        rotation: [0.03, 0, side * 0.06],
        scale: [1, 1, 0.55],
        castShadow: false,
      });
    }
  } else {
    for (const side of [-1, 1]) {
      capsule(0.018, 0.032, hair, head, {
        position: [side * 0.113, 0.178, -0.01],
        rotation: [0.1, 0, side * 0.12],
        scale: [1, 1, 0.55],
        castShadow: false,
      });
    }
  }

  // Arms -------------------------------------------------------------------
  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * variant.shoulderX, 0.435, 0);
    shoulder.scale.set(variant.armVolume, 1, variant.armVolume);
    spine.add(shoulder);
    shapeRefs.arms.push({
      group: shoulder,
      side,
      baseX: side * variant.shoulderX,
      baseScale: variant.armVolume,
    });

    sphere(0.06, scrub, shoulder, {
      position: [0, -0.04, 0],
      scale: [1.02, 0.72, 0.94],
      segments: 22,
      rings: 16,
    });

    mesh(
      createLoftGeometry(
        S(18),
        S(16),
        (t) => {
          const ring = sampleProfile(SLEEVE_PROFILE, t);
          return { ...ring, y: 0.03 - t * 0.205 };
        },
        { band: (t) => (t > 0.9 ? 1 : 0) },
      ),
      [scrub, scrubDark],
      shoulder,
    );

    mesh(
      createLoftGeometry(S(14), S(14), (t) => {
        const ring = sampleProfile(UPPER_ARM_PROFILE, t);
        return { ...ring, y: -0.155 - t * 0.15 };
      }),
      skin,
      shoulder,
    );

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.305, 0);
    shoulder.add(elbow);
    sphere(0.043, skin, elbow, { scale: [1, 0.92, 0.98], segments: 20, rings: 16 });

    mesh(
      createLoftGeometry(S(18), S(14), (t) => {
        const ring = sampleProfile(FOREARM_PROFILE, t);
        return { ...ring, y: -0.005 - t * 0.27, z: 0.002 + t * 0.004 };
      }),
      skin,
      elbow,
    );

    const hand = new THREE.Group();
    hand.position.set(0, -0.265, 0);
    elbow.add(hand);
    sphere(0.039, skin, hand, {
      position: [0, -0.04, 0.002],
      scale: [0.8, 1.05, 0.5],
      segments: 18,
      rings: 14,
    });
    for (let index = 0; index < 4; index += 1) {
      const offset = (index - 1.5) * 0.015;
      capsule(0.0075, 0.036, skin, hand, {
        position: [offset, -0.087, 0.004],
        rotation: [0.08, 0, offset * -1.8],
        scale: [1, 1, 0.7],
      });
    }
    capsule(0.0095, 0.032, skin, hand, {
      position: [side * -0.033, -0.052, 0.012],
      rotation: [0.2, 0, side * -0.85],
      scale: [1, 1, 0.75],
    });

    return { shoulder, elbow, hand };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  shapeRefs.arms[0].elbow = leftArm.elbow;
  shapeRefs.arms[1].elbow = rightArm.elbow;

  // Animation state --------------------------------------------------------
  let currentState = getCharacterState('idle');
  let reducedMotion = false;
  let elapsed = 0;
  let nextBlink = 2.8 + Math.random() * 2.2;
  let blinkStart = -1;
  let smile = 0.14;
  let eyeOpen = 1;
  let innerBrow = 0.02;
  let browLeft = 0.08;
  let browRight = -0.08;
  let headTilt = -0.02;
  let figureRotation = 0;
  let baseSpineY = spine.position.y;
  const currentPose = {
    shoulderL: { ...REST_POSE.shoulderL },
    elbowL: { ...REST_POSE.elbowL },
    handL: { ...REST_POSE.handL },
    shoulderR: { ...REST_POSE.shoulderR },
    elbowR: { ...REST_POSE.elbowR },
    handR: { ...REST_POSE.handR },
    spineZ: 0,
    spineX: 0,
  };

  function applyPoseTargets(delta) {
    for (const key of Object.keys(currentMorphs)) {
      const target = targetMorphState.controls[key];
      if (Number.isFinite(target)) {
        currentMorphs[key] = damp(currentMorphs[key], target, SHAPE_SMOOTHING, delta);
      }
    }

    const morphState = { controls: currentMorphs };
    const torsoInfluences = getTorsoMorphInfluences(morphState);
    if (shapeRefs.torso?.morphTargetInfluences) {
      const dictionary = shapeRefs.torso.morphTargetDictionary ?? {};
      for (const [name, influence] of Object.entries(torsoInfluences)) {
        const index = dictionary[name];
        if (Number.isInteger(index)) {
          shapeRefs.torso.morphTargetInfluences[index] = influence;
        }
      }
    }

    const torsoWidthDelta = getMorphDelta(morphState, 'torso_width');
    const waistDelta = getMorphDelta(morphState, 'waist_width');
    const abdomenDelta = getMorphDelta(morphState, 'abdomen_volume');
    const chestDelta = getMorphDelta(morphState, 'chest_volume');
    const upperArmDelta = getMorphDelta(morphState, 'upper_arm_volume');
    const forearmDelta = getMorphDelta(morphState, 'forearm_volume');
    const thighDelta = getMorphDelta(morphState, 'thigh_volume');
    const legDelta = getMorphDelta(morphState, 'leg_volume');
    const hipDelta = getMorphDelta(morphState, 'hip_width');

    if (shapeRefs.frontDetails) {
      shapeRefs.frontDetails.position.z = torsoInfluences.abdomen_volume * 0.055
        + torsoInfluences.chest_volume * 0.018
        - torsoInfluences.lean * 0.006;
    }

    if (shapeRefs.pelvis) {
      shapeRefs.pelvis.mesh.scale.x = shapeRefs.pelvis.baseScale[0] * (1 + hipDelta * 0.18);
      shapeRefs.pelvis.mesh.scale.z = shapeRefs.pelvis.baseScale[2]
        * (1 + abdomenDelta * 0.08 + hipDelta * 0.08);
    }
    if (shapeRefs.neck) {
      const neckScale = 1 + Math.max(0, abdomenDelta) * 0.045 - Math.max(0, -abdomenDelta) * 0.03;
      shapeRefs.neck.scale.x = neckScale;
      shapeRefs.neck.scale.z = neckScale;
    }

    for (const arm of shapeRefs.arms) {
      arm.group.position.x = arm.baseX * (1 + torsoWidthDelta * 0.1 + upperArmDelta * 0.03);
      const upperGrowth = upperArmDelta >= 0 ? 0.48 : 0.32;
      const upperScale = arm.baseScale * (1 + upperArmDelta * upperGrowth);
      arm.group.scale.x = upperScale;
      arm.group.scale.z = upperScale;
      if (arm.elbow) {
        const forearmGrowth = forearmDelta >= 0 ? 0.42 : 0.28;
        const forearmScale = 1 + forearmDelta * forearmGrowth;
        arm.elbow.scale.x = forearmScale;
        arm.elbow.scale.z = forearmScale;
      }
    }

    for (const leg of shapeRefs.legs) {
      leg.group.position.x = leg.baseX * (1 + hipDelta * 0.12 + abdomenDelta * 0.03);
      const thighGrowth = thighDelta >= 0 ? 0.24 : 0.15;
      const legGrowth = legDelta >= 0 ? 0.18 : 0.12;
      const legScale = 1 + thighDelta * thighGrowth + legDelta * legGrowth;
      leg.group.scale.x = leg.baseScaleX * legScale;
      leg.group.scale.z = leg.baseScaleZ * legScale;
    }

    for (const shoe of shapeRefs.shoes) {
      shoe.group.position.x = shoe.baseX * (1 + hipDelta * 0.1 + abdomenDelta * 0.03);
    }

    const gesture = GESTURE_POSES[currentState.gesture] ?? REST_POSE;
    const expression = EXPRESSION_TARGETS[currentState.expression] ?? EXPRESSION_TARGETS.warm;
    const armDrift = reducedMotion ? 0 : Math.sin(elapsed * 1.2) * 0.01;
    const breath = reducedMotion ? 0 : Math.sin(elapsed * 1.45) * 0.5 + 0.5;
    const gaze = reducedMotion ? 0 : Math.sin(elapsed * 0.38) * 0.035;
    const nod = reducedMotion ? 0 : Math.sin(elapsed * 0.6 + 1.1) * 0.012;

    dampVec(currentPose.shoulderL, gesture.shoulderL, 4.8, delta);
    dampVec(currentPose.elbowL, gesture.elbowL, 5.2, delta);
    dampVec(currentPose.handL, gesture.handL, 5, delta);
    dampVec(currentPose.shoulderR, gesture.shoulderR, 4.8, delta);
    dampVec(currentPose.elbowR, gesture.elbowR, 5.2, delta);
    dampVec(currentPose.handR, gesture.handR, 5, delta);
    currentPose.spineZ = damp(currentPose.spineZ, gesture.spineZ, 4.5, delta);
    currentPose.spineX = damp(currentPose.spineX, gesture.spineX, 4.5, delta);

    leftArm.shoulder.rotation.x = currentPose.shoulderL.x + armDrift;
    leftArm.shoulder.rotation.z = currentPose.shoulderL.z;
    leftArm.elbow.rotation.x = currentPose.elbowL.x;
    leftArm.elbow.rotation.z = currentPose.elbowL.z;
    leftArm.hand.rotation.x = currentPose.handL.x;
    leftArm.hand.rotation.y = currentPose.handL.y;
    leftArm.hand.rotation.z = currentPose.handL.z;

    rightArm.shoulder.rotation.x = currentPose.shoulderR.x + armDrift;
    rightArm.shoulder.rotation.z = currentPose.shoulderR.z;
    rightArm.elbow.rotation.x = currentPose.elbowR.x;
    rightArm.elbow.rotation.z = currentPose.elbowR.z;
    rightArm.hand.rotation.x = currentPose.handR.x;
    rightArm.hand.rotation.y = currentPose.handR.y;
    rightArm.hand.rotation.z = currentPose.handR.z;

    spine.rotation.z = damp(spine.rotation.z, currentPose.spineZ, 3.5, delta);
    spine.rotation.x = damp(spine.rotation.x, currentPose.spineX, 3.5, delta);
    spine.position.y = damp(spine.position.y, baseSpineY + breath * 0.0045, 4, delta);
    head.rotation.y = damp(head.rotation.y, gaze, 2.5, delta);
    head.rotation.x = damp(head.rotation.x, nod + expression.headTilt * 0.2, 3.2, delta);
    head.rotation.z = damp(head.rotation.z, expression.headTilt, 3.2, delta);

    smile = damp(smile, expression.smile, 4.2, delta);
    innerBrow = damp(innerBrow, expression.innerBrow, 4, delta);
    eyeOpen = damp(eyeOpen, expression.eyeOpen, 4, delta);
    browLeft = damp(browLeft, expression.brows.left, 4, delta);
    browRight = damp(browRight, expression.brows.right, 4, delta);
    headTilt = damp(headTilt, expression.headTilt, 3.2, delta);
    figureRotation = damp(figureRotation, currentPose.spineZ * 0.35, 3, delta);
    figure.rotation.z = figureRotation;

    buildMouth(smile);

    // Eyebrows: rotating the two capsules creates a surprisingly expressive
    // range while keeping the face synthetic rather than cartoonish.
    brows[0].rotation.z = browLeft;
    brows[1].rotation.z = browRight;

    // Blink. Scaling the eye group is intentionally subtle at this scale and
    // reads as a lid rather than a cartoon squash.
    let blinkScale = 1;
    if (!reducedMotion) {
      const now = elapsed;
      if (blinkStart < 0 && now >= nextBlink) {
        blinkStart = now;
      }
      if (blinkStart >= 0) {
        const phase = (now - blinkStart) / 0.16;
        if (phase >= 1) {
          blinkStart = -1;
          nextBlink = now + 2.6 + Math.random() * 3.3;
        } else {
          blinkScale = 1 - Math.sin(phase * Math.PI) * 0.92;
        }
      }
    }
    const eyeScale = eyeOpen * blinkScale;
    for (const eye of eyeGroups) {
      eye.scale.y = Math.max(0.055, eyeScale);
      eye.rotation.y = gaze * 0.2;
    }

    torso.scale.y = 1 + (reducedMotion ? 0 : Math.sin(elapsed * 1.45) * 0.0025);
  }

  let modelStyle = 'natural';
  let materialOriginals = null;

  function captureMaterialOriginals() {
    if (materialOriginals) return;
    materialOriginals = [...materials].map((entry) => ({
      material: entry,
      color: entry.color?.clone() ?? null,
      roughness: entry.roughness,
      metalness: entry.metalness,
      wireframe: entry.wireframe,
      transparent: entry.transparent,
      opacity: entry.opacity,
      emissive: entry.emissive?.clone() ?? null,
      emissiveIntensity: entry.emissiveIntensity,
    }));
  }

  function applyModelStyle(style) {
    const next = style === 'clay' || style === 'scan' ? style : 'natural';
    captureMaterialOriginals();
    if (next === modelStyle && next !== 'natural') return;
    modelStyle = next;

    for (const original of materialOriginals) {
      const entry = original.material;
      if (!entry) continue;
      if (next === 'natural') {
        if (original.color && entry.color) entry.color.copy(original.color);
        entry.roughness = original.roughness;
        entry.metalness = original.metalness;
        entry.wireframe = original.wireframe;
        entry.transparent = original.transparent;
        entry.opacity = original.opacity;
        if (original.emissive && entry.emissive) entry.emissive.copy(original.emissive);
        entry.emissiveIntensity = original.emissiveIntensity;
      } else if (next === 'clay') {
        entry.color?.set(0xd4c5b5);
        entry.roughness = 0.8;
        entry.metalness = 0.02;
        entry.wireframe = false;
        entry.transparent = false;
        entry.opacity = 1;
        if (entry.emissive) entry.emissive.set(0x000000);
        entry.emissiveIntensity = 0;
      } else {
        entry.color?.set(0x38bdf8);
        entry.roughness = 0.3;
        entry.metalness = 0.18;
        entry.wireframe = true;
        entry.transparent = true;
        entry.opacity = 0.82;
        if (entry.emissive) entry.emissive.set(0x0284c7);
        entry.emissiveIntensity = 0.38;
      }
      entry.needsUpdate = true;
    }
  }

  return {
    group: root,
    setState(stateKey) {
      currentState = getCharacterState(stateKey);
    },
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) blinkStart = -1;
    },
    setBmi(bmi) {
      targetMorphState = getBodyMorphsForBmi(bmi);
    },
    setBodyMorphs(morphState) {
      if (morphState?.controls) targetMorphState = morphState;
    },
    setAnthropometrics({ heightCm } = {}) {
      targetHeightScale = heightScaleFor(heightCm);
    },
    setModelStyle(style) {
      applyModelStyle(style);
    },
    getModelStyle() {
      return modelStyle;
    },
    getBodyMorphs() {
      return { ...currentMorphs };
    },
    getGender() {
      return variant.key;
    },
    update(delta) {
      const step = Math.min(delta, 0.05);
      elapsed += step;
      currentHeightScale = damp(currentHeightScale, targetHeightScale, 3.2, step);
      const widthScale = 1 + (currentHeightScale - 1) * 0.3;
      figure.scale.set(widthScale, currentHeightScale, widthScale);
      applyPoseTargets(step);
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((entry) => entry.dispose());
      textures.forEach((texture) => texture.dispose());
      geometries.clear();
      materials.clear();
      textures.clear();
      root.clear();
    },
  };
}
