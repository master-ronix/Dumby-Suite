/**
 * Production entrypoint — seed the tier volumes through the sanctioned Swastik flow, then run the bot.
 *
 * UR-20261021-095 — Option A ships an image with no modules, so the tier volumes start empty. This
 * script runs Swastik (the module deploy service) on loopback *in this container* — the only place the
 * module volume is mounted — seeds the first-party deployer identity, pushes the built bundles through
 * `POST /internal/deploy` (real provenance: sidecar + `builds` row + signature), and then starts the
 * bot.
 *
 * Two deliberate properties:
 *   - **Idempotent.** If the tier volumes already hold a module, the whole seed is skipped: a restart
 *     must not redeploy modules or write new `builds` / `deployment_records` rows, and it must not
 *     spend the healthcheck window re-pushing. The volume is the source of truth once populated.
 *   - **Fail-safe.** The bot is started unconditionally. If any seeding step fails, the outcome is the
 *     previous behaviour (a bot with no modules), never a container that does not start.
 *   - **Fallback.** If Swastik cannot run — the single point of failure that left production with zero
 *     modules — the seed falls back to `seed-modules-inline.mjs`, which runs the SAME deploy handler in
 *     this process. Option A is unchanged: the tier volumes remain the target either way.
 *
 * Plain JS so it runs in the production runtime image (no tsx, no `src/`).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { main as seedDeployer } from './seed-first-party-deployer.mjs';
import { main as pushModules } from './push-modules-lite.mjs';
import { main as seedModulesInline } from './seed-modules-inline.mjs';

const port = process.env.SWASTIK_PORT ?? '8085';
const internalApiKey = process.env.INTERNAL_API_KEY ?? '';
const modulesDir = process.env.MODULES_DIR ?? '/mnt/modules';
const TIER_VOLUMES = ['modules-admin', 'modules-core', 'modules-standard', 'modules-marketplace'];

/** True when any tier volume already holds a module directory (a non-hidden entry). */
function volumesPopulated() {
  for (const volume of TIER_VOLUMES) {
    const dir = join(modulesDir, volume);
    if (!existsSync(dir)) continue;
    if (readdirSync(dir).some((entry) => !entry.startsWith('.'))) return true;
  }
  return false;
}

async function waitForSwastik() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/swastik/status`, {
        headers: { 'x-internal-api-key': internalApiKey },
      });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  return false;
}

let swastik;

if (volumesPopulated()) {
  console.log(`start-production: ${modulesDir} already populated; skipping the module seed`);
} else {
  // 1. Migrations first, so the developer/licence tables exist for the seed. Idempotent; best-effort.
  try {
    spawnSync('node', ['dist/entry/migrate.js', 'up'], { stdio: 'inherit' });
  } catch (err) {
    console.error(`start-production: migrate step failed (continuing): ${String(err)}`);
  }

  // 2. Swastik, on loopback, in this container (the module volume is mounted here).
  swastik = spawn('node', ['dist/entry/swastik.js'], { stdio: 'inherit' });

  // 3. Seed the deployer identity, then push the built modules through the real deploy flow.
  if (await waitForSwastik()) {
    try {
      await seedDeployer();
    } catch (err) {
      console.error(`start-production: deployer seed failed (continuing): ${String(err)}`);
    }
    try {
      await pushModules(`http://127.0.0.1:${port}`);
    } catch (err) {
      console.error(`start-production: module push failed (continuing): ${String(err)}`);
    }
  } else {
    // FALLBACK — Swastik could not run, but the modules must still load. Run the SAME deploy handler in
    // this process (no HTTP, no second service), so a Swastik failure no longer means zero modules.
    console.warn('start-production: Swastik did not become ready; using the in-process seed');
    try {
      await seedModulesInline();
    } catch (err) {
      console.error(`start-production: in-process seed failed (continuing): ${String(err)}`);
    }
  }
}

// 3b. Swastik is only needed while seeding. Stop it now: it holds no long-lived state here, the API
// serves `/internal/deploy` itself when SWASTIK_DEPLOY_ON_API is on, and on a credit-limited plan an
// idle second process is wasted memory. The bot is the only process that must outlive startup.
if (swastik !== undefined) {
  try {
    swastik.kill('SIGTERM');
  } catch {
    /* already gone */
  }
  swastik = undefined;
}

// 4. The bot. Started unconditionally.
const bot = spawn('node', ['dist/entry/main.js'], { stdio: 'inherit' });

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    try {
      bot.kill(signal);
    } catch {
      /* already gone */
    }
    try {
      swastik?.kill(signal);
    } catch {
      /* already gone */
    }
  });
}

bot.on('exit', (code) => {
  try {
    swastik?.kill('SIGTERM');
  } catch {
    /* already gone */
  }
  process.exit(code ?? 0);
});
