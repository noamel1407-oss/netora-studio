/**
 * Encodes the vault render for scroll scrubbing.
 *
 * A normal web encode puts a keyframe every couple of seconds and rebuilds
 * everything in between from deltas. Seeking to an arbitrary time then means
 * decoding forward from the last keyframe, which is exactly what makes a
 * scrubbed video feel like it is dragging behind the wheel. This puts a
 * keyframe on every frame: the file gets bigger, and every `currentTime` lands
 * on a frame the decoder can produce immediately.
 *
 * Usage: node scripts/encode-vault.mjs <input> [--fps 30] [--width 1920]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const input = args[0];

if (!input || !existsSync(input)) {
  console.error('Usage: node scripts/encode-vault.mjs <input.mp4> [--fps 30] [--width 1920]');
  process.exit(1);
}

const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const fps = Number(flag('fps', 30));
const width = Number(flag('width', 1920));
const out = resolve(root, 'public/media/vault-video.mp4');

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(1);

console.log(`encoding ${input} (${mb(input)} MB) → public/media/vault-video.mp4`);

execFileSync(
  ffmpeg,
  [
    '-y',
    '-i', input,
    '-an',                                   // the opening is silent
    '-vf', `scale=${width}:-2:flags=lanczos,fps=${fps}`,
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-g', '1',                               // every frame is a keyframe
    '-keyint_min', '1',
    '-sc_threshold', '0',
    '-tune', 'stillimage',                   // favours crisp architecture
    '-crf', '23',
    '-preset', 'slow',
    '-movflags', '+faststart',               // metadata first, so it starts
    out,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

console.log(`done: ${mb(out)} MB at ${width}px / ${fps}fps, all-keyframe`);
