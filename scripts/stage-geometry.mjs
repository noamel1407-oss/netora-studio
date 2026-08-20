/**
 * Stage 2 of the model pipeline: decimate the mesh and apply meshopt
 * compression. Runs in its own process (see stage-textures.mjs for why).
 *
 * Usage: node stage-geometry.mjs <in.glb> <out.glb> <ratio> <error>
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [input, output, ratio, error] = process.argv.slice(2);

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptEncoder,
  'meshopt.encoder': MeshoptEncoder,
});

const document = await io.read(input);

const countTriangles = () =>
  document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .reduce((total, prim) => total + (prim.getIndices()?.getCount() ?? 0) / 3, 0);

const before = countTriangles();

await document.transform(
  dedup(),
  flatten(),
  join(),
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: Number(ratio), error: Number(error) }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

await io.write(output, document);

console.log(
  `  geometry                 ${Math.round(before).toLocaleString()} -> ${Math.round(countTriangles()).toLocaleString()} tris`,
);
