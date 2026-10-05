import { createHash, generateKeyPairSync } from 'node:crypto';
import { isMainEntry } from './is-main-entry.js';
import { Server } from 'ssh2';
import type { ServerChannel, AuthContext } from 'ssh2';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { PowerEngineClient } from '../http/power-engine-client.js';
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

/**
 * §22.7 — the CLAI reaches Power Engine through the real route with a service-to-service
 * credential, not by injecting a local handler (which is why no terminal command ever worked).
 */
const powerEngineClient = new PowerEngineClient({
  baseUrl: `http://${env.API_BIND_HOST}:${env.API_PORT}`,
  internalApiKey: env.INTERNAL_API_KEY,
  serviceCredential: env.POWER_ENGINE_SERVICE_CREDENTIAL,
  logger,
});

/** §22.7 — the CLAI session's own audit row, joined to the handler's by the correlation id. */
async function writeClaiAuditRow(input: {
  operatorId: string;
  action: string;
  correlationId: string;
  reason: string;
}): Promise<void> {
  await db.knex('audit_logs').insert({
    actorId: input.operatorId,
    source: 'clai',
    action: input.action,
    reason: input.reason,
    outcome: 'allowed',
    metadata: JSON.stringify({ surface: 'clai', correlationId: input.correlationId }),
  });
}

export const POWER_ENGINE_COMMAND_PREFIX = 'power-engine ';

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

async function handlePowerEngineCommand(
  functionName: string,
  argsStr: string,
  operatorId: string,
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsStr) as Record<string, unknown>;
  } catch {
    return 'ERROR: arguments must be a JSON object';
  }
  const reason = typeof args['reason'] === 'string' ? args['reason'] : 'CLAI command';
  const correlationId = powerEngineClient.newCorrelationId();
  // §22.7 — the CLAI session's own audit row, joined to the handler's by the correlation id.
  await writeClaiAuditRow({ operatorId, action: functionName, correlationId, reason });
  const result = await powerEngineClient.call(functionName, args, {
    actorId: operatorId,
    reason,
    correlationId,
  });
  if (!result.ok) return `REJECTED (${result.status}): ${JSON.stringify(result.body)}`;
  return `${JSON.stringify(result.body)} (correlationId: ${correlationId})`;
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
    channel.write('  power-engine <function> <args>         Invoke a Power Engine function\n');
    channel.write('  whoami                        Show your operator identity\n');
    channel.write('  quit / exit                   Disconnect\n\n$ ');
    return;
  }
  if (line === 'whoami') {
    channel.write(`Operator: ${operator.label} (${operator.operatorId})\n$ `);
    return;
  }
  if (line.startsWith(POWER_ENGINE_COMMAND_PREFIX)) {
    const rest = line.slice(POWER_ENGINE_COMMAND_PREFIX.length).trim();
    const spaceIdx = rest.indexOf(' ');
    const functionName = spaceIdx > 0 ? rest.slice(0, spaceIdx) : rest;
    const argsStr = spaceIdx > 0 ? rest.slice(spaceIdx + 1) : '{}';
    channel.write(
      `${await handlePowerEngineCommand(functionName, argsStr, operator.operatorId)}\n$ `,
    );
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

if (isMainEntry(import.meta.url, process.argv[1])) {
  startClaiSshServer();
}
