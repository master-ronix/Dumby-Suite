import type { Knex } from 'knex';
import { addSoftDelete, addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.string('discordApplicationId').notNullable().unique();
    table.string('boundGuildId').notNullable().references('id').inTable('guilds');
    table.string('dmBehavior').notNullable().defaultTo('prohibited');
    table.integer('shardAllocation').notNullable().defaultTo(1);
    table.string('charter').notNullable().defaultTo('free');
    table.string('sunsetCondition').notNullable().defaultTo('free-charter-sunset-ADR-008');
    table.boolean('grandfathered').notNullable().defaultTo(false);
    table.string('status').notNullable().defaultTo('active');
    table.string('botTokenDigest').notNullable();
  });

  await knex.schema.dropTableIfExists('guild_persona_bindings');
  await knex.schema.createTable('guild_persona_bindings', (table) => {
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('moduleSlug').notNullable();
    table
      .uuid('personaId')
      .notNullable()
      .references('id')
      .inTable('persona_identities')
      .onDelete('CASCADE');
    table.string('channelId').nullable();
    table.jsonb('voicePolicy').notNullable().defaultTo('{}');
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.primary(['guildId', 'moduleSlug']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.dropColumn('botTokenDigest');
    table.dropColumn('status');
    table.dropColumn('grandfathered');
    table.dropColumn('sunsetCondition');
    table.dropColumn('charter');
    table.dropColumn('shardAllocation');
    table.dropColumn('dmBehavior');
    table.dropColumn('boundGuildId');
    table.dropColumn('discordApplicationId');
  });

  await knex.schema.dropTableIfExists('guild_persona_bindings');
  await knex.schema.createTable('guild_persona_bindings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table
      .uuid('personaId')
      .notNullable()
      .references('id')
      .inTable('persona_identities')
      .onDelete('CASCADE');
    table.string('channelId').nullable();
    table.jsonb('voicePolicy').notNullable().defaultTo('{}');
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId']);
  });
}
