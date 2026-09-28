// Copies the Pyodide runtime from node_modules into public/pyodide/<version>/ so it is
// served from our own origin (no third-party CDN) under a URL that changes with the
// version, which lets browsers cache it forever.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pyodide');
if (!existsSync(src)) {
  console.error('pyodide not found in node_modules. Run npm install first.');
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
const base = join(root, 'public', 'pyodide');
const dest = join(base, version);
const files = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

rmSync(base, { recursive: true, force: true }); // drop old versions
mkdirSync(dest, { recursive: true });
for (const f of files) cpSync(join(src, f), join(dest, f));
console.log(`Copied Pyodide ${version} runtime to ${dest}`);
