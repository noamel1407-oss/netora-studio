import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tmp', 'github-batches');
const IGNORE = /\\node_modules\\|\\dist\\|\\assets-src\\|\\tmp\\github-batches\\|\\.git\\|\\.vite\\|_refcrops\\|_shots\\|netora-revised-inspect/;
const BINARY = new Set(['.glb', '.jpg', '.jpeg', '.png', '.webp', '.ico']);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (IGNORE.test(full)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(ROOT)
  .map((full) => {
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    const ext = extname(full).toLowerCase();
    const buf = readFileSync(full);
    const binary = BINARY.has(ext) || buf.includes(0);
    return {
      path: rel,
      content: binary ? buf.toString('base64') : buf.toString('utf8'),
      bytes: buf.length,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

mkdirSync(OUT, { recursive: true });

const batches = [];
let batch = [];
let size = 0;

for (const file of files) {
  if (batch.length >= 12 || size + file.bytes > 900_000) {
    batches.push(batch);
    batch = [];
    size = 0;
  }
  batch.push({ path: file.path, content: file.content });
  size += file.bytes;
}
if (batch.length) batches.push(batch);

batches.forEach((items, i) => {
  writeFileSync(join(OUT, `batch-${i + 1}.json`), JSON.stringify(items));
});

writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify({ fileCount: files.length, batchCount: batches.length }, null, 2),
);
console.log(`Prepared ${files.length} files in ${batches.length} batches -> ${OUT}`);
