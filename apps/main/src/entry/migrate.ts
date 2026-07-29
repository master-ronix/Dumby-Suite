/**
 * Migration-only entry point. Runs DB migrations and exits.
 * Use: tsx src/entry/migrate.ts [up|down|status]
 */
import { createRequire } from 'node:module';
import knex from 'knex';
import { parseEnv } from '../config/env.schema.js';
import knexConfig from '../db/knexfile.js';

const command = process.argv[2] ?? 'status';
const env = parseEnv(process.env);
const nodeEnv: string = env.NODE_ENV;
const config = knexConfig[nodeEnv] ?? knexConfig['development'];
if (!config) {
   
  console.error(`No knex config found for environment: ${nodeEnv}`);
  process.exit(1);
}
const db = knex(config);

async function run(): Promise<void> {
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

// Suppress "createRequire" unused lint if not used.
void createRequire;

run().catch((err: unknown) => {
   
  console.error(err);
  process.exit(1);
});
