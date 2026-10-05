import './flow-env.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
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

export async function startFlow(): Promise<FlowContext> {
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
