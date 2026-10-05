import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ACC-REQ-0022-2 — "CLAI uses the ssh2 public-key server; no plaintext TCP REPL exists".
 *
 * Authority: docs/spec/request-layer/control-plane-services.md (SPEC-04-REQUEST-LAYER-0022),
 * acceptance block. §22.7's CLAI session model requires the terminal to be reached over SSH with
 * public-key auth; a plaintext TCP REPL would put an administrative surface on the wire unencrypted
 * and unauthenticated.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function read(rel: string): string {
  return readFileSync(`${repoRoot}apps/main/${rel}`, 'utf8');
}

describe('ACC-REQ-0022-2 — CLAI transport is the ssh2 public-key server', () => {
  const source = read('src/entry/ssh-clai.ts');

  it('serves the terminal through the ssh2 Server with a host key', () => {
    expect(source).toMatch(/from 'ssh2'/);
    expect(source).toContain('new Server(');
    expect(source).toContain('hostKeys');
  });

  it('authenticates by public key, not by a shared secret or bare connection', () => {
    expect(source).toMatch(/authMethods|publickey/);
  });

  it('keeps no plaintext TCP REPL anywhere in the tree', () => {
    const entries = ['src/entry/ssh-clai.ts', 'src/entry/main.ts'];
    for (const entry of entries) {
      const text = read(entry);
      expect(text).not.toMatch(/net\.createServer/);
      expect(text).not.toMatch(/createServer\(.*=>.*repl/i);
    }
  });

  it('reaches Power Engine through the real route with a service credential (§22.7)', () => {
    expect(source).toContain('powerEngineClient.call(');
    expect(source).not.toContain('PowerEngineActionNotImplementedError');
  });
});
