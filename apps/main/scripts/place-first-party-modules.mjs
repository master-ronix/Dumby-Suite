// Places the built first-party module bundles onto their tier volumes inside the
// image, so the bot ships with the Core Command Surface (no external volume needed).
//
// Reads apps/main/dist-modules/<slug>/{manifest.json,index.js,...} (produced by
// `pnpm --filter @workspace/dumby build:modules`) and writes each module to
// <destRoot>/modules-<tier>/<slug>/ — the exact layout apps/main/src/module-system/
// swastik-loader.ts discovers at bootstrap Stage 10.
import { readFileSync, readdirSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const destRoot = process.argv[2] ?? '/mnt/modules';
const buildRoot = resolve('apps/main/dist-modules');

if (!existsSync(buildRoot)) {
  console.error(`no built modules at ${buildRoot} - run build:modules first`);
  process.exit(1);
}

let placed = 0;
for (const slug of readdirSync(buildRoot).sort()) {
  const dir = join(buildRoot, slug);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const dest = join(destRoot, `modules-${manifest.tier}`, slug);
  mkdirSync(dest, { recursive: true });
  cpSync(dir, dest, { recursive: true });
  console.log(`placed ${slug} -> modules-${manifest.tier}/${slug}`);
  placed += 1;
}
console.log(`placed ${placed} first-party module(s) under ${destRoot}`);
