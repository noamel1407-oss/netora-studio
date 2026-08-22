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
 * It also re-cuts the poster from the encode's own first frame, so the still
 * the hero shows and the frame the video hands over are the same pixels.
 *
 * `--webm` additionally writes a VP9 copy. Not on by default: all-intra VP9
 * came out roughly three times the size of the H.264 here, so shipping it
 * would hand Chromium users the heavier file. It is worth having because the
 * Chromium bundled with Playwright carries no H.264 decoder, so the scroll
 * scrubbing can only be tested against a VP9 copy.
 *
 * Usage: node scripts/encode-vault.mjs <input> [--fps 24] [--width 1600] [--webm]
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
  console.error('Usage: node scripts/encode-vault.mjs <input.mp4> [--fps 24] [--width 1600]');
  process.exit(1);
}

const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const fps = Number(flag('fps', 24));
const width = Number(flag('width', 1600));
const out = resolve(root, 'public/media/vault-video.mp4');
const outWebm = resolve(root, 'public/media/vault-video.webm');

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
    '-crf', '28',
    '-preset', 'slow',
    '-movflags', '+faststart',               // metadata first, so it starts
    out,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

console.log(`  mp4:  ${mb(out)} MB`);

if (args.includes('--webm')) {
  // `-g 1` again: an all-keyframe file is what makes an arbitrary seek cost
  // one decode. Row threading keeps the encode from taking all day.
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i', input,
      '-an',
      '-vf', `scale=${width}:-2:flags=lanczos,fps=${fps}`,
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
      outWebm,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  console.log(`  webm: ${mb(outWebm)} MB`);
}

const poster = resolve(root, 'public/media/vault-poster.webp');

execFileSync(
  ffmpeg,
  ['-y', '-i', out, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', poster],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

console.log(`done at ${width}px / ${fps}fps, all-keyframe`);
console.log(`poster re-cut from frame 0: ${mb(poster)} MB`);
