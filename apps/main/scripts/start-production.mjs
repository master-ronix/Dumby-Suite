/**
 * Production entrypoint — seed the tier volumes through the sanctioned Swastik flow, then run the bot.
 *
 * UR-20261021-095 — Option A ships an image with no modules, so the tier volumes start empty. This
 * script runs Swastik (the module deploy service) on loopback *in this container* — the only place the
 * module volume is mounted — seeds the first-party deployer identity, pushes the built bundles through
 * `POST /internal/deploy` (real provenance: sidecar + `builds` row + signature), and then starts the
 * bot. The bot is started **unconditionally**: if any seeding step fails, the outcome is the previous
 * behaviour (a bot with no modules), never a container that does not start.
 *
 * Plain JS so it runs in the production runtime image (no tsx, no `src/`).
 */
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { main as seedDeployer } from './seed-first-party-deployer.mjs';
import { main as pushModules } from './push-modules-lite.mjs';

const port = process.env.SWASTIK_PORT ?? '8085';
const internalApiKey = process.env.INTERNAL_API_KEY ?? '';

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

// 1. Migrations first, so the developer/licence tables exist for the seed. Idempotent; best-effort.
try {
  spawnSync('node', ['dist/entry/migrate.js', 'up'], { stdio: 'inherit' });
} catch (err) {
  console.error(`start-production: migrate step failed (continuing): ${String(err)}`);
}

// 2. Swastik, on loopback, in this container (it owns no volume of its own, but this one is mounted).
const swastik = spawn('node', ['dist/entry/swastik.js'], { stdio: 'inherit' });

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
  console.error('start-production: Swastik did not become ready; starting the bot without seeding');
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
      swastik.kill(signal);
    } catch {
      /* already gone */
    }
  });
}

bot.on('exit', (code) => {
  try {
    swastik.kill('SIGTERM');
  } catch {
    /* already gone */
  }
  process.exit(code ?? 0);
});
