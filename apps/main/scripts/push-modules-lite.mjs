/**
 * Push the built module bundles into their tier volumes through the real Swastik deploy flow.
 *
 * UR-20261021-095 — a plain-JS equivalent of `scripts/push-modules.ts` for the production runtime
 * image, which has no tsx and no `src/` (only `dist/`). It POSTs each bundle in `dist-modules/<slug>/`
 * to `POST /internal/deploy`, which does the whole sanctioned promotion: verify → promotion gate →
 * atomic promote under lock → sign provenance → write the sidecar, the `builds` row and a
 * `deployment_records` row. Nothing is hand-copied; the loader's provenance gate is satisfied by the
 * deploy flow itself.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function main(baseUrl) {
  const internalApiKey = process.env.INTERNAL_API_KEY ?? '';
  if (!internalApiKey) {
    console.warn('push-modules-lite: INTERNAL_API_KEY is not set; skipping');
    return;
  }
  const buildRoot = resolve('dist-modules');
  if (!existsSync(buildRoot)) {
    console.warn(`push-modules-lite: no built modules at ${buildRoot}; skipping`);
    return;
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
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': internalApiKey },
      body: JSON.stringify({
        moduleSlug: manifest.name,
        version: manifest.version,
        devId: manifest.devId ?? 'dev_first_party',
        manifest,
        indexSource: readFileSync(indexPath, 'utf8'),
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
