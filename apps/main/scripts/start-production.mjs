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
import { createServer } from 'node:http';
import { once } from 'node:events';
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

/**
 * Bounds for the seed phase. The start script's contract is that the bot starts UNCONDITIONALLY, so no
 * step may be allowed to hang. An unbounded `fetch` or DB connect is exactly how a deploy stalls
 * silently until the platform kills it — which is what happened on Render: the build succeeded,
 * migrations ran, then 18 minutes of silence and "Timed Out" with no port ever bound. A timeout here
 * abandons the step and lets the bot start.
 */
const SEED_STEP_TIMEOUT_MS = 45_000;
const SEED_BUDGET_MS = 180_000;

function withTimeout(label, promise, ms) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

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
        // Bound the request itself: an unbounded fetch inside the poll loop would stall the loop.
        signal: AbortSignal.timeout(3000),
      });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  return false;
}

/**
 * UR-20261027-107 — hold the platform's port from the first second, not after the seed.
 *
 * The platform scans for an open port within a fixed window and kills the instance if it finds none.
 * This script used to open the port only after migrate (120 s) + waiting for Swastik (60 s) + the seed
 * budget (180 s) — 360 s worst case against a scan window the operator's log measured at 321 s. The
 * instance was killed mid-seed, the tier volumes therefore stayed empty, `volumesPopulated()` never
 * short-circuited, and every restart re-seeded: a livelock that reported itself as "Timed Out".
 *
 * So the port is bound HERE, answers 503 while the seed runs, and is released immediately before the
 * bot starts. The ordering the seed depends on — modules present before the loader runs — is
 * unchanged, which is why this is a holder rather than a reordering.
 */
const apiPort = Number(process.env.PORT ?? process.env.API_PORT ?? 8080);
const portHolder = createServer((_req, res) => {
  res.writeHead(503, { 'content-type': 'text/plain', 'retry-after': '5' });
  res.end('starting: seeding modules\n');
});
let portHeld = false;
try {
  portHolder.listen(apiPort, '0.0.0.0');
  await once(portHolder, 'listening');
  portHeld = true;
  console.log(`start-production: holding port ${apiPort} while the seed runs`);
} catch (err) {
  console.error(`start-production: could not hold port ${apiPort} (continuing): ${String(err)}`);
}

let swastik;

if (volumesPopulated()) {
  console.log(`start-production: ${modulesDir} already populated; skipping the module seed`);
} else {
  const seedStartedAt = Date.now();
  const remainingBudget = () => Math.max(5_000, SEED_BUDGET_MS - (Date.now() - seedStartedAt));

  // 1. Migrations first, so the developer/licence tables exist for the seed. Idempotent; best-effort.
  //    `timeout` so a wedged migrate can never block the boot.
  try {
    const migrated = spawnSync('node', ['dist/entry/migrate.js', 'up'], {
      stdio: 'inherit',
      timeout: 120_000,
    });
    if (migrated.error !== undefined) {
      console.error(
        `start-production: migrate step failed (continuing): ${String(migrated.error)}`,
      );
    }
  } catch (err) {
    console.error(`start-production: migrate step failed (continuing): ${String(err)}`);
  }

  // 2. Swastik, on loopback, in this container (the module volume is mounted here).
  swastik = spawn('node', ['dist/entry/swastik.js'], { stdio: 'inherit' });

  // 3. Seed the deployer identity, then push the built modules through the real deploy flow.
  if (await waitForSwastik()) {
    try {
      await withTimeout('deployer seed', seedDeployer(), remainingBudget());
    } catch (err) {
      console.error(`start-production: deployer seed failed (continuing): ${String(err)}`);
    }
    try {
      await withTimeout('module push', pushModules(`http://127.0.0.1:${port}`), remainingBudget());
    } catch (err) {
      console.error(`start-production: module push failed (continuing): ${String(err)}`);
    }
  } else {
    // FALLBACK — Swastik could not run, but the modules must still load. Run the SAME deploy handler in
    // this process (no HTTP, no second service), so a Swastik failure no longer means zero modules.
    console.warn('start-production: Swastik did not become ready; using the in-process seed');
    try {
      await withTimeout('in-process seed', seedModulesInline(), remainingBudget());
    } catch (err) {
      console.error(`start-production: in-process seed failed (continuing): ${String(err)}`);
    }
  }
  console.log(`start-production: seed phase finished in ${Date.now() - seedStartedAt}ms`);
}

// 3b. Swastik is only needed while seeding. Stop it now: it holds no long-lived state here, the API
// serves `/internal/deploy` itself when SWASTIK_DEPLOY_ON_API is on, and on a credit-limited plan an
// idle second process is wasted memory. The bot is the only process that must outlive startup.
if (swastik !== undefined) {
  const dying = swastik;
  try {
    dying.kill('SIGTERM');
  } catch {
    /* already gone */
  }
  // WAIT for it to actually go. `kill` only requests; the bot was previously spawned while Swastik was
  // still shutting down, so the two overlapped on the database — and a connection that cannot be
  // handed out is a boot that hangs rather than reports. Bounded, so a Swastik that ignores SIGTERM
  // delays startup by at most this long instead of forever.
  await Promise.race([
    once(dying, 'exit').catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  swastik = undefined;
}

// 3c. Hand the port to the bot. The holder must be fully closed before the bot binds, or the bot's
// listen fails with EADDRINUSE and the instance dies for a different reason than the one being fixed.
if (portHeld) {
  await new Promise((resolve) => portHolder.close(() => resolve()));
  console.log(`start-production: released port ${apiPort} for the bot`);
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
