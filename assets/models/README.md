# 3D character asset requirements

No production GLB is bundled yet. The app intentionally ships with an interactive procedural Three.js wellness guide instead of referencing a missing or third-party model promise.

To use a bespoke, licensed, rigged character:

1. Place the optimized model in this directory, for example:
   `assets/models/wellness-assistant.glb`
2. Set `modelUrl` in `src/character/config.js` to `'./assets/models/wellness-assistant.glb'`.
3. Adjust `scale` and, if needed, the animation or morph-target names in the same config file.
4. Run `npm test`, `npm run verify`, and `npm run build`.

## Model specification

- Stylized-realistic young adult, gender-neutral or male wellness assistant.
- Human proportions, medically appropriate modern clothing, friendly neutral expression.
- Properly skinned humanoid skeleton with a stable rest pose.
- Facing `+Z`, feet at approximately `y = 0`.
- Height can be any unit; the scene normalizes it to approximately 1.8 scene units.
- GLB format, binary textures embedded.
- PBR materials with 1024px textures where possible.
- Target ≤ 60k triangles and ≤ 8 MB for mobile-first delivery.
- Draco compression is supported by the loader dependency set only if a Draco decoder is added later; uncompressed GLB is the default.
- No unlicensed scans or third-party likenesses.

## Required animation clips

The clips must be named exactly as configured in `src/character/config.js`:

- `Idle`
- `Caring`
- `Welcome`
- `Explain`
- `Support`
- `Empathetic`

Clips should loop cleanly. The scene crossfades between clips based on the BMI category.

## Optional facial blend shapes

The default expression map uses ARKit-style target names:

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

If the delivered rig uses different names, edit `MODEL_CONFIG.expressions`; no scene code changes are required. If the GLB has no facial morph targets, the app still works using the body animation and the contextual assistant copy.

## Licensing and attribution

Add the model's license and attribution beside the asset. Do not deploy a model unless its license permits redistribution and commercial use of the character in this application.
