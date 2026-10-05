import { describe, expect, it } from 'vitest';
import { listDir } from '../spec-utils.js';
// ACC-REF-INLINE — every inline status/design entry is preserved verbatim for each department.
describe('ACC-REF-INLINE — inline status entries', () => {
  it('each department has an inline-status entry file', () => {
    const files = listDir('docs/spec/reference/inline-status-entries');
    for (const d of ['architecture', 'lifecycle', 'modules', 'reference', 'request-layer']) {
      expect(files).toContain(`${d}.md`);
    }
  });
});
