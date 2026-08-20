/**
 * Generates the placeholder still shown inside the laptop until the real Shay
 * Jewellery screen recording is added at public/media/shay-jewellery.mp4.
 *
 * Run with: npm run assets:poster
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'public/media/shay-jewellery-poster.jpg');

const W = 1600;
const H = 1000;

const nav = ['SHOP', 'COLLECTIONS', 'ABOUT', 'CONTACT']
  .map((label, i) => `<text x="${1010 + i * 150}" y="72" class="nav">${label}</text>`)
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="55%">
      <stop offset="0%" stop-color="#4a3a1f" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#17120a" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7ead0"/>
      <stop offset="100%" stop-color="#c79a4e"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0908"/>
      <stop offset="100%" stop-color="#050504"/>
    </linearGradient>
  </defs>

  <style>
    .nav { fill:#b9b3a8; font-family:sans-serif; font-size:19px; letter-spacing:2.4px; }
    .mark { fill:url(#gold); font-family:serif; font-size:30px; letter-spacing:9px; }
    .hero { fill:url(#gold); font-family:serif; font-size:150px; letter-spacing:22px; }
    .sub { fill:#c9c2b6; font-family:sans-serif; font-size:26px; letter-spacing:15px; }
    .cta { fill:#e8d6b4; font-family:sans-serif; font-size:20px; letter-spacing:4px; }
  </style>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <text x="90" y="76" class="mark">SHAY</text>
  ${nav}
  <line x1="90" y1="110" x2="${W - 90}" y2="110" stroke="#2a241a" stroke-width="1"/>

  <text x="${W / 2}" y="480" class="hero" text-anchor="middle">SHAY</text>
  <text x="${W / 2}" y="545" class="sub" text-anchor="middle">J E W E L L E R Y</text>

  <line x1="${W / 2 - 60}" y1="600" x2="${W / 2 + 60}" y2="600" stroke="#c79a4e" stroke-width="1.5"/>

  <rect x="${W / 2 - 150}" y="660" width="300" height="62" fill="none" stroke="#8c6a2c" stroke-width="1.2"/>
  <text x="${W / 2}" y="700" class="cta" text-anchor="middle">VIEW COLLECTION</text>
</svg>`;

await mkdir(dirname(target), { recursive: true });
await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toFile(target);

console.log(`wrote ${target}`);
