#!/usr/bin/env node
/**
 * Appendix C #16 — the ConfigMap <-> ENV_KEYS drift guard.
 *
 * `pickEnvKeys()` (src/config/env.schema.ts) keeps only keys the schema declares, so a ConfigMap
 * key that is not in ENV_KEYS is silently ignored at runtime. This guard fails the build when the
 * K8s ConfigMap declares a key the schema does not own.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');

const schema = readFileSync(join(appRoot, 'src/config/env.schema.ts'), 'utf8');
const body = /const baseEnvSchema = z\s*\.object\(\{([\s\S]*?)\n\s*\}\)/.exec(schema);
if (body === null) {
  console.error('check-configmap-keys: could not locate baseEnvSchema in env.schema.ts');
  process.exit(1);
}
const envKeys = new Set([...body[1].matchAll(/^\s{4}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]));

const configmap = readFileSync(join(appRoot, 'deploy/k8s/base/configmap.yaml'), 'utf8');
const cmKeys = [...configmap.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]);

const drift = cmKeys.filter((k) => !envKeys.has(k));
if (drift.length > 0) {
  console.error(
    `check-configmap-keys: ConfigMap keys not present in ENV_KEYS (they are ignored at runtime):\n` +
      drift.map((k) => `  - ${k}`).join('\n'),
  );
  process.exit(1);
}
console.log(`check-configmap-keys: OK (${cmKeys.length} ConfigMap keys all in ENV_KEYS)`);
