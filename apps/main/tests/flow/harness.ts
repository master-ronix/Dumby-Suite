import './flow-env.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import knexFactory, { type Knex } from 'knex';
import knexConfig from '../../src/db/knexfile.js';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { bootstrap, type BootstrapHandle } from '../../src/bootstrap/bootstrap.js';
import { DATABASE_URL, FLOW_GUILD_ID, FLOW_OWNER_ID, PG_PORT } from './flow-env.js';

/** Boots the REAL application against embedded PostgreSQL + injected in-memory Redis. */
export interface FlowContext {
  readonly handle: BootstrapHandle;
  readonly databaseUrl: string;
  teardown(): Promise<void>;
}

export interface FlowStartOptions {
  /**
   * UR-20261019-103 — run after the database exists and migrations are applied but BEFORE bootstrap,
   * so a test can seed state that module discovery reads at boot (e.g. a signed `builds` row for a
   * module on a tier volume). Bootstrap's own migration stage is idempotent, so running them here is
   * safe.
   */
  beforeBootstrap?(knex: Knex): Promise<void>;
}

export async function startFlow(options: FlowStartOptions = {}): Promise<FlowContext> {
  const dataDir = mkdtempSync(join(tmpdir(), 'dumby-pg-'));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'dumby',
    password: 'dumby',
    port: PG_PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('dumby');

  if (options.beforeBootstrap) {
    const seedKnex = knexFactory(knexConfig.test as Knex.Config);
    await seedKnex.migrate.latest();
    await options.beforeBootstrap(seedKnex);
    await seedKnex.destroy();
  }

  const redis = new RedisMock() as unknown as Redis;
  const queueRedis = new RedisMock() as unknown as Redis;
  const handle = await bootstrap({ redis, queueRedis });

  return {
    handle,
    databaseUrl: DATABASE_URL,
    teardown: async () => {
      try {
        await handle.shutdown('SIGTERM');
      } catch {
        /* shutdown is asserted by its own flow */
      }
      await pg.stop();
    },
  };
}

export { FLOW_GUILD_ID, FLOW_OWNER_ID };
