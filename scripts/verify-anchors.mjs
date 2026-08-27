#!/usr/bin/env node
/**
 * The canonical anchors are what they say they are.
 *
 *     npm run assets:verify
 *
 * Every number in `src/journey/scene.ts`'s ROUTE block was measured off
 * `reference/transitions/`. That makes the frames load-bearing in a way an
 * image in a repository usually is not: swap one and the geometry is still
 * there, still confident, and no longer describing anything.
 *
 * So this asserts three things and nothing else:
 *
 * - every anchor the manifest lists is present, and its bytes hash to the
 *   recorded sha256;
 * - its pixel dimensions are the recorded ones, because a re-encode that
 *   preserved the framing would still move every fraction-of-frame
 *   measurement that came off it;
 * - no anchor sits in the directory unlisted, which is the case a hash check
 *   on its own cannot see.
 *
 * It does not measure anything and it never writes. A tool that rewrote the
 * manifest from the files would turn "these are the frames we approved" into
 * "these are the frames that happen to be here", which is the whole of what
 * the record is for.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

const DIR = path.join(process.cwd(), 'reference', 'transitions');
const MANIFEST = path.join(DIR, 'manifest.json');

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const listed = new Map(manifest.anchors.map((anchor) => [anchor.filename, anchor]));

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.log(`FAIL  ${message}`);
};

for (const anchor of manifest.anchors) {
  const file = path.join(DIR, anchor.filename);

  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    fail(`${anchor.id} ${anchor.filename} — listed in the manifest, missing from disk`);
    continue;
  }

  const digest = sha256(bytes);
  if (digest !== anchor.sha256) {
    fail(
      `${anchor.id} ${anchor.filename} — sha256 ${digest.slice(0, 12)}…, ` +
        `manifest says ${anchor.sha256.slice(0, 12)}…`,
    );
    continue;
  }

  if (bytes.length !== anchor.bytes) {
    fail(`${anchor.id} ${anchor.filename} — ${bytes.length} bytes, manifest says ${anchor.bytes}`);
    continue;
  }

  const { width, height } = await sharp(bytes).metadata();
  if (width !== anchor.width || height !== anchor.height) {
    fail(
      `${anchor.id} ${anchor.filename} — ${width}x${height}, ` +
        `manifest says ${anchor.width}x${anchor.height}`,
    );
    continue;
  }

  const canonical = anchor.canonical ? 'canonical' : 'NOT canonical';
  console.log(`ok    ${anchor.id}  ${anchor.filename}  ${width}x${height}  ${canonical}`);
}

/* An anchor nobody recorded is the case a hash check cannot reach: the numbers
   in ROUTE were measured off *something*, and a frame sitting here unlisted is
   a candidate for having been that something. */
for (const entry of await readdir(DIR)) {
  if (!/\.(jpe?g|png|webp)$/i.test(entry)) continue;
  if (!listed.has(entry)) fail(`${entry} — present in reference/transitions/, absent from the manifest`);
}

const order = manifest.canonicalOrder.join(' → ');
console.log(
  failures === 0
    ? `\nPASS  ${manifest.anchors.length} anchors verified, in order ${order}.\n`
    : `\n${failures} problem(s).\n`,
);

process.exit(failures === 0 ? 0 : 1);
