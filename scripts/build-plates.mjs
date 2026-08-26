#!/usr/bin/env node
/**
 * Turns the canonical transition anchors into the plates the route renders.
 *
 *     npm run assets:plates
 *
 * The anchors under `reference/transitions/` are the source of truth and are
 * never served: they are progressive JPEGs at the size they were approved at.
 * This writes the web copies — same pixels, same framing, WebP — into
 * `public/media/`, where `src/journey/route.ts` expects them.
 *
 * Nothing is resized. The camera pushes into these plates by a factor of two
 * or three, so every pixel the anchor has is one the arrival needs; throwing
 * half of them away to save a hundred kilobytes would be paid back as mush at
 * exactly the moment the reader is closest to the architecture.
 */

import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const FROM = path.join(process.cwd(), 'reference', 'transitions');
const INTO = path.join(process.cwd(), 'public', 'media');

/** High enough that the marble keeps its grain under a 3× push. */
const QUALITY = 82;

const kb = (bytes) => `${Math.round(bytes / 1024)} kB`;

await mkdir(INTO, { recursive: true });

const anchors = (await readdir(FROM)).filter((name) => /^\d\d-.*\.jpe?g$/i.test(name)).sort();

if (anchors.length === 0) {
  console.error(`No anchors under ${path.relative(process.cwd(), FROM)}/`);
  process.exit(1);
}

for (const anchor of anchors) {
  const source = path.join(FROM, anchor);
  const name = `route-${anchor.replace(/\.jpe?g$/i, '')}.webp`;
  const target = path.join(INTO, name);

  const { width, height } = await sharp(source).metadata();
  await sharp(source).webp({ quality: QUALITY, effort: 6 }).toFile(target);

  const before = (await stat(source)).size;
  const after = (await stat(target)).size;
  console.log(`${anchor}  →  media/${name}   ${width}×${height}   ${kb(before)} → ${kb(after)}`);
}

console.log(`\n${anchors.length} plates written to ${path.relative(process.cwd(), INTO)}/`);
