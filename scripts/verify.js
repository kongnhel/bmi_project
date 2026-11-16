import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTranslationKeys } from '../src/i18n.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function assertFile(relativePath, label) {
  check(existsSync(path.join(root, relativePath)), `${label} missing: ${relativePath}`);
}

function listFiles(directory, extension) {
  const absolute = path.join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => `${directory}/${entry.name}`);
}

const html = read('index.html');
const css = read('style.css');

/* Required local assets referenced from HTML, CSS and modules. */
assertFile('style.css', 'Stylesheet');
assertFile('favicon.svg', 'Favicon');
assertFile('black_box.jpg', 'Brand image');
assertFile('.nojekyll', 'GitHub Pages Jekyll opt-out');
assertFile('src/app.js', 'Application entry');
assertFile('fonts/dm-sans-latin.woff2', 'DM Sans font');
assertFile('fonts/kantumruy-pro-khmer.woff2', 'Khmer font');
assertFile('fonts/OFL-DM-Sans.txt', 'DM Sans license');
assertFile('fonts/OFL-Kantumruy-Pro.txt', 'Kantumruy Pro license');
assertFile('vendor/three/three.module.min.js', 'Three.js runtime');
assertFile('vendor/three/three.core.min.js', 'Three.js core runtime');
assertFile('vendor/three/LICENSE', 'Three.js license');
assertFile('vendor/three/addons/loaders/GLTFLoader.js', 'GLTFLoader');
assertFile('vendor/three/addons/utils/BufferGeometryUtils.js', 'BufferGeometryUtils');
assertFile('assets/models/README.md', 'Character asset requirements');

const localReferences = new Set();
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const reference = match[1];
  if (/^(?:https?:|mailto:|#|data:)/.test(reference)) continue;
  localReferences.add(reference.split('#')[0].split('?')[0]);
}
for (const reference of localReferences) {
  assertFile(reference, 'HTML reference');
}

for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const reference = match[1];
  if (/^(?:data:|https?:)/.test(reference)) continue;
  assertFile(reference, 'CSS asset reference');
}

const jsFiles = [
  ...listFiles('src', '.js'),
  ...listFiles('tests', '.js'),
  ...listFiles('vendor/three/addons', '.js'),
];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
    checks += 1;
  } catch (error) {
    failures.push(`JavaScript syntax error in ${file}: ${String(error.stderr)}`);
  }
}

const moduleFiles = [...listFiles('src', '.js'), ...listFiles('vendor/three/addons', '.js')];
for (const file of moduleFiles) {
  const source = read(file);
  const imports = [
    ...source.matchAll(/from\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
  ];
  for (const match of imports) {
    if (!match[1].startsWith('.')) continue;
    const resolved = path.normalize(path.join(path.dirname(file), match[1]));
    assertFile(resolved, `Module import in ${file}`);
  }
  check(!source.includes('__APP_CONTINUE__'), `Unresolved build marker in ${file}`);
}

check(!/https?:\/\//.test(read('src/character/config.js')), 'Character config must not reference a remote model URL');
check(html.includes('type="importmap"'), 'Three.js import map is missing.');
check(html.includes('./vendor/three/three.module.min.js'), 'Three.js import map target is missing.');

check(!css.includes('__CSS_CONTINUE__'), 'Unresolved build marker in style.css');
const openBraces = (css.match(/\{/g) ?? []).length;
const closeBraces = (css.match(/\}/g) ?? []).length;
check(openBraces === closeBraces, `CSS braces are unbalanced (${openBraces} open, ${closeBraces} closed)`);

/* Unique IDs and resolved translation keys. */
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
check(duplicateIds.length === 0, `Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(', ')}`);

const idSet = new Set(ids);
const referencedIds = moduleFiles
  .filter((file) => file.startsWith('src/'))
  .flatMap((file) => [...read(file).matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)]
    .map((match) => match[1]));
for (const id of referencedIds) {
  check(idSet.has(id), `app.js references missing element id: ${id}`);
}

const translationKeys = new Set();
for (const pattern of [
  /data-i18n="([^"]+)"/g,
  /data-i18n-placeholder="([^"]+)"/g,
  /data-i18n-aria-label="([^"]+)"/g,
  /data-i18n-title="([^"]+)"/g,
]) {
  for (const match of html.matchAll(pattern)) translationKeys.add(match[1]);
}
const english = new Set(getTranslationKeys('en'));
const khmer = new Set(getTranslationKeys('km'));
for (const key of translationKeys) {
  check(english.has(key), `Missing English translation for ${key}`);
  check(khmer.has(key), `Missing Khmer translation for ${key}`);
}
check(
  english.size === khmer.size,
  `Translation key count mismatch (en ${english.size}, km ${khmer.size})`,
);
for (const key of english) {
  check(khmer.has(key), `Khmer missing translation key: ${key}`);
}

/* Deployment assumptions for GitHub Pages at /bmi_project/. */
check(!/(?:src|href)="\/[^/]/.test(html), 'Root-absolute asset path found; GitHub Pages base path would break.');
check(html.includes('type="module"'), 'Application script should load as an ES module.');

if (failures.length > 0) {
  console.error(`\nVerification failed (${failures.length} of ${checks} checks):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Verification passed: ${checks} checks.`);
}
