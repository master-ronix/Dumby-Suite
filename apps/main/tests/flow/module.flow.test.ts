import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFlow, type FlowContext } from './harness.js';
import {
  FLOW_GUILD_ID,
  FLOW_OWNER_ID,
  FLOW_SIGNING_KEY_ID,
  FLOW_SIGNING_PRIVATE_KEY_PEM,
} from './flow-env.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import {
  BuildSigner,
  hashFile,
  writeBuildProvenanceSidecar,
} from '../../src/module-system/build-signing.js';

const FLOW_BUILD_ID = 'build_flowmod_1_0_0';
const FLOW_DEV_ID = 'dev_first_party';

const BASE = 'http://127.0.0.1:18900';
const auth = { 'x-internal-api-key': 'x'.repeat(40) };

let ctx: FlowContext;
beforeAll(async () => {
  const modulesDir = mkdtempSync(join(tmpdir(), 'dumby-seed-'));
  const moduleDir = join(modulesDir, 'modules-standard', 'flowmod');
  mkdirSync(join(moduleDir, 'locales'), { recursive: true });
  writeFileSync(
    join(moduleDir, 'manifest.json'),
    JSON.stringify({
      name: 'flowmod',
      version: '1.0.0',
      description: 'A seeded module for the flow suite.',
      tier: 'standard',
      hardcoded: false,
      visibility: 'public',
      releaseStatus: 'public',
      devId: 'dev_first_party',
      required: false,
      depends: [],
      provides: [],
      intents: [],
      partials: [],
      commands: [{ name: 'seeded', description: 'seeded command' }],
      events: [],
      services: [],
      repositories: [],
      jobs: [],
      tasks: [],
      routes: [],
      middleware: [],
      migrations: [],
      locales: ['en-US'],
      config: {},
      eventsCatalog: [],
      crossModuleReads: [],
    }),
  );
  const indexPath = join(moduleDir, 'index.js');
  writeFileSync(
    indexPath,
    'export const commands = [];\nexport async function onLoad() {}\nexport async function onReady() {}\n',
  );
  writeFileSync(join(moduleDir, 'locales', 'en-US.json'), '{}');

  // UR-20261019-103 — the module-build signature layer is mandatory, so a seeded module must carry a
  // valid provenance sidecar that a `builds` row backs and the armed flow key signs. Sign it here;
  // the row is seeded below, once the database exists.
  const artifactHash = hashFile(indexPath);
  const signer = BuildSigner.fromPkcs8Pem(FLOW_SIGNING_KEY_ID, FLOW_SIGNING_PRIVATE_KEY_PEM);
  const sidecar = signer.signSidecar(
    {
      moduleSlug: 'flowmod',
      version: '1.0.0',
      devId: FLOW_DEV_ID,
      buildId: FLOW_BUILD_ID,
      sourceArchiveHash: 'sha256:flow-source',
      artifactHash,
      gateResultsHash: 'sha256:flow-gates',
    },
    'sha256:flow-lockfile',
  );
  writeBuildProvenanceSidecar(moduleDir, sidecar);

  process.env.MODULES_DIR = modulesDir;
  ctx = await startFlow({
    beforeBootstrap: async (knex) => {
      // `builds.devId` references `developers.devId`, so the developer must exist first.
      await knex('developers')
        .insert({ devId: FLOW_DEV_ID, username: 'flow-first-party', approvalStatus: 'approved' })
        .onConflict('devId')
        .ignore();
      await knex('builds')
        .insert({
          buildId: FLOW_BUILD_ID,
          devId: FLOW_DEV_ID,
          moduleSlug: 'flowmod',
          version: '1.0.0',
          validationStatus: 'passed',
          sourceArchiveHash: sidecar.sourceArchiveHash,
          artifactHash: sidecar.artifactHash,
          lockfileHash: sidecar.lockfileHash,
          gateResultsHash: sidecar.gateResultsHash,
          signature: sidecar.signature,
          signatureKeyId: sidecar.signatureKeyId,
          signedDescriptor: sidecar.signedDescriptor,
        })
        .onConflict('buildId')
        .ignore();
    },
  });
  // The guild_module_states.guildId FK requires the guild to exist.
  const db = ctx.handle.container.resolve(CORE_TOKENS.Db);
  await db.knex('guilds').insert({
    id: FLOW_GUILD_ID,
    name: 'Flow Guild',
    ownerDiscordId: FLOW_OWNER_ID,
    joinedAt: new Date(),
  });
}, 120_000);
afterAll(async () => {
  await ctx.teardown();
}, 120_000);

describe('flow: a module on the tier volume loads and is installable', () => {
  it('registers the seeded module in the registry', () => {
    expect(ctx.handle.moduleRegistry.has('flowmod')).toBe(true);
    expect(ctx.handle.moduleOrder).toContain('flowmod');
  });

  it('lists the module in the MDIS catalog', async () => {
    const res = await fetch(`${BASE}/mdis/catalog`, { headers: auth });
    const body = (await res.json()) as { modules: { slug: string }[] };
    expect(body.modules.some((m) => m.slug === 'flowmod')).toBe(true);
  });

  it('installs the module for a guild through MDIS', async () => {
    const install = await fetch(`${BASE}/mdis/guilds/${FLOW_GUILD_ID}/install`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'flowmod' }),
    });
    expect(install.status).toBe(200);
    const installed = await fetch(`${BASE}/mdis/guilds/${FLOW_GUILD_ID}/installed`, {
      headers: auth,
    });
    expect(((await installed.json()) as { installed: string[] }).installed).toContain('flowmod');
  });
});
