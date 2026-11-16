# 3D character asset workflow

No production GLB is bundled. The live application uses a shared procedural Three.js character system with male and female variations and real procedural body morph targets. It does not fake the result with whole-model scaling.

A production GLB can replace the procedural character when a licensed asset is available.

## Current procedural system

- Male and female variants share one rig, gesture vocabulary, facial controls and animation loop.
- Gender changes rebuild the shared character while preserving BMI results, camera position, theme, reduction preferences and current expression state.
- Body volume is driven by a real torso morph target pair:
  - `BodyLean` — shoulder/waist slimming for underweight.
  - `BodyVolume` — abdomen, waist and chest volume for higher BMI ranges.
- Additional rig-compatible part scaling adjusts upper-arm volume, thigh volume, shoulder spacing, hip spacing and clothing volumes.
- Body transitions use damped continuous interpolation, not discrete snaps and not whole-character scaling.

## BMI-to-body mapping

| BMI state | Body level | Illustrative label |
| --- | ---: | --- |
| Underweight | `-1.0` | Lean |
| Healthy weight | `0` | Average |
| Overweight | `0.42` | Larger |
| Obesity Class I | `0.65` | Larger |
| Obesity Class II | `0.84` | Very large |
| Obesity Class III | `1.0` | Very large |

The mapping lives in `src/character/body-shape.js`. The UI labels the figure as illustrative and states that BMI cannot determine actual body shape, fat distribution, muscle mass or appearance.

## Replacing the procedural preview with GLB models

1. Add licensed, optimized male and female GLBs under this directory. Example names:
   - `assets/models/wellness-assistant-male.glb`
   - `assets/models/wellness-assistant-female.glb`
2. Set `modelUrl` in `src/character/config.js`. The current loader is configured for one production model at a time; to load both, extend the config and scene selector to choose by `gender` before calling the same GLTF loading path.
3. Match or update the clip names, facial morph names and body morph names in `src/character/config.js`.
4. Run `npm test`, `npm run verify`, and `npm run build`.
5. Test both genders in light/dark, desktop/mobile, reduced-motion and WebGL fallback conditions.

The reference GLB is normalized automatically to approximately 1.8 scene units and positioned with its feet at the platform.

## Model specification

- Adult wellness assistant with realistic-stylized proportions.
- Two distinct male/female variants sharing the same skeleton hierarchy and animation contract.
- `+Z` forward, feet at approximately `y = 0`.
- Properly skinned humanoid skeleton with stable rest pose.
- GLB format with embedded textures.
- PBR materials, ideally at 1024px.
- Target ≤ 60k triangles and ≤ 8 MB per model for mobile delivery.
- No unlicensed scans or third-party likenesses.

## Required animation clips

The clips must be named exactly as configured in `src/character/config.js`:

- `Idle`
- `Caring`
- `Welcome`
- `Explain`
- `Support`
- `Empathetic`

Clips should loop cleanly. The scene crossfades between them based on the BMI category.

## Optional facial blend shapes

The default expression mapping uses ARKit-style names:

- `mouthSmileLeft`
- `mouthSmileRight`
- `cheekSquintLeft`
- `cheekSquintRight`
- `browInnerUp`
- `browDownLeft`
- `mouthPressLeft`
- `mouthPressRight`
- `mouthFrownLeft`
- `mouthFrownRight`

Edit `MODEL_CONFIG.expressions` if the delivered rig uses different names. If no facial shapes exist, the GLB still works with body animation and the assistant copy.

## Blender body-shape workflow

Use this workflow when preparing production GLB shape keys:

1. Use the final skinned character with the armature in its rest pose.
2. Create a `Basis` shape key for the average body.
3. Create relative shape keys named exactly:
   - `BodyLean` — narrow the waist and shoulders slightly, without changing the face or rig.
   - `BodyVolume` — add lower-abdomen and waist volume, a gentle forward abdomen projection, and a modest upper-chest width increase.
4. Sculpt with symmetry; keep vertex counts, UVs, weights, materials and bones unchanged.
5. Do not shape-key the face, hands or feet for body-size changes. Preserve face identity and hand/gesture quality.
6. Set all shape keys to `Relative` and zero them before exporting so the GLB has clean neutral influences.
7. Test each shape at 0, 0.25, 0.5, 0.75 and 1 alongside every animation to confirm no mesh collapse or bone deformation.
8. Export selected objects with skinning, animations, morph targets and embedded textures.
9. Set `MODEL_CONFIG.bodyMorphs` to the target names if they differ from the defaults.
10. Inspect the generated GLB in `gltf-report` or Blender after re-import before deploying.

The scene drives `morphTargetInfluences` with smooth interpolation. It will not randomize body shape, and it will not uniformly scale the character.

## Licensing and attribution

Add the model license and attribution beside each asset. Do not deploy a model unless its license permits redistribution and commercial use in this application.
