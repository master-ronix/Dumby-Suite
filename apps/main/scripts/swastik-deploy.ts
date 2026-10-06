import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { INTERNAL_API_HEADER } from '../src/http/internal-auth.js';

interface DeployManifest {
  name: string;
  version: string;
  devId?: string;
}

interface SwastikResponse {
  buildId?: string;
  status?: string;
  moduleSlug?: string;
  version?: string;
  error?: string;
}

function usage(): never {
  console.error('Usage: tsx scripts/swastik-deploy.ts <compiled-module-dir> [swastik-url]');
  console.error('Expected module directory files: manifest.json and index.js');
  process.exit(1);
}

async function main(): Promise<void> {
  const moduleDirArg = process.argv[2];
  if (!moduleDirArg) usage();

  const moduleDir = resolve(moduleDirArg);
  const baseUrl = process.argv[3] ?? `http://127.0.0.1:${process.env.SWASTIK_PORT ?? '8085'}`;
  // /internal/deploy is an internal surface: the key is mandatory, and the request is
  // refused with a clear message rather than an opaque 401 from the server.
  const internalApiKey = process.env['INTERNAL_API_KEY'] ?? '';
  if (!internalApiKey) {
    throw new Error('INTERNAL_API_KEY is required to call /internal/deploy');
  }
  const manifestPath = join(moduleDir, 'manifest.json');
  const indexPath = join(moduleDir, 'index.js');

  if (!existsSync(manifestPath) || !existsSync(indexPath)) {
    throw new Error(`Module package ${moduleDir} must contain manifest.json and index.js`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as DeployManifest;
  const indexSource = readFileSync(indexPath, 'utf8');
  const moduleSlug = manifest.name ?? basename(moduleDir);
  const version = manifest.version;
  const devId = manifest.devId ?? 'dumby-module-deployer';

  if (!moduleSlug || !version) {
    throw new Error('manifest.json must include name and version');
  }

  const response = await fetch(`${baseUrl}/internal/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [INTERNAL_API_HEADER]: internalApiKey },
    body: JSON.stringify({ moduleSlug, version, devId, manifest, indexSource }),
  });
  const result = (await response.json()) as SwastikResponse;

  if (!response.ok) {
    throw new Error(result.error ?? `Swastik deploy failed with status ${response.status}`);
  }

  console.log(
    `Deployed ${result.moduleSlug ?? moduleSlug} v${result.version ?? version} via Swastik` +
      ` (buildId: ${result.buildId}, status: ${result.status})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
