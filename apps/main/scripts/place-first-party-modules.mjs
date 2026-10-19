// Places the built first-party module bundles onto their tier volumes inside the
// image, so the bot ships with the Core Command Surface (no external volume needed).
//
// Reads apps/main/dist-modules/<slug>/{manifest.json,index.js,...} (produced by
// `pnpm --filter @workspace/dumby build:modules`) and writes each module to
// <destRoot>/modules-<tier>/<slug>/ — the exact layout apps/main/src/module-system/
// swastik-loader.ts discovers at bootstrap Stage 10.
//
// UR-20261018-093 — a baked module bypasses Swastik promotion, so it has no `builds` row. It now
// carries its own hash-bound build record: a `build-provenance.json` sidecar (marked `baked`) whose
// `artifactHash` the loader re-verifies against the on-disk `index.js` at load. Without this the
// D-4.10 fail-closed floor would quarantine every baked module.
import { readFileSync, readdirSync, mkdirSync, cpSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const destRoot = process.argv[2] ?? '/mnt/modules';
const buildRoot = resolve('apps/main/dist-modules');

if (!existsSync(buildRoot)) {
  console.error(`no built modules at ${buildRoot} - run build:modules first`);
  process.exit(1);
}

const bakedManifest = {};
let placed = 0;
for (const slug of readdirSync(buildRoot).sort()) {
  const dir = join(buildRoot, slug);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const dest = join(destRoot, `modules-${manifest.tier}`, slug);
  mkdirSync(dest, { recursive: true });
  cpSync(dir, dest, { recursive: true });

  // UR-20261018-093 — write the baked build record beside the artifact it binds.
  const indexPath = join(dest, 'index.js');
  const artifactHash =
    'sha256:' + createHash('sha256').update(readFileSync(indexPath)).digest('hex');
  const sidecar = {
    buildId: `baked_${slug}_${manifest.version}`,
    moduleSlug: slug,
    version: manifest.version,
    devId: manifest.devId ?? 'dev_first_party',
    sourceArchiveHash: '',
    artifactHash,
    lockfileHash: '',
    gateResultsHash: '',
    signature: '',
    signatureKeyId: '',
    signedDescriptor: '',
    baked: true,
  };
  writeFileSync(join(dest, 'build-provenance.json'), JSON.stringify(sidecar, null, 2), 'utf8');
  bakedManifest[`modules-${manifest.tier}/${slug}`] = artifactHash;
  console.log(`placed ${slug} -> modules-${manifest.tier}/${slug} (baked sidecar written)`);
  placed += 1;
}
// The expected hashes for baked modules live at the root (a non-mounted path in the image), never
// beside the artifact, so a writable volume cannot forge an artifact together with its proof.
writeFileSync(
  join(destRoot, 'baked-manifest.json'),
  JSON.stringify(bakedManifest, null, 2),
  'utf8',
);
console.log(`placed ${placed} first-party module(s) under ${destRoot} (+ baked-manifest.json)`);
