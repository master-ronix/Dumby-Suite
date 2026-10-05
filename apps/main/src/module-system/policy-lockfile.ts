import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import type { ModuleManifest } from '@workspace/swastik/manifest';

/**
 * D-7.5.5 — the operator-authored security policy lockfile (JSON) is checked at Stage 11. It
 * bounds what a module may request (intents, command count) independently of the module's own
 * manifest, so a module cannot widen its own privileges by declaring them.
 */
export const securityPolicySchema = z.object({
  version: z.literal(1),
  allowedIntents: z.array(z.string()),
  maxCommandsPerModule: z.number().int().positive(),
  bannedManifestFields: z.array(z.string()).default([]),
});

export type SecurityPolicy = z.infer<typeof securityPolicySchema>;

export class PolicyViolationError extends Error {
  constructor(readonly violations: readonly string[]) {
    super(`Security policy violation: ${violations.join('; ')}`);
    this.name = 'PolicyViolationError';
  }
}

export function loadPolicyLockfile(path: string): SecurityPolicy {
  if (!existsSync(path)) {
    throw new PolicyViolationError([`security policy lockfile not found: ${path}`]);
  }
  return securityPolicySchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

export function checkModuleAgainstPolicy(
  manifest: Pick<ModuleManifest, 'name' | 'intents' | 'commands'>,
  policy: SecurityPolicy,
): string[] {
  const violations: string[] = [];
  for (const intent of manifest.intents) {
    if (!policy.allowedIntents.includes(intent)) {
      violations.push(`module "${manifest.name}" requests disallowed intent "${intent}"`);
    }
  }
  if (manifest.commands.length > policy.maxCommandsPerModule) {
    violations.push(
      `module "${manifest.name}" declares ${manifest.commands.length} commands ` +
        `(policy allows ${policy.maxCommandsPerModule})`,
    );
  }
  return violations;
}
