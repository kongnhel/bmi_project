/**
 * Production character configuration.
 *
 * No GLB is bundled with this repository. When a licensed, optimized and
 * rigged character becomes available, add its file under assets/models/ and
 * set `modelUrl` to its relative URL. Until then the procedural 3D guide is
 * used. This module deliberately contains no fake or third-party asset URL.
 */
export const MODEL_CONFIG = Object.freeze({
  modelUrl: null,
  scale: 1,
  facing: 'front',
  castShadow: true,
  animations: Object.freeze({
    idle: 'Idle',
    underweight: 'Caring',
    healthy: 'Welcome',
    overweight: 'Explain',
    obesity1: 'Support',
    obesity2: 'Empathetic',
    obesity3: 'Support',
  }),
  bodyMorphs: Object.freeze({
    lean: 'BodyLean',
    torso_width: 'torso_width',
    waist_width: 'waist_width',
    abdomen_volume: 'abdomen_volume',
    chest_volume: 'chest_volume',
    upper_arm_volume: 'upper_arm_volume',
    forearm_volume: 'forearm_volume',
    thigh_volume: 'thigh_volume',
    leg_volume: 'leg_volume',
    hip_width: 'hip_width',
  }),
  /**
   * Growth targets are relative to the average body. Limb and hip targets are
   * optional; omit them when the delivered rig uses non-uniform bone scaling.
   * Morph target names are intentionally configurable. The defaults use
   * ARKit-style blendshape names commonly found on production avatar rigs.
   * Adjust these names to match the delivered GLB.
   */
  expressions: Object.freeze({
    warm: Object.freeze({
      mouthSmileLeft: 0.12,
      mouthSmileRight: 0.12,
    }),
    happy: Object.freeze({
      mouthSmileLeft: 0.62,
      mouthSmileRight: 0.62,
      cheekSquintLeft: 0.28,
      cheekSquintRight: 0.28,
      browInnerUp: 0.12,
    }),
    caring: Object.freeze({
      mouthSmileLeft: 0.18,
      mouthSmileRight: 0.18,
      browInnerUp: 0.4,
      mouthPressLeft: 0.08,
      mouthPressRight: 0.08,
    }),
    thoughtful: Object.freeze({
      mouthSmileLeft: 0.08,
      mouthSmileRight: 0.08,
      browDownLeft: 0.15,
      browInnerUp: 0.2,
    }),
    empathetic: Object.freeze({
      browInnerUp: 0.52,
      mouthFrownLeft: 0.16,
      mouthFrownRight: 0.16,
      mouthPressLeft: 0.12,
      mouthPressRight: 0.12,
    }),
  }),
  requiredClips: Object.freeze([
    'Idle',
    'Caring',
    'Welcome',
    'Explain',
    'Support',
    'Empathetic',
  ]),
});
