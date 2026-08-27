#!/usr/bin/env node
/**
 * A decodable copy of the vault render, for measuring only.
 *
 *     npm run vault:standin
 *
 * The vault video ships as H.264 because that is the smaller file and every
 * browser a reader will use can play it. The Chromium that Playwright drives
 * cannot: it carries no H.264 decoder, so under the harness the video never
 * becomes seekable and `VaultHero` takes its non-scrubbable branch. Everything
 * the scrubbable branch does — the door on the scroll wheel, and the tween
 * positions that go with it — is then not being measured at all.
 *
 * So this writes a VP9 copy of the *same* render into `.netora-work/`, and
 * `baseline-act-one.mjs` serves it in place of the mp4 when it is there. The
 * copy is deliberately not committed and deliberately not shipped: it is three
 * times the size for no reader-facing gain, and a measurement stand-in that
 * ends up in `public/` is an asset nobody decided to publish.
 *
 * It is reproducible instead of stored — the input is the committed
 * `public/media/vault-video.mp4`, so anyone can make the same file from the
 * same bytes with one command. The encode settings are `encode-vault.mjs`'s
 * `--webm` settings exactly, all-intra so an arbitrary seek costs one decode.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import ffmpeg from 'ffmpeg-static';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, 'public/media/vault-video.mp4');
const outDir = resolve(root, '.netora-work');
const out = resolve(outDir, 'vault-video.webm');

const mb = (file) => (statSync(file).size / 1e6).toFixed(1);

if (!existsSync(input)) {
  console.error(`missing ${input}`);
  process.exit(1);
}

if (existsSync(out) && !process.argv.includes('--force')) {
  console.log(`already there: .netora-work/vault-video.webm (${mb(out)} MB) — --force to redo`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

/* No `-vf`: the stand-in has to be the same frames at the same size and rate
   as the file it stands in for, or the tween positions measured against it are
   measured against a different video. */
console.log(`re-encoding public/media/vault-video.mp4 (${mb(input)} MB) as all-intra VP9…`);

execFileSync(
  ffmpeg,
  [
    '-y',
    '-i', input,
    '-an',
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuv420p',
    '-g', '1',
    '-keyint_min', '1',
    '-crf', '34',
    '-b:v', '0',
    '-deadline', 'good',
    '-cpu-used', '2',
    '-row-mt', '1',
    '-threads', '4',
    out,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

console.log(`wrote .netora-work/vault-video.webm (${mb(out)} MB)`);
