/**
 * Push the built module bundles into their tier volumes through the real Swastik deploy flow.
 *
 * UR-20261021-095 — a plain-JS equivalent of `scripts/push-modules.ts` for the production runtime
 * image, which has no tsx and no `src/` (only `dist/`). It POSTs each bundle in `dist-modules/<slug>/`
 * to `POST /internal/deploy`, which does the whole sanctioned promotion: verify → promotion gate →
 * atomic promote under lock → sign provenance → write the sidecar, the `builds` row and a
 * `deployment_records` row. Nothing is hand-copied; the loader's provenance gate is satisfied by the
 * deploy flow itself.
 *
 * **The first promotion of a module requires human approval (ADR-006).** That gate is real and is not
 * bypassed here: a first promotion is submitted with `humanApproved` ONLY when the operator has
 * explicitly set `MODULE_SEED_HUMAN_APPROVED=true`. Unset (the default), the promotion gate refuses
 * every first promotion and this script reports it, exactly as it should. The operator sets the
 * variable once to approve the first seed, then removes it — subsequent boots skip the seed entirely
 * because the volume is already populated.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Every file under `locales/` and `assets/`, as `{ relativePath: base64 }` (§30). */
function collectFiles(dir) {
  const out = {};
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childAbs = join(abs, entry.name);
      const childRel = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(childAbs, childRel);
      else if (entry.isFile()) out[childRel] = readFileSync(childAbs).toString('base64');
    }
  };
  for (const sub of ['locales', 'assets']) {
    const root = join(dir, sub);
    if (existsSync(root)) walk(root, sub);
  }
  return out;
}

export async function main(baseUrl) {
  const internalApiKey = process.env.INTERNAL_API_KEY ?? '';
  if (!internalApiKey) {
    console.warn('push-modules-lite: INTERNAL_API_KEY is not set; skipping');
    return;
  }
  // An explicit operator decision, never an automatic one. Absent, the ADR-006 first-promotion gate
  // stands and every first promotion is refused.
  const humanApproved = process.env.MODULE_SEED_HUMAN_APPROVED === 'true';
  const buildRoot = resolve('dist-modules');
  if (!existsSync(buildRoot)) {
    console.warn(`push-modules-lite: no built modules at ${buildRoot}; skipping`);
    return;
  }
  if (!humanApproved) {
    console.warn(
      'push-modules-lite: MODULE_SEED_HUMAN_APPROVED is not "true" — a first promotion requires ' +
        'human approval (ADR-006); submitting without it',
    );
  }
  let pushed = 0;
  for (const slug of readdirSync(buildRoot).sort()) {
    const dir = join(buildRoot, slug);
    const manifestPath = join(dir, 'manifest.json');
    const indexPath = join(dir, 'index.js');
    if (!existsSync(manifestPath) || !existsSync(indexPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const response = await fetch(`${baseUrl}/internal/deploy`, {
      method: 'POST',
      // Bound each module: an unbounded fetch here would stall the whole boot.
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': internalApiKey },
      body: JSON.stringify({
        moduleSlug: manifest.name,
        version: manifest.version,
        devId: manifest.devId ?? 'dev_first_party',
        manifest,
        indexSource: readFileSync(indexPath, 'utf8'),
        files: collectFiles(dir),
        ...(humanApproved ? { humanApproved: true } : {}),
      }),
    });
    const out = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(`push-modules-lite: "${slug}" failed: ${out.error ?? response.status}`);
      continue;
    }
    console.log(
      `push-modules-lite: pushed ${slug}@${manifest.version} -> buildId ${out.buildId ?? '?'}`,
    );
    pushed += 1;
  }
  console.log(`push-modules-lite: ${pushed} module(s) pushed via ${baseUrl}`);
}
