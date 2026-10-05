import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ARCH-0005-1 — runtime is Node LTS >= 22 and the tree compiles under TypeScript strict.
describe('ACC-ARCH-0005-1 — stack runtime', () => {
  it('engines require node >= 22 and tsconfig is strict', () => {
    const pkg = JSON.parse(readRepo('apps/main/package.json')) as { engines: { node: string } };
    expect(pkg.engines.node).toContain('22');
    const ts = readRepo('apps/main/tsconfig.json');
    expect(ts).toMatch(/"strict":\s*true/);
  });
});
