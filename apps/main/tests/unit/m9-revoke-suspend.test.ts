import { test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import Fastify from 'fastify';
import {
  PowerEngineDispatcher,
  InMemoryAuditWriter,
} from '../../src/http/power-engine-dispatcher.js';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';

const trusted = { trustedSources: ['dashboard', 'swastik-internal', '127.0.0.1'] };

function makeChain<T>(resolved: T): Record<string, unknown> & { then: unknown } {
  const chain = {
    where: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    onConflict: vi.fn(),
    merge: vi.fn(),
    then: undefined as unknown,
  };
  chain.insert.mockReturnValue(chain);
  chain.onConflict.mockReturnValue(chain);
  chain.merge.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.update.mockResolvedValue(resolved);
  chain.then = (onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(onF, onR);
  return chain;
}

test('dispatcher serializes dispatch-level metadata into the audit entry (UR-C-11)', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);

  const outcome = await dispatcher.dispatch(
    'revokeModuleSignature',
    { actorId: 'owner', source: 'dashboard', reason: 'key rotation' },
    async () => 1,
    { metadata: { moduleSlug: 'catnip', keyId: 'k_123' } },
  );

  expect(outcome).toStrictEqual({ ok: true, result: 1 });
  expect(auditWriter.entries).toHaveLength(1);
  expect(auditWriter.entries[0]).toMatchObject({
    action: 'revokeModuleSignature',
    outcome: 'allowed',
    metadata: { moduleSlug: 'catnip', keyId: 'k_123' },
  });
});

test('revoke route hashes by the real keyId column, not the phantom moduleSlug (UR-C-11)', async () => {
  const chain = makeChain<number>(1);
  const app = Fastify();
  registerAdminRoutes(app, {
    dispatcher: new PowerEngineDispatcher(trusted, new InMemoryAuditWriter()),
    db: { knex: vi.fn(() => chain) },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/revokeModuleSignature',
    body: {
      actorId: 'owner',
      source: 'dashboard',
      reason: 'rotate',
      moduleSlug: 'catnip',
      keyId: 'k_123',
    },
  });

  expect(res.statusCode).toBe(200);
  expect(chain.where).toHaveBeenCalledWith({ keyId: 'k_123' });
  expect(chain.where).not.toHaveBeenCalledWith({ moduleSlug: 'catnip' });
  expect(chain.update).toHaveBeenCalledWith(
    expect.objectContaining({ revokedAt: expect.any(Date) }),
  );
}, 15_000);

test('revoke route answers 404 when zero rows match (UR-C-11)', async () => {
  const chain = makeChain<number>(0);
  const app = Fastify();
  registerAdminRoutes(app, {
    dispatcher: new PowerEngineDispatcher(trusted, new InMemoryAuditWriter()),
    db: { knex: vi.fn(() => chain) },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/revokeModuleSignature',
    body: {
      actorId: 'owner',
      source: 'dashboard',
      reason: 'rotate',
      moduleSlug: 'catnip',
      keyId: 'missing',
    },
  });

  expect(res.statusCode).toBe(404);
  expect(res.json().error?.code).toBe('DUMBY_NOT_FOUND');
}, 15_000);

test('suspendCommand inserts a NULL-guild fleet-wide row with the partial-index upsert (UR-A-10/UR-B-07)', async () => {
  const chain = makeChain<number>(1);
  const app = Fastify();
  registerAdminRoutes(app, {
    dispatcher: new PowerEngineDispatcher(trusted, new InMemoryAuditWriter()),
    db: {
      knex: Object.assign(
        vi.fn(() => chain),
        {
          raw: (sql: string) => ({ sql }),
        },
      ),
    },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/suspendCommand',
    body: {
      actorId: 'owner',
      source: 'dashboard',
      reason: 'broken command',
      commandName: 'pizza/order',
    },
  });

  expect(res.statusCode).toBe(200);
  expect(chain.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      guildId: null,
      commandKey: 'pizza/order',
      overrideType: 'disabled',
      payload: JSON.stringify({ fleetWide: true }),
    }),
  );
  expect(chain.onConflict).toHaveBeenCalledWith(
    expect.objectContaining({
      sql: expect.stringContaining('where "deletedAt" is null'),
    }),
  );
}, 15_000);

test('migration 00036 makes guildId nullable and adds the partial unique index (UR-A-10/UR-B-07)', () => {
  const src = readFileSync(
    new URL(
      '../../src/db/migrations/20260101000036_align_guild_command_overrides.ts',
      import.meta.url,
    ),
    'utf8',
  );
  expect(src).toContain("table.string('guildId').nullable().alter()");
  expect(src).toContain('create unique index if not exists guild_command_overrides_active_unique');
  expect(src).toContain('nulls not distinct');
  expect(src).toContain('where "deletedAt" is null');
  expect(src).toContain("table.string('guildId').notNullable().alter()");
});

test('bootstrap audit writer serializes entries into real audit_logs columns (UR-C-11)', () => {
  const src = readFileSync(new URL('../../src/bootstrap/bootstrap.ts', import.meta.url), 'utf8');
  const auditWriterBlock = src.slice(src.indexOf('auditWriter:'), src.indexOf('},\n    },\n  })'));
  expect(auditWriterBlock).toContain('createdAt: new Date(entry.at)');
  expect(auditWriterBlock).toContain('metadata: entry.metadata ?? {}');
  expect(auditWriterBlock).not.toContain(".knex('audit_logs').insert(entry)");
});
