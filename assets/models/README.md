# 3D character asset workflow

No production GLB is bundled. The live application uses a shared procedural Three.js character system with male and female variations and real procedural body morph targets. It does not fake the result with whole-model scaling.

A production GLB can replace the procedural character when a licensed asset is available.

## Current procedural system

- Male and female variants share one rig, gesture vocabulary, facial controls and animation loop.
- Gender changes rebuild the shared character while preserving BMI results, camera position, theme, reduction preferences and current expression state.
- Body shape is driven by the actual unrounded BMI through nine normalized controls. There is no category snap and no whole-character scaling.
- The torso and fitted clothing use real morph targets:
  - `BodyLean` — shoulder and waist slimming below the average reference.
  - `torso_width` — upper-torso and shoulder growth.
  - `waist_width` — waist growth.
  - `abdomen_volume` — lower-abdomen and clothing volume.
  - `chest_volume` — chest and ribcage growth.
- Rig-compatible non-uniform segment scaling applies the remaining controls: `upper_arm_volume`, `forearm_volume`, `thigh_volume`, `leg_volume` and `hip_width`.
- Body transitions use damped continuous interpolation, not discrete snaps.

## BMI-to-body mapping

The controller interpolates the nine controls through these actual-BMI anchors:

```text
15, 16, 17, 18.5, 22, 25, 30, 35, 40, 50
```

Smoothstep interpolation is used between anchors, so the body does not jump at 18.5, 25, 30, 35 or 40. The normalized control vector is produced by `getBodyMorphsForBmi()` in `src/character/body-shape.js`.

| Illustrative display state | Typical BMI range | UI label |
| --- | --- | --- |
| Lean | `< 18.5` | Lean |
| Average | `18.5–24.9` | Average |
| Larger | `25.0–34.9` | Larger |
| Very large | `≥ 35.0` | Very large |

The UI labels the figure as illustrative and states that BMI cannot determine actual body shape, fat distribution, muscle mass or appearance.

### Morph controller contract

`src/character/body-shape.js` exposes:

- `BODY_MORPH_CONTROLS` — the nine required control names.
- `BODY_MORPH_ANCHORS` — the BMI interpolation knots.
- `BODY_MORPH_BASELINE` — average-reference control values at BMI 22.
- `getBodyMorphsForBmi(bmi)` — continuous 0–1 controls plus thinness class.
- `getTorsoMorphInfluences(morphState)` — torso/clothing influences.
- `getModelMorphInfluences(morphState)` — all nine growth influences plus `lean` for a production GLB.
- `getMorphDelta(morphState, key)` — signed deviation for procedural limb scaling.

`src/character/assistant-scene.js` exposes `updateCharacter({ gender, bmi, categoryKey, animationState })`. The assistant calls it on every valid BMI result, including BMI changes inside the same category.

## Replacing the procedural preview with GLB models

1. Add licensed, optimized male and female GLBs under this directory. Example names:
   - `assets/models/wellness-assistant-male.glb`
   - `assets/models/wellness-assistant-female.glb`
2. Set `modelUrl` in `src/character/config.js`. The current loader is configured for one production model at a time; to load both, extend the config and scene selector to choose by `gender` before calling the same GLTF loading path.
3. Match or update the clip names, facial morph names and body morph names in `src/character/config.js`.
4. Add the nine growth targets and `BodyLean` as relative shape keys. The optional limb/hip targets may be omitted if the delivered rig uses non-uniform bone scaling instead.
5. Run `npm test`, `npm run verify`, and `npm run build`.
6. Test both genders in light/dark, desktop/mobile, reduced-motion and WebGL fallback conditions.

The reference GLB is normalized automatically to approximately 1.8 scene units and positioned with its feet at the platform.

## Male and female production variants

Create and validate both bodies separately, even when they share one skeleton contract:

1. Start from the same humanoid skeleton hierarchy, scale convention, forward axis and animation clip set.
2. Keep the male and female identities distinct in the face, hairline, shoulder-to-hip ratio, chest and pelvis. Do not use only a uniform body scale to differentiate them.
3. Use the same material slot names and rig controls where practical so one scene adapter can drive both.
4. Create the `BodyLean` target and nine growth targets on each variant with the same names and neutral influence at BMI 22.
5. Apply the shape keys to both skin and fitted clothing. Check the neckline, sleeves, waistband and trouser seams independently on each variant.
6. Export two GLBs with embedded textures and the same required animation clip names.
7. Extend `MODEL_CONFIG` to select the model by gender, or run separate scene instances if the deployment prefers separate files.
8. Verify switching genders preserves the current BMI, camera and animation state, and reloads the stored preference.
9. Inspect both models at BMI 16, 22, 25, 30, 35 and 40 in light/dark themes before deployment.

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
2. Create a `Basis` shape key for the average body at BMI 22.
3. Create relative growth shape keys named exactly, with zero influence at the average body:
   - `torso_width` — widen the upper torso and shoulders while preserving the face.
   - `waist_width` — widen the waist and side seams.
   - `abdomen_volume` — add lower-abdomen volume, a gentle forward projection, and matching clothing volume.
   - `chest_volume` — raise and widen the chest and ribcage modestly.
   - `upper_arm_volume` — increase upper-arm circumference and sleeve fit.
   - `forearm_volume` — increase forearm circumference and sleeve fit.
   - `thigh_volume` — increase thigh volume with matching trouser fit.
   - `leg_volume` — increase lower-leg volume.
   - `hip_width` — widen the pelvis and trouser seat.
   - `BodyLean` — narrow the waist and shoulders below the average reference.
4. Keep the face, hands and feet out of the body-size shape keys. Preserve identity, gesture quality and rig weights.
5. Set all shape keys to `Relative` and zero them before exporting so the GLB has clean neutral influences.
6. Test every shape at `0`, `0.25`, `0.5`, `0.75` and `1` alongside every animation. Check the waist, sleeves, trouser seams, hands and face for clipping or collapse.
7. Export selected objects with skinning, animations, morph targets and embedded textures.
8. Set `MODEL_CONFIG.bodyMorphs` to the target names if they differ from the defaults.
9. Add optional inverse/lean limb targets and extend the adapter if the production rig cannot use non-uniform bone scaling for below-average limb volume. The procedural model already handles both growth and lean directions through segment scaling.
10. Inspect the generated GLB in `gltf-report` or Blender after re-import before deploying.

The scene drives `morphTargetInfluences` with smooth interpolation. It will not randomize body shape, and it will not uniformly scale the character.

## Licensing and attribution

Add the model license and attribution beside each asset. Do not deploy a model unless its license permits redistribution and commercial use in this application.
