# Black Box — BMI Calculator & 3D Wellness Guide

A bilingual, privacy-first BMI screening experience with a real-time interactive 3D wellness guide.

**Live site:** https://kongnhel.github.io/bmi_project/

The original repository was a small static BMI page. This iteration preserves its Black Box branding, Khmer audience, and zero-backend privacy model, then adds a production-quality product shell, a live Three.js character system, local history, accessibility, and a GLB-ready character pipeline.

## The 3D wellness guide

The character is rendered with Three.js inside a lazy-loaded WebGL scene. It is not a PNG, video, emoji, or pre-rendered animation.

The bundled character is a **procedural articulated Three.js assistant** that stands in for the final production GLB. It has:

- A human-proportioned 3D body built from real geometry with male and female variants sharing one rig and animation system.
- A gender selector with two runtime-rendered 3D portrait previews, instant switching and locally remembered preference.
- A real torso morph-target pair (`BodyLean`, `BodyVolume`) driven by `morphTargetInfluences`, plus non-uniform part scaling for upper arms, thighs, shoulders, hips and clothing volume.
- Smooth BMI-driven transitions between lean, average, larger and very-large illustrative body shapes.
- Articulated shoulders, elbows, hands, neck and head.
- A medical-inspired wardrobe with scrub top, badge and stethoscope that moves with the body volume.
- A facial rig with eyes, blinking, eyebrows and a dynamically rebuilt mouth curve.
- A procedural skin, fabric and hair material set with generated micro-textures.
- Male short hair and a professionally tied female variation with distinct facial and body proportions.
- Studio lighting, contact shadows, an environment map and an interactive camera.
- Six BMI reactions with distinct expression and gesture targets.
- Smooth damping between gestures and expressions.
- Idle breathing, blinking, head movement and a friendly default expression.
- Pointer drag rotation, pinch/wheel zoom, accessible camera buttons and reset.
- Lazy loading near the viewport, offscreen render pausing, capped pixel ratio and full disposal.
- Reduced-motion support that removes idle movement while keeping user-controlled camera interaction.
- A 2D fallback and guidance when WebGL is unavailable.
- Optional speech synthesis, **off by default**, controlled by the user.

### BMI-driven states

| BMI category | Character response | Illustrative body shape |
| --- | --- | --- |
| Underweight | Caring expression, head tilt, open supportive hand | Lean |
| Healthy weight | Smile, welcoming open gesture | Average |
| Overweight | Thoughtful expression, calm explaining gesture | Larger |
| Obesity Class I | Caring expression, open reassuring palms | Larger |
| Obesity Class II | Empathetic expression, reassuring open gesture | Very large |
| Obesity Class III | Empathetic expression, respectful supportive gesture | Very large |

Body size is shown as a clearly labeled **illustrative visualization only**. It is not a prediction or representation of a user's real body, body-fat distribution, muscle mass or appearance. All copy is non-stigmatizing and the application states clearly that BMI is a screening indicator, not a diagnosis or a measure of personal worth. The character is a wellness guide, not a clinician.

## Replacing the procedural character with a production GLB

The project includes a real GLB loading path:

- `src/character/config.js` — model URL, animation clip names, body and facial morph-target maps and scale.
- `src/character/model-loader.js` — lazy `GLTFLoader` import and GLB loading.
- `src/character/assistant-scene.js` — model normalization, AnimationMixer crossfades, facial and body morph blending, shadow setup and graceful fallback.
- `vendor/three/addons/loaders/GLTFLoader.js` — self-hosted loader.
- `assets/models/README.md` — complete male/female model, Blender shape-key, animation, facial-shape and licensing workflow.

No GLB is bundled today, and no fake model URL is referenced. `modelUrl` is intentionally `null` until licensed, optimized male and female characters are supplied. The procedural assistant remains available as a polished fallback during that transition.

The GLB integration expects named clips (`Idle`, `Caring`, `Welcome`, `Explain`, `Support`, `Empathetic`), optional ARKit-style facial blend shapes and optional `BodyLean` / `BodyVolume` shape keys. These are configurable without rewriting scene code. Because the current config accepts one model URL, adding two production gender models requires a small config/scene-selector extension; the procedural shared variant system does not.

## Product features

### Calculator and results

- Live BMI calculation with the standard formula: weight (kg) ÷ height (m)².
- Metric (`kg` / `cm`) and imperial (`lb` / `ft` / `in`) units.
- Unit switching preserves the current measurement.
- Decimal, comma-decimal and Khmer-digit input.
- Validation for empty, malformed, zero, negative and unrealistic values.
- Results update while typing; explicit submit and Enter-key support.
- Unrounded classification with rounded display.
- Animated gauge, healthy BMI range, healthy weight range and weight delta.
- Comparison with the most recent saved check-in.
- Adult category boundaries:

| Category | BMI |
| --- | --- |
| Underweight | `< 18.5` |
| Healthy weight | `18.5–24.9` |
| Overweight | `25.0–29.9` |
| Obesity Class I | `30.0–34.9` |
| Obesity Class II | `35.0–39.9` |
| Obesity Class III | `≥ 40.0` |

### Assistant experience

- Contextual speech bubble that reacts to every calculated result.
- Every category maps to a tested character state and illustrative body shape.
- Male and female character cards with two runtime-rendered 3D preview portraits.
- Gender switching preserves the current BMI, camera and character state; the choice is stored locally.
- Body volumes morph smoothly using procedural torso morph targets and non-uniform part scaling.
- Character state also updates when a result is cleared or becomes invalid.
- The assistant section is linked from the main navigation and the result card.
- A permanently visible disclaimer states that body visualization is illustrative and cannot determine real body shape, fat distribution, muscle mass or appearance.
- Voice synthesis is disabled by default and never required.
- WebGL and device capability fallback.
- The character is local to the page; no health data is uploaded.

### Local history and privacy

- History is off until the user consents.
- Up to 50 entries stored in `localStorage` under `blackbox.bmi.v1`.
- Individual deletion with undo.
- Clear-all with confirmation.
- Save result action prevents duplicate entries for the same result.
- Delete-all-data control in Preferences.
- Optional age is used only to flag that adult BMI categories may not apply.
- Preferences (theme, language, units, character gender), optional age and history stay in the browser.
- No accounts, analytics, advertising trackers, backend, or health-data network requests.
- Fonts and Three.js are self-hosted; no runtime CDN dependency.

### Theming, localization and accessibility

- Full English and Khmer interfaces, including dynamic assistant messages and reports.
- Light and dark themes with system preference detection and persisted choice.
- Khmer month names implemented locally rather than relying on inconsistent browser locale data.
- Semantic headings, labels, error messages, landmarks and lists.
- Keyboard-accessible navigation, camera controls, form fields and dialogs.
- `aria-live` result, assistant and engine-status announcements.
- Focus-visible styles, 44px-class mobile touch controls and reduced-motion handling.
- Automated axe-core audit: zero violations across tested light/dark, English/Khmer, desktop/mobile and dialog states.

### Reports

- Print-friendly A4 BMI report.
- Browser print dialog can save as PDF.
- Includes current result, category, measurements, healthy range, guidance, recent history and the safety disclaimer.
- No server generation or hidden data collection.

## Tech stack

- Semantic HTML.
- One CSS file with design tokens, themes, responsive rules and print styles.
- Vanilla ES modules.
- Three.js 0.180.0, vendored and MIT licensed.
- Self-hosted WOFF2 fonts (DM Sans and Kantumruy Pro, SIL OFL).
- Node's built-in test runner.
- Dependency-free static server and verification/build scripts.

There is still no application framework and no backend. The existing static GitHub Pages deployment model was preserved.

## Project structure

```text
.
├── index.html
├── style.css
├── favicon.svg
├── black_box.jpg
├── assets/
│   └── models/README.md          # GLB production asset contract
├── fonts/
│   ├── dm-sans-latin.woff2
│   ├── kantumruy-pro-khmer.woff2
│   └── OFL-*.txt
├── src/
│   ├── app.js                    # Calculator, history, dialogs, reports, app state
│   ├── assistant.js              # Assistant UI, lazy loading, voice, fallback
│   ├── bmi.js                    # Pure BMI and validation logic
│   ├── format.js                 # Dates, units, formatting, HTML escaping
│   ├── gauge.js                  # SVG BMI gauge
│   ├── i18n.js                   # English/Khmer dictionaries
│   ├── report.js                 # Printable report
│   ├── store.js                  # localStorage normalization
│   └── character/
│       ├── assistant-scene.js    # Three.js scene, gender switching, GLB upgrade
│       ├── body-shape.js         # BMI-to-body levels and morph weights
│       ├── config.js             # GLB clips, body and facial morph mapping
│       ├── human.js              # Procedural male/female character and shape rig
│       ├── model-loader.js       # Lazy GLTFLoader path
│       ├── preview.js            # Runtime 3D portraits for gender cards
│       └── state.js              # Six BMI character states
├── tests/
│   ├── bmi.test.js
│   ├── body-shape.test.js
│   ├── character-state.test.js
│   ├── format.test.js
│   ├── i18n.test.js
│   └── store.test.js
├── scripts/
│   ├── build.js
│   ├── serve.js
│   └── verify.js
├── vendor/
│   ├── README.md
│   └── three/
│       ├── LICENSE
│       ├── three.module.min.js
│       ├── three.core.min.js
│       └── addons/
├── package.json
└── .nojekyll
```

## Run locally

Node.js 18+ is required for the local server and tests.

```bash
npm start
```

Open `http://localhost:4173`. Serve over HTTP; ES modules do not work from a `file://` URL.

## Test, verify and build

```bash
npm test        # 42 unit tests
npm run verify  # assets, module imports, IDs, i18n, vendor and deployment checks
npm run build   # tests + verification + optional dist/ artifact
```

Current verification status:

- 42 unit tests passing.
- Structural, asset, import, translation and deployment verification passing.
- Browser QA in headless Chrome at 320, 390, 768, 1000 and 1440 px.
- BMI boundary, character-state and body-shape mapping tests for all six categories.
- Male/female selection verified by distinct rendered previews, character changes, result preservation and reload persistence.
- Lean/average/larger/very-large states verified with rendered stage changes.
- Runtime-rendered 3D portraits verified in gender cards.
- Real WebGL render verified with software WebGL.
- Camera rotate/zoom/reset verified by rendered-frame changes.
- Lazy Three.js loading verified by network timing.
- 2D fallback verified with WebGL disabled.
- Base-path rendering verified under `/bmi_project/`.
- Zero axe-core violations in the tested states.
- Zero runtime console errors in the success and fallback paths.

## Deploy to GitHub Pages

The repository root is the deployable site. All asset, vendor and module paths are relative, so the existing Pages URL works without base-path configuration.

1. Set GitHub Pages to deploy from `main` and `/ (root)`.
2. Commit and push the changes.
3. No build command is required. `.nojekyll` disables Jekyll processing.

`npm run build` creates an optional static `dist/` artifact for a separate deployment pipeline. It includes the app, fonts, vendor files and `assets/` documentation.

## Privacy details

Stored under `blackbox.bmi.v1`:

- `language`: `en` or `km`
- `theme`: `light`, `dark`, or `null` for system
- `unit`: `metric` or `imperial`
- `gender`: `male` or `female`
- `age`: optional whole number from 2 to 120
- `historyConsent`: boolean
- `history`: up to 50 entries with timestamp, BMI, category, canonical weight/height and optional age

The current form input is not persisted automatically. History is only saved after explicit consent. Speech synthesis runs through the browser's local speech engine; no text is sent to this project's servers. No analytics or third-party font/3D requests exist.

## Medical safety

BMI is a screening indicator for adults. It is not a diagnosis, does not measure body fat directly, does not distinguish muscle from fat, and does not capture fat distribution or individual health. Adult BMI categories should not be applied automatically to children or teenagers. Pregnancy, older age, athletic build and some health conditions change how BMI should be interpreted. The app recommends qualified healthcare professionals where appropriate and avoids guaranteed health claims.

## Known limitations

- The bundled male/female characters are procedural stylized 3D previews, not final photorealistic or custom-rigged GLBs. No licensed production models were supplied; the loader, body/shape-key contract and documentation are ready.
- The procedural system uses real torso morph targets plus rig-compatible part scaling, but its body model is still an illustrative approximation. BMI cannot determine actual body shape or composition, and the UI states this clearly.
- The procedural placeholder uses articulated object groups and procedural facial controls rather than a formal skinned skeleton with facial blend shapes. The production GLB path supports skinned models, AnimationMixer clips and facial/body morph targets.
- The current GLB config supports one production model URL at a time. Adding two production gender GLBs requires a small config and scene-selector extension; the procedural gender system needs none.
- A Draco decoder is not bundled. Uncompressed GLB works through GLTFLoader; compressed assets require adding DRACOLoader and its decoder.
- Speech synthesis availability and voice quality depend on the browser and operating system. Voice starts disabled.
- WebGL is unavailable in some older or locked-down environments; the 2D fallback and all calculator features remain usable.
- History is per-browser and does not sync across devices. It can be lost if browser storage is cleared.
- PDF export uses the browser's print-to-PDF flow rather than a bundled PDF generator.
- Unit switching rounds displayed values to one decimal; a small validation tolerance keeps extreme conversions stable.
- Browser QA is currently a documented manual/headless process, not a committed end-to-end suite.

## Licenses and attribution

- Three.js 0.180.0 and its example loaders: MIT, license at `vendor/three/LICENSE`.
- DM Sans and Kantumruy Pro: SIL Open Font License, license texts in `fonts/`.
- Original Black Box logo asset is preserved at `black_box.jpg`.
