import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';

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
  { trustedSources: ['clai', '127.0.0.1', '::1'] },
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

async function authenticateOperator(
  fingerprint: string,
): Promise<{ operatorId: string; label: string } | null> {
  const row = (await db
    .knex('clai_operators')
    .where({ sshPublicKeyFingerprint: fingerprint, revokedAt: null })
    .first()) as { operatorId: string; label: string } | undefined;
  return row ?? null;
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
      async () => args,
    );
    if (outcome.ok) {
      return `OK: ${functionName} completed`;
    }
    return `REJECTED: ${outcome.rejectionReason}`;
  } catch (err) {
    return `ERROR: ${String(err)}`;
  }
}

interface ClaiSession {
  operatorId: string;
  label: string;
  authenticated: boolean;
  write: (text: string) => void;
  close: () => void;
}

async function runSession(session: ClaiSession): Promise<void> {
  session.write('CLAI — Dumby Command Line Administrative Interface\n');
  session.write('Type "help" for commands. "quit" to exit.\n\n');
  session.write('$ ');
}

import { createInterface } from 'node:readline';
import { createServer } from 'node:net';

const netServer = createServer((socket) => {
  const rl = createInterface({ input: socket, output: socket, terminal: true });
  let authenticated = false;
  let operatorId = '';
  let label = '';

  const write = (text: string) => socket.write(text);
  const close = () => {
    rl.close();
    socket.end();
  };

  socket.write('CLAI SSH Authentication Required\n');
  write('Enter SSH public key fingerprint: ');

  let expectingFingerprint = true;

  rl.on('line', async (line: string) => {
    const trimmed = line.trim();

    if (expectingFingerprint) {
      const operator = await authenticateOperator(trimmed);
      if (operator) {
        authenticated = true;
        operatorId = operator.operatorId;
        label = operator.label;
        logger.info('clai-operator-authenticated', { operatorId, label });
        void runSession({
          operatorId,
          label,
          authenticated: true,
          write,
          close,
        });
      } else {
        write('Authentication failed. Connection closed.\n');
        close();
      }
      expectingFingerprint = false;
      return;
    }

    if (!authenticated) {
      write('Access denied.\n');
      close();
      return;
    }

    if (trimmed === 'quit' || trimmed === 'exit') {
      write('Goodbye.\n');
      close();
      return;
    }

    if (trimmed === 'help') {
      write('Available commands:\n');
      write('  help                          Show this message\n');
      write('  pep <function> <args>         Invoke a PEP function\n');
      write('  whoami                        Show your operator identity\n');
      write('  quit / exit                   Disconnect\n');
      write('\n');
      write('PEP domains: guild.suspend, guild.restore, module.suspend,\n');
      write('  module.restore, system.maintenance-mode.set\n');
      write('$ ');
      return;
    }

    if (trimmed === 'whoami') {
      write(`Operator: ${label} (${operatorId})\n`);
      write('$ ');
      return;
    }

    if (trimmed.startsWith('pep ')) {
      const rest = trimmed.slice(4).trim();
      const spaceIdx = rest.indexOf(' ');
      const functionName = spaceIdx > 0 ? rest.slice(0, spaceIdx) : rest;
      const argsStr = spaceIdx > 0 ? rest.slice(spaceIdx + 1) : '{}';
      const result = await handlePepCommand(functionName, argsStr, operatorId);
      write(`${result}\n`);
      write('$ ');
      return;
    }

    if (trimmed.length > 0) {
      write(`Unknown command: ${trimmed}\n`);
    }
    write('$ ');
  });

  socket.on('error', (err: Error) => {
    logger.error('clai-socket-error', { error: err.message });
  });
});

netServer.listen(env.CLAI_PORT, '127.0.0.1', () => {
  logger.info('clai-started', {
    port: env.CLAI_PORT,
    host: '127.0.0.1',
    note: 'CLAI is running as a TCP REPL. For SSH, install ssh2 and use entry/ssh-clai.ts',
  });
});
