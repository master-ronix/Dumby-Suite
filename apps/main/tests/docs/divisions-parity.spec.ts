import { describe, expect, it } from 'vitest';
import { listDir } from '../spec-utils.js';
// ACC-REQ-0002-1 — the divisions list matches the divisions present in spec/request-layer/.
describe('ACC-REQ-0002-1 — divisions parity', () => {
  it('the request-layer division files are present', () => {
    const files = listDir('docs/spec/request-layer');
    const divisions = files.filter((f) => f.startsWith('division-'));
    expect(divisions.length).toBeGreaterThanOrEqual(10);
  });
});
