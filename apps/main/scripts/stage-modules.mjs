#!/usr/bin/env node
/**
 * Stage the built first-party modules into the exact on-disk layout the runtime
 * loader discovers, under a single MODULES_DIR tree:
 *
 *   <target>/modules-core/<slug>/{manifest.json,index.js,locales/...}
 *   <target>/modules-standard/<slug>/...
 *
 * Input is `apps/main/dist-modules/<slug>/` (produced by `build:modules`).
 * The tier in each module's manifest decides which volume directory it lands in;
 * a core manifest found in modules-standard is a tier-at-rest violation that
 * aborts the runtime volume scan, so the mapping must be exact.
 *
 * NOTE: this packs modules into the image so a single container is
 * self-contained. The reference deployment instead promotes modules onto mounted
 * tier volumes through Swastik (docs/spec/lifecycle/infrastructure-deployment.md
 * §41.2). Use this for self-contained / test deploys; use the Swastik promotion
 * path when modules must live on persistent volumes.
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builtRoot = join(appRoot, 'dist-modules');
const target = resolve(process.env.MODULES_STAGE_DIR ?? join(appRoot, 'staged-modules'));

const TIER_VOLUME = {
  admin: 'modules-admin',
  core: 'modules-core',
  standard: 'modules-standard',
  marketplace: 'modules-marketplace',
};
const VOLUME_DIRS = [...Object.values(TIER_VOLUME), 'swastik-staging'];

try {
  statSync(builtRoot);
} catch {
  console.error(`stage-modules: no built modules at ${builtRoot} — run \`build:modules\` first`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
for (const volume of VOLUME_DIRS) mkdirSync(join(target, volume), { recursive: true });

let staged = 0;
for (const slug of readdirSync(builtRoot).sort()) {
  const dir = join(builtRoot, slug);
  if (!statSync(dir).isDirectory()) continue;

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  } catch {
    console.warn(`stage-modules: skipping ${slug} (no readable manifest.json)`);
    continue;
  }

  const volume = TIER_VOLUME[manifest.tier];
  if (!volume) {
    console.error(`stage-modules: ${slug} declares unknown tier "${manifest.tier}"`);
    process.exitCode = 1;
    continue;
  }

  cpSync(dir, join(target, volume, slug), { recursive: true });
  staged += 1;
  console.log(`stage-modules: ${slug}@${manifest.version} (${manifest.tier}) -> ${volume}/`);
}

console.log(`stage-modules: staged ${staged} module(s) into ${target}`);
