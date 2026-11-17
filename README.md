# Black Box — BMI Calculator & 3D Wellness Guide

A bilingual, privacy-first BMI screening experience with a real-time interactive 3D wellness guide.

**Live site:** https://kongnhel.github.io/bmi_project/

The original repository was a small static BMI page. This iteration preserves its Black Box branding, Khmer audience, and zero-backend privacy model, then adds a production-quality product shell, a live Three.js character system, local history, accessibility, and a GLB-ready character pipeline.

## The 3D wellness guide

The character is rendered with Three.js inside a dynamically imported WebGL scene. It is not a PNG, video, emoji, or pre-rendered animation.

The 3D guide sits beside the hero heading on wide screens, with the calculator workspace immediately below. At 1240 px and wider the hero uses two columns. Tablet and phone layouts stack the interactive character stage above Avery’s compact character panel; phones use a dedicated single-column layout with a short, fully framed 3D stage. The bundled character is a **procedural articulated Three.js assistant** that stands in for the final production GLB. It has:

- A human-proportioned parametric body built from smooth lofted torso, hip, sleeve, arm and leg surfaces, with male and female variants sharing one rig and animation system.
- A gender selector with two runtime-rendered 3D portrait previews, instant switching and locally remembered preference.
- Continuous body shape driven by the actual unrounded BMI through nine normalized controls: `torso_width`, `waist_width`, `abdomen_volume`, `chest_volume`, `upper_arm_volume`, `forearm_volume`, `thigh_volume`, `leg_volume` and `hip_width`.
- Real torso and clothing morph targets (`BodyLean`, `torso_width`, `waist_width`, `abdomen_volume`, `chest_volume`) plus rig-compatible non-uniform segment scaling for arms, thighs, lower legs and hips.
- Smooth BMI-anchor interpolation with no jumps at category boundaries and no whole-character uniform scaling.
- Articulated shoulders, elbows, hands, neck and head.
- A medical-inspired wardrobe with scrub top, badge and stethoscope that moves with the body volume.
- A facial rig with eyes, blinking, eyebrows and a dynamically rebuilt mouth curve.
- A procedural skin, fabric and hair material set with generated micro-textures.
- Male short hair and a professionally tied female variation with distinct facial and body proportions.
- Studio lighting, contact shadows, an environment map and a closer responsive full-body camera with pinch/wheel zoom.
- Six BMI reactions with distinct expression and gesture targets.
- Smooth damping between gestures and expressions.
- Idle breathing, blinking, head movement and a friendly default expression.
- Pointer drag rotation, pinch/wheel zoom, accessible camera buttons and reset.
- Dynamically imported scene module, viewport activation, offscreen render pausing, capped pixel ratio and full disposal.
- Adaptive rendering quality. Device capabilities (CPU cores, device memory, pointer type, DPR, WebGL max texture size) select a **low**, **medium** or **high** tier; a sustained-FPS monitor can step the tier down at runtime. DPR is capped at 1.0 / 1.25 / 1.5, low-tier scenes drop shadows and rim lights, geometry segment counts and texture sizes scale with the tier, and the human is rebuilt at the new detail level when the tier changes. `?quality=low|medium|high` is a support/testing override.
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

The displayed label remains discrete for clarity, but the body shape is not. The controller interpolates all nine controls through BMI anchors `15, 16, 17, 18.5, 22, 25, 30, 35, 40, 50` using smoothstep, so BMI 27.1 and 29.8 produce visibly different intermediate shapes.

Body size is shown as a clearly labeled **illustrative visualization only**. It is not a prediction or representation of a user's real body, body-fat distribution, muscle mass or appearance. All copy is non-stigmatizing and the application states clearly that BMI is a screening indicator, not a diagnosis or a measure of personal worth. The character is a wellness guide, not a clinician.

## Replacing the procedural character with a production GLB

The project includes a real GLB loading path:

- `src/character/config.js` — model URL, animation clip names, body and facial morph-target maps and scale.
- `src/character/model-loader.js` — lazy `GLTFLoader` import and GLB loading.
- `src/character/assistant-scene.js` — model normalization, AnimationMixer crossfades, facial and body morph blending, shadow setup and graceful fallback.
- `vendor/three/addons/loaders/GLTFLoader.js` — self-hosted loader.
- `assets/models/README.md` — complete male/female model, Blender shape-key, animation, facial-shape and licensing workflow.

No GLB is bundled today, and no fake model URL is referenced. `modelUrl` is intentionally `null` until licensed, optimized male and female characters are supplied. The procedural assistant remains available as a polished fallback during that transition.

The GLB integration expects named clips (`Idle`, `Caring`, `Welcome`, `Explain`, `Support`, `Empathetic`), optional ARKit-style facial blend shapes, `BodyLean`, and optional growth shape keys for all nine controls. Limb and hip keys can be omitted when the rig uses non-uniform bone scaling. These are configurable without rewriting scene code. Because the current config accepts one model URL, adding two production gender models requires a small config/scene-selector extension; the procedural shared variant system does not.

## Product features

### Calculator and results

- Live BMI calculation with the standard formula: weight (kg) ÷ height (m)².
- Primary range sliders for weight (30–180 kg) and height (100–220 cm), with live BMI, result and 3D updates while dragging.
- Metric (`kg` / `cm`) and imperial (`lb` / `ft` / `in`) units.
- Unit switching preserves the current measurement and reflects the equivalent slider range.
- Optional exact-value manual entry, retained inside a disclosure for decimal, comma-decimal and Khmer-digit input.
- Validation for empty, malformed, zero, negative and unrealistic values.
- Results update live while sliding or typing; explicit submit and Enter-key support remain.
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
- Every category maps to a tested character state and illustrative body label.
- Male and female character cards with two runtime-rendered 3D preview portraits.
- A mobile/tablet split-screen assistant: a large interactive character stage on the left, compact character controls and guidance on the right, with clean stacking on very narrow phones.
- Mobile UX tuned for real phones: safe-area insets for the header, toast and edge controls; 44px minimum touch targets for camera controls, toast actions, history deletion and compact buttons; no horizontal overflow from 320px upward.
- Gender switching preserves the current BMI, camera and character state; the choice is stored locally.
- Actual unrounded BMI updates the character continuously, including within the same category.
- Body shape uses damped torso/clothing morph targets plus rig-compatible limb, hip and stature scaling. BMI never applies a uniform whole-character scale; entered height separately adjusts overall stature.
- Character state also updates when a result is cleared or becomes invalid.
- The hero character is linked from the main navigation and the result card.
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
- Focus-visible styles, 44px-class mobile touch controls, safe-area-aware mobile layout and reduced-motion handling.
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
│       ├── assistant-scene.js    # Three.js scene, adaptive quality, gender switching, GLB upgrade
│       ├── body-shape.js          # Continuous BMI-to-nine-control morph system
│       ├── config.js             # GLB clips, body and facial morph mapping
│       ├── human.js              # Procedural male/female character and shape rig
│       ├── model-loader.js       # Lazy GLTFLoader path
│       ├── preview.js            # Runtime 3D portraits for gender cards
│       ├── quality.js            # Device detection and adaptive quality tiers
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
npm test        # 50 unit tests
npm run verify  # assets, module imports, IDs, i18n, vendor and deployment checks
npm run build   # tests + verification + optional dist/ artifact
```

Current verification status:

- 50 unit tests passing.
- 774 structural, asset, module-import, ID, translation and deployment checks passing.
- Browser QA in headless Chrome at 320, 390, 768, 1000, 1240, 1280 and 1440 px.
- 64/64 calculator, validation, history, consent, theme, language, dialog and mobile checks passing.
- 38/38 3D scene, hero placement, camera, localization, dark-theme, mobile and reduced-motion checks passing.
- 22/22 gender, preview, shape, persistence and mobile-overflow checks passing.
- 51/51 continuous actual-BMI checks passing, including distinct geometry inside the same category.
- 40/40 hero-layout checks passing at seven widths in English, Khmer, light and dark themes.
- 32/32 mobile split-screen checks passing at 768, 560, 430, 390 and 320 px.
- 20/20 performance checks passing: valid tier selection, DPR caps, unthrottled FPS, CPU-throttled tier downgrade, safe-area CSS, deferred Khmer preload and 44px mobile targets.
- 8/8 forced low-tier checks passing: low tier selected, DPR 1.0, scene renders, camera controls work, clean viewport change and no console errors.
- Hero character is verified beside the heading at ≥1240 px and cleanly stacked below it at smaller widths; the calculator begins after the hero at every tested width.
- Mobile assistant is verified as a split-screen stage/panel layout at 768, 560, 430 and 390 px, with clean stacking at 320 px.
- BMI boundary, character-state and continuous body-shape tests for all six categories.
- Male/female selection verified by distinct rendered previews, character changes, result preservation and reload persistence.
- Continuous BMI states at 22, 24, 27.1, 29.8, 30, 34.7, 36, 39.8 and 40 verified with rendered stage changes.
- Runtime-rendered 3D portraits verified in gender cards.
- Real WebGL render verified with software WebGL.
- Camera rotate/zoom/reset verified by rendered-frame changes.
- Dynamic scene import, viewport activation and offscreen render pausing verified.
- Adaptive quality verified: capability-based tier selection, runtime downgrade under sustained low FPS, forced low-tier rendering and mobile touch-target sizing.
- 2D fallback verified with WebGL disabled.
- Base-path rendering verified under `/bmi_project/`.
- Zero axe-core violations across light/dark, English/Khmer, desktop/mobile and dialog states.
- Zero runtime console errors in the success and fallback paths.
- `npm run build` creates `dist/` successfully (approximately 1.4 MB).

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
- The procedural system computes all nine controls continuously, applying four torso/clothing growth morphs plus `BodyLean` on the mesh and rig-compatible non-uniform scaling for the other five. It is still an illustrative approximation; BMI cannot determine actual body shape or composition, and the UI states this clearly.
- The procedural placeholder uses articulated object groups and procedural facial controls rather than a formal skinned skeleton with facial blend shapes. The production GLB path supports skinned models, AnimationMixer clips and facial/body morph targets.
- The current GLB config supports one production model URL at a time. Adding two production gender GLBs requires a small config and scene-selector extension; the procedural gender system needs none.
- A Draco decoder is not bundled. Uncompressed GLB works through GLTFLoader; compressed assets require adding DRACOLoader and its decoder.
- Speech synthesis availability and voice quality depend on the browser and operating system. Voice starts disabled.
- WebGL is unavailable in some older or locked-down environments; the 2D fallback and all calculator features remain usable.
- Adaptive quality selects a starting tier from device capabilities and steps down automatically when sustained FPS drops; it does not step back up without a reload.
- History is per-browser and does not sync across devices. It can be lost if browser storage is cleared.
- PDF export uses the browser's print-to-PDF flow rather than a bundled PDF generator.
- Unit switching rounds displayed values to one decimal; a small validation tolerance keeps extreme conversions stable.
- Browser QA is currently a documented manual/headless process, not a committed end-to-end suite.

## Licenses and attribution

- Three.js 0.180.0 and its example loaders: MIT, license at `vendor/three/LICENSE`.
- DM Sans and Kantumruy Pro: SIL Open Font License, license texts in `fonts/`.
- Original Black Box logo asset is preserved at `black_box.jpg`.
