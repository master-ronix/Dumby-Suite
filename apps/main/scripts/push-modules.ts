import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { INTERNAL_API_HEADER } from '../src/http/internal-auth.js';

/**
 * UR-20261019-102 (Option A) — push the built module bundles into their tier volume mounts through the
 * Swastik deploy flow. Nothing is baked into the image; this is how modules reach the volumes after
 * the service is up. Run `pnpm build:modules` first, then `pnpm push:modules [swastik-url]`.
 */
async function main(): Promise<void> {
  const baseUrl = process.argv[2] ?? `http://127.0.0.1:${process.env.SWASTIK_PORT ?? '8085'}`;
  const internalApiKey = process.env['INTERNAL_API_KEY'] ?? '';
  if (!internalApiKey) {
    throw new Error('INTERNAL_API_KEY is required to call /internal/deploy');
  }
  const buildRoot = resolve('apps/main/dist-modules');
  if (!existsSync(buildRoot)) {
    throw new Error(`no built modules at ${buildRoot} - run \`pnpm build:modules\` first`);
  }
  let pushed = 0;
  for (const slug of readdirSync(buildRoot).sort()) {
    const dir = join(buildRoot, slug);
    const manifestPath = join(dir, 'manifest.json');
    const indexPath = join(dir, 'index.js');
    if (!existsSync(manifestPath) || !existsSync(indexPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      name: string;
      version: string;
      devId?: string;
    };
    const response = await fetch(`${baseUrl}/internal/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [INTERNAL_API_HEADER]: internalApiKey },
      body: JSON.stringify({
        moduleSlug: manifest.name,
        version: manifest.version,
        devId: manifest.devId ?? 'dumby-module-deployer',
        manifest,
        indexSource: readFileSync(indexPath, 'utf8'),
      }),
    });
    const out = (await response.json()) as { buildId?: string; error?: string };
    if (!response.ok) throw new Error(`push "${slug}" failed: ${out.error ?? response.status}`);
    process.stdout.write(`pushed ${slug}@${manifest.version} -> buildId ${out.buildId ?? '?'}\n`);
    pushed += 1;
  }
  process.stdout.write(`pushed ${pushed} module(s) into their tier volumes via ${baseUrl}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`module push failed: ${String(err)}\n`);
  process.exit(1);
});
