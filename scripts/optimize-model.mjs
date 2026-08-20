/**
 * Produces web-ready variants of the Netora medallion from the untouched source
 * in assets-src/. Re-run with `npm run optimize:model` whenever the source or
 * the quality targets change. The source GLB is never written to.
 *
 * The work is split across two child processes because `@gltf-transform/functions`
 * and `sharp` cannot be loaded into the same process — see stage-textures.mjs.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'assets-src/netora-original.glb');
const TEMP = resolve(root, 'assets-src/.tmp-textured.glb');

/**
 * `ratio` is the fraction of triangles kept. The medallion's fine detail lives
 * in the normal and base-colour maps rather than in geometry, so it tolerates
 * heavy decimation before the silhouette of the ring starts to suffer.
 */
const VARIANTS = [
  {
    label: 'desktop',
    out: 'public/models/netora.glb',
    ratio: 0.1,
    error: 0.0008,
    textures: [2048, 1024, 1024],
  },
  {
    label: 'mobile',
    out: 'public/models/netora-low.glb',
    ratio: 0.04,
    error: 0.003,
    textures: [1024, 512, 512],
  },
];

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const run = (script, args) =>
  execFileSync(process.execPath, ['--max-old-space-size=8192', resolve(root, 'scripts', script), ...args], {
    stdio: 'inherit',
  });

console.log(`source  ${mb((await stat(SOURCE)).size)}`);

for (const variant of VARIANTS) {
  console.log(`\n[${variant.label}]`);
  const target = resolve(root, variant.out);
  await mkdir(dirname(target), { recursive: true });

  run('stage-textures.mjs', [SOURCE, TEMP, ...variant.textures.map(String)]);
  run('stage-geometry.mjs', [TEMP, target, String(variant.ratio), String(variant.error)]);

  console.log(`  => ${variant.out}  ${mb((await stat(target)).size)}`);
}

await rm(TEMP, { force: true });
