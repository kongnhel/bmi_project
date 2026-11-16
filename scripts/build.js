import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const entries = [
  'index.html',
  'style.css',
  'favicon.svg',
  'black_box.jpg',
  '.nojekyll',
  'src',
  'fonts',
  'vendor',
  'assets',
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!existsSync(source)) {
    throw new Error(`Required build input is missing: ${entry}`);
  }
  cpSync(source, path.join(output, entry), { recursive: true });
}

function totalSize(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? totalSize(target) : statSync(target).size);
  }, 0);
}

const total = totalSize(output);
console.log(`Production artifact created in dist/ (${(total / 1024).toFixed(1)} KB).`);
console.log('GitHub Pages continues to serve the repository root; dist/ is an optional deploy artifact.');
