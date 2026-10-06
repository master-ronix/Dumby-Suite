import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-LIFE-0041-1 — Docker is a multi-stage build; K8s sets terminationGracePeriodSeconds=190 and the 3 probes.
describe('ACC-LIFE-0041-1 — infrastructure', () => {
  it('the Dockerfile is multi-stage and K8s sets the grace period and probes', () => {
    const docker = readRepo('apps/main/Dockerfile');
    expect((docker.match(/^FROM /gm) ?? []).length).toBeGreaterThanOrEqual(2);
    const deploy = readRepo('apps/main/deploy/k8s/base/deployment.yaml');
    expect(deploy).toMatch(/terminationGracePeriodSeconds:\s*190/);
    expect(deploy).toMatch(/livenessProbe/);
    expect(deploy).toMatch(/readinessProbe/);
    expect(deploy).toMatch(/startupProbe/);
  });
});
