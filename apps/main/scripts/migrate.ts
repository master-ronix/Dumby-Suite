import knexFactory from 'knex';
import knexConfig from '../src/db/knexfile.js';

const env = process.env.NODE_ENV ?? 'development';
const config = knexConfig[env];
if (!config) {
  throw new Error(`No knex config for NODE_ENV="${env}"`);
}

const command = process.argv[2] ?? 'up';
const knex = knexFactory(config);

async function main(): Promise<void> {
  switch (command) {
    case 'up': {
      const [batch, log] = await knex.migrate.latest();
      console.log(`Migrated to batch ${batch}. Ran: ${log.length ? log.join(', ') : '(nothing to run)'}`);
      break;
    }
    case 'down': {
      const [batch, log] = await knex.migrate.rollback();
      console.log(`Rolled back batch ${batch}. Reverted: ${log.length ? log.join(', ') : '(nothing to revert)'}`);
      break;
    }
    case 'status': {
      const [completed, pending] = await knex.migrate.list();
      console.log(`Completed (${completed.length}):`, completed.map((m: { name: string }) => m.name));
      console.log(`Pending (${pending.length}):`, pending.map((m: { file: string }) => m.file));
      break;
    }
    default:
      throw new Error(`Unknown migrate command "${command}". Use up|down|status.`);
  }
}

main()
  .then(() => knex.destroy())
  .catch(async (err) => {
    console.error(err);
    await knex.destroy();
    process.exit(1);
  });
