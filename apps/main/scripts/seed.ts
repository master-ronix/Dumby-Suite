import knexFactory from 'knex';
import { randomUUID } from 'node:crypto';
import knexConfig from '../src/db/knexfile.js';
import { MODULES } from './scaffold-module.js';

const env = process.env.NODE_ENV ?? 'development';
const config = knexConfig[env];
if (!config) {
  throw new Error(`No knex config for NODE_ENV="${env}"`);
}
const knex = knexFactory(config);

const DEV_GUILD_ID = process.env.DEVELOPMENT_GUILD_ID || '900000000000000001';
const OWNER_USER_ID = (process.env.BOT_OWNER_IDS || '100000000000000001').split(',')[0] ?? '100000000000000001';

async function main(): Promise<void> {
  await knex('guilds')
    .insert({
      id: DEV_GUILD_ID,
      name: 'DUMBY Development Guild',
      ownerDiscordId: OWNER_USER_ID,
      joinedAt: new Date(),
      isActive: true,
    })
    .onConflict('id')
    .ignore();

  await knex('users')
    .insert({ id: OWNER_USER_ID, globalUsername: 'dev-owner' })
    .onConflict('id')
    .ignore();

  await knex('guild_members')
    .insert({ id: randomUUID(), guildId: DEV_GUILD_ID, userId: OWNER_USER_ID, joinedAt: new Date() })
    .onConflict()
    .ignore();

  await knex('guild_configs')
    .insert({ id: randomUUID(), guildId: DEV_GUILD_ID, locale: 'en-US', timezone: 'UTC', config: JSON.stringify({}) })
    .onConflict('guildId')
    .ignore();

  for (const spec of MODULES) {
    await knex('guild_module_states')
      .insert({
        id: randomUUID(),
        guildId: DEV_GUILD_ID,
        moduleSlug: spec.slug,
        enabled: true,
        state: 'active',
        config: JSON.stringify({}),
      })
      .onConflict(['guildId', 'moduleSlug'])
      .ignore();
  }

  console.log(`Seed complete: guild ${DEV_GUILD_ID}, owner ${OWNER_USER_ID}, ${MODULES.length} module states.`);
}

main()
  .then(() => knex.destroy())
  .catch(async (err) => {
    console.error(err);
    await knex.destroy();
    process.exit(1);
  });
