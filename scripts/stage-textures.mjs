/**
 * Stage 1 of the model pipeline: downscale and re-encode textures to WebP.
 *
 * Runs in its own process and deliberately does NOT import
 * `@gltf-transform/functions` — loading that package corrupts libvips'
 * colourspace enums and every sharp encode then fails with
 * "colourspace: parameter space not set".
 *
 * Usage: node stage-textures.mjs <in.glb> <out.glb> <baseColor> <normal> <metalRough>
 */
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

const [input, output, baseColor, normal, metalRough] = process.argv.slice(2);
const sizes = {
  baseColorTexture: Number(baseColor),
  normalTexture: Number(normal),
  metallicRoughnessTexture: Number(metalRough),
};
const quality = { baseColorTexture: 88, normalTexture: 92, metallicRoughnessTexture: 85 };

sharp.cache(false);

const io = new NodeIO();
const document = await io.read(input);

const slotOf = new Map();
for (const material of document.getRoot().listMaterials()) {
  const assign = (texture, slot) => texture && slotOf.set(texture, slot);
  assign(material.getBaseColorTexture(), 'baseColorTexture');
  assign(material.getNormalTexture(), 'normalTexture');
  assign(material.getMetallicRoughnessTexture(), 'metallicRoughnessTexture');
}

for (const texture of document.getRoot().listTextures()) {
  const slot = slotOf.get(texture) ?? 'baseColorTexture';
  const source = texture.getImage();
  if (!source) continue;

  const encoded = await sharp(Buffer.from(source))
    .resize(sizes[slot], sizes[slot], { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: quality[slot], effort: 6 })
    .toBuffer();

  texture.setImage(new Uint8Array(encoded)).setMimeType('image/webp');
  const uri = texture.getURI();
  if (uri) texture.setURI(uri.replace(/\.\w+$/, '.webp'));

  console.log(`  ${slot.padEnd(24)} ${sizes[slot]}px  ${(source.length / 1024 / 1024).toFixed(1)} MB -> ${(encoded.length / 1024).toFixed(0)} KB`);
}

await io.write(output, document);
