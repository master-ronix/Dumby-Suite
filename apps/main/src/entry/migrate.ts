import { createRequire } from 'node:module';
import knex from 'knex';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import knexConfig from '../db/knexfile.js';
import { isMainEntry } from './is-main-entry.js';

// The migrate entrypoint runs migrations only — it never opens a gateway.
// All side effects live behind the isMainEntry guard so importing this module
// (e.g. in a unit test) has no effect (TREE 7-D / ACC-ARCH-0007-2).
void createRequire;

async function run(): Promise<void> {
  const command = process.argv[2] ?? 'status';
  const env = parseEnv(pickEnvKeys(process.env));
  const nodeEnv: string = env.NODE_ENV;
  const config = knexConfig[nodeEnv] ?? knexConfig['development'];
  if (!config) {
    console.error(`No knex config found for environment: ${nodeEnv}`);
    process.exit(1);
  }
  const db = knex(config);
  try {
    if (command === 'up') {
      const [batch, migrations] = await db.migrate.latest();

      console.log(`Ran batch ${batch}:`, migrations);
    } else if (command === 'down') {
      const [batch, migrations] = await db.migrate.rollback();

      console.log(`Rolled back batch ${batch}:`, migrations);
    } else {
      const list = await db.migrate.list();

      console.log('Pending:', list[0]);

      console.log('Completed:', list[1]);
    }
  } finally {
    await db.destroy();
  }
}

if (isMainEntry(import.meta.url, process.argv[1])) {
  run().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
