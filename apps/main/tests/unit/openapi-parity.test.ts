import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { appRoot, readRepo } from '../spec-utils.js';

/**
 * ACC-REF-0044-1 — the contract and the server agree, in BOTH directions.
 *
 * The previous version of this test asserted only that `contracts/openapi.yaml` contained the strings
 * `openapi:` and `paths:`. It could not fail for a contract that documented eleven endpoints the server
 * does not mount, which is exactly what it was documenting (UR-20261027-104 / DOC-017). It now compares
 * the contract's declared paths against the routes the server actually registers, and fails on any
 * divergence in either direction.
 *
 * The enumeration is the same one the contract's own `info.description` names as its source:
 *   app.<verb>('<path>')  across apps/main/src and packages/* /src
 * Fastify's `:param` segments are written as OpenAPI `{param}`; that is the only transformation.
 */
function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walkTs(path, out);
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
}

function toOpenApi(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** Every path the server registers, in OpenAPI's `{param}` form. */
function registeredPaths(): Set<string> {
  const files = [
    ...walkTs(join(appRoot, 'src')),
    ...walkTs(join(appRoot, '..', '..', 'packages')).filter((f) => f.includes(`${'/'}src${'/'}`)),
  ];
  const pattern = /app\.(?:get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  const found = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      if (match[1] !== undefined) found.add(toOpenApi(match[1]));
    }
  }
  return found;
}

/** Every path the contract declares, from the `paths:` block. */
function declaredPaths(): Set<string> {
  const contract = readRepo('docs/contracts/openapi.yaml');
  const start = contract.indexOf('\npaths:');
  expect(start).toBeGreaterThan(-1);
  const found = new Set<string>();
  for (const line of contract.slice(start).split('\n')) {
    const match = /^ {2}(\/[^\s:]+):\s*$/.exec(line);
    if (match?.[1] !== undefined) found.add(match[1]);
  }
  return found;
}

describe('ACC-REF-0044-1 — the OpenAPI contract matches the mounted surface', () => {
  test('the contract exists and declares a paths block', () => {
    const contract = readRepo('docs/contracts/openapi.yaml');
    expect(contract).toMatch(/openapi:/);
    expect(contract).toMatch(/paths:/);
  });

  test('the contract declares no path the server does not mount', () => {
    const registered = registeredPaths();
    const declared = declaredPaths();
    expect(registered.size).toBeGreaterThan(0);
    const phantom = [...declared].filter((path) => !registered.has(path)).sort();
    expect(phantom).toEqual([]);
  });

  test('the server mounts no path the contract omits', () => {
    const registered = registeredPaths();
    const declared = declaredPaths();
    const undocumented = [...registered].filter((path) => !declared.has(path)).sort();
    expect(undocumented).toEqual([]);
  });
});
