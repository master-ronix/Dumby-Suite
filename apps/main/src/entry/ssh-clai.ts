import { createHash, generateKeyPairSync } from 'node:crypto';
import { Server } from 'ssh2';
import type { ServerChannel, AuthContext } from 'ssh2';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';
import { ClaiSessionLimiter, stripAnsi as stripAnsiControl } from './clai-session-limits.js';

const env = parseEnv(pickEnvKeys(process.env));
const logger = createLogger(env.LOG_LEVEL);

const db = new DbClient({
  connectionString: env.DATABASE_URL,
  poolMax: env.DATABASE_POOL_MAX,
  statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
  slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
  criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
  logger,
});

const dispatcher = new PowerEngineDispatcher(
  { trustedSources: ['clai'] },
  {
    write: async (entry) => {
      await db.knex('audit_logs').insert({
        actorId: entry.actorId,
        source: entry.source,
        reason: entry.reason,
        action: entry.action,
        outcome: entry.outcome,
        rejectionReason: entry.rejectionReason ?? null,
        metadata: JSON.stringify({}),
      });
    },
  },
);

const claiSessionLimiter = new ClaiSessionLimiter(
  env.CLAI_MAX_SESSIONS,
  env.CLAI_MAX_BYTES_PER_SESSION,
);

interface Operator {
  operatorId: string;
  label: string;
}

function ephemeralHostKey(): Buffer {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return Buffer.from(privateKey);
}

export function publicKeyFingerprint(keyData: Buffer): string {
  return createHash('sha256').update(keyData).digest('base64');
}

async function authenticateOperator(ctx: AuthContext): Promise<Operator | null> {
  if (ctx.method !== 'publickey' || !ctx.key) return null;
  const fingerprint = publicKeyFingerprint(ctx.key.data);
  const prefixed = `SHA256:${fingerprint}`;
  const row = (await db
    .knex('clai_operators')
    .whereIn('sshPublicKeyFingerprint', [fingerprint, prefixed])
    .where({ revokedAt: null })
    .first()) as Operator | undefined;
  return row ?? null;
}

function stripAnsi(input: string): string {
  // UR-C-06: delegate to the hardened stripper in clai-session-limits.ts.
  return stripAnsiControl(input);
}

class PepActionNotImplementedError extends Error {
  constructor(functionName: string) {
    super(`PEP action "${functionName}" has no backing primitive implemented yet`);
    this.name = 'PepActionNotImplementedError';
  }
}

async function handlePepCommand(
  functionName: string,
  argsStr: string,
  operatorId: string,
): Promise<string> {
  try {
    const args = JSON.parse(argsStr) as Record<string, unknown>;
    const outcome = await dispatcher.dispatch(
      functionName,
      {
        actorId: operatorId,
        source: 'clai',
        reason: (args['reason'] as string) ?? 'CLAI command',
      },
      async () => {
        throw new PepActionNotImplementedError(functionName);
      },
    );
    if (!outcome.ok) {
      return `REJECTED: ${outcome.rejectionReason}`;
    }
    return `NOT IMPLEMENTED: ${functionName} has no backing primitive implemented yet`;
  } catch (err) {
    if (err instanceof PepActionNotImplementedError) {
      return `NOT IMPLEMENTED: ${functionName} has no backing primitive implemented yet`;
    }
    return `ERROR: ${String(err)}`;
  }
}

function openShell(channel: ServerChannel, operator: Operator, sessionToken: string): void {
  channel.write('CLAI - Dumby Command Line Administrative Interface\n');
  channel.write('Type "help" for commands. "quit" to exit.\n\n$ ');
  let buffer = '';

  channel.on('data', (chunk: Buffer) => {
    // UR-C-06: bound the bytes a single session may send.
    if (!claiSessionLimiter.account(sessionToken, chunk.length)) {
      channel.write('Session byte limit exceeded; closing.\n');
      channel.close();
      return;
    }
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const rawLine of lines) {
      void handleLine(channel, stripAnsi(rawLine).trim(), operator);
    }
  });
}

async function handleLine(channel: ServerChannel, line: string, operator: Operator): Promise<void> {
  if (line === 'quit' || line === 'exit') {
    channel.write('Goodbye.\n');
    channel.close();
    return;
  }
  if (line === 'help') {
    channel.write('Available commands:\n');
    channel.write('  help                          Show this message\n');
    channel.write('  pep <function> <args>         Invoke a PEP function\n');
    channel.write('  whoami                        Show your operator identity\n');
    channel.write('  quit / exit                   Disconnect\n\n$ ');
    return;
  }
  if (line === 'whoami') {
    channel.write(`Operator: ${operator.label} (${operator.operatorId})\n$ `);
    return;
  }
  if (line.startsWith('pep ')) {
    const rest = line.slice(4).trim();
    const spaceIdx = rest.indexOf(' ');
    const functionName = spaceIdx > 0 ? rest.slice(0, spaceIdx) : rest;
    const argsStr = spaceIdx > 0 ? rest.slice(spaceIdx + 1) : '{}';
    channel.write(`${await handlePepCommand(functionName, argsStr, operator.operatorId)}\n$ `);
    return;
  }
  if (line.length > 0) channel.write(`Unknown command: ${line}\n`);
  channel.write('$ ');
}

export function startClaiSshServer(): Server {
  const server = new Server({ hostKeys: [ephemeralHostKey()] }, (client) => {
    // UR-C-06: cap concurrent sessions.
    const sessionToken = claiSessionLimiter.open();
    if (sessionToken === null) {
      logger.warn('clai-session-refused', { reason: 'max-sessions-reached' });
      client.end();
      return;
    }
    client.on('close', () => claiSessionLimiter.close(sessionToken));
    let operator: Operator | null = null;

    client.on('authentication', (ctx) => {
      void authenticateOperator(ctx)
        .then((found) => {
          operator = found;
          if (found) ctx.accept();
          else ctx.reject();
        })
        .catch(() => ctx.reject());
    });

    client.on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();
        session.on('shell', (acceptShell) => {
          const channel = acceptShell();
          if (!operator) {
            channel.close();
            return;
          }
          openShell(channel, operator, sessionToken);
        });
      });
    });
  });

  server.listen(env.CLAI_PORT, env.CLAI_BIND_HOST, () => {
    logger.info('clai-ssh-started', { port: env.CLAI_PORT, host: env.CLAI_BIND_HOST });
  });
  return server;
}

startClaiSshServer();
