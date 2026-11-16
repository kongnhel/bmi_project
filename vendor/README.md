# Vendored 3D dependencies

These files are served locally so the 3D assistant does not depend on a CDN or third-party runtime URL.

- **Three.js 0.180.0**, MIT licensed.
  - Source: `three` npm package, `build/three.module.min.js`
  - License: `vendor/three/LICENSE`
- **GLTFLoader** and **BufferGeometryUtils** from Three.js 0.180.0 examples.
  - Source: `examples/jsm/loaders/GLTFLoader.js` and `examples/jsm/utils/BufferGeometryUtils.js`
  - License: same Three.js MIT license.

They are loaded lazily by `src/character/assistant-scene.js` only when the assistant section approaches the viewport. The production character asset can be added later without changing the Three.js dependency.
