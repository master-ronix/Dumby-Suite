import knexFactory from 'knex';
import knexConfig from '../src/db/knexfile.js';

const API_PORT = process.env.API_PORT ?? '8080';
const BASE = `http://localhost:${API_PORT}`;
const TEST_GUILD_ID = process.env.DEVELOPMENT_GUILD_ID ?? '900000000000000001';
const OWNER_ID = (process.env.BOT_OWNER_IDS ?? '100000000000000001').split(',')[0];

async function main(): Promise<void> {
  const knex = knexFactory(knexConfig.test ?? knexConfig.development);

  console.log('1. Suspend the dev guild with a valid actor/source/reason...');
  const suspendRes = await fetch(`${BASE}/admin/power-engine/guild/${TEST_GUILD_ID}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actorId: OWNER_ID, source: 'dashboard', reason: 'e2e-test suspend' }),
  });
  if (suspendRes.status !== 200) throw new Error(`expected 200, got ${suspendRes.status}`);

  console.log('2. Confirm an "allowed" audit_logs row was written for the suspend...');
  const auditRows = await knex('audit_logs')
    .where({ action: 'guild.suspend', actorId: OWNER_ID })
    .orderBy('createdAt', 'desc')
    .limit(1);
  if (auditRows.length === 0 || auditRows[0].outcome !== 'allowed') {
    throw new Error('expected an "allowed" audit_logs row for guild.suspend');
  }

  console.log('3. Attempt the same action with an empty reason — must be rejected...');
  const rejectedRes = await fetch(`${BASE}/admin/power-engine/guild/${TEST_GUILD_ID}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actorId: OWNER_ID, source: 'dashboard', reason: '' }),
  });
  if (rejectedRes.status !== 403)
    throw new Error(`expected 403 for empty reason, got ${rejectedRes.status}`);

  console.log(
    '4. Confirm a "rejected" audit_logs row was ALSO written for the rejected attempt...',
  );
  const rejectedAuditRows = await knex('audit_logs')
    .where({ action: 'guild.restore', outcome: 'rejected' })
    .orderBy('createdAt', 'desc')
    .limit(1);
  if (rejectedAuditRows.length === 0) {
    throw new Error('expected a "rejected" audit_logs row even though the handler never ran');
  }

  console.log('5. Restore the guild properly so the stack is left in a clean state...');
  const restoreRes = await fetch(`${BASE}/admin/power-engine/guild/${TEST_GUILD_ID}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actorId: OWNER_ID, source: 'dashboard', reason: 'e2e-test cleanup' }),
  });
  if (restoreRes.status !== 200)
    throw new Error(`expected 200 on cleanup restore, got ${restoreRes.status}`);

  await knex.destroy();
  console.log('\nE2E scenario passed.');
}

main().catch((err) => {
  console.error('E2E scenario FAILED:', err);
  process.exit(1);
});
