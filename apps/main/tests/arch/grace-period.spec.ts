import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ARCH-0009-3 — K8s terminationGracePeriodSeconds is 190 (180 s + 10 s buffer).
describe('ACC-ARCH-0009-3 — grace period', () => {
  it('the deployment sets terminationGracePeriodSeconds: 190', () => {
    expect(readRepo('apps/main/deploy/k8s/base/deployment.yaml')).toMatch(
      /terminationGracePeriodSeconds:\s*190/,
    );
  });
});
