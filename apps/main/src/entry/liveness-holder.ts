import { createServer, type Server } from 'node:http';

/**
 * UR-20261028-110 — the process must hold its port from the first millisecond.
 *
 * A platform scans for an open port within a fixed window and kills the instance if it finds none.
 * Bootstrap takes minutes — gateway login, module load, persona start, guild registration — and the
 * API server only listens at the very END of it. So the process was alive, healthy and working for
 * eighteen minutes while the platform saw a dead port and killed it, every time.
 *
 * The two facts are different and must be reported differently:
 *   * LIVENESS — "this process exists" — is true immediately, and this holder says so on `/health…`
 *     with a 200, which is what a port scan and a liveness probe are asking.
 *   * READINESS — "this process can serve" — is the application's own answer, and the real server
 *     reports it from the moment it takes the port over.
 *
 * The holder is closed immediately before the real server listens, so there is exactly one owner of
 * the port at any time and no window where neither is listening.
 */
export interface LivenessHolder {
  /** Release the port. Idempotent; safe to call when the bind never succeeded. */
  readonly close: () => Promise<void>;
  /** True when the holder actually owns the port. */
  readonly bound: boolean;
}

export async function startLivenessHolder(port: number, host = '0.0.0.0'): Promise<LivenessHolder> {
  const server: Server = createServer((req, res) => {
    const isProbe = (req.url ?? '').startsWith('/health');
    res.writeHead(isProbe ? 200 : 503, {
      'content-type': 'text/plain',
      ...(isProbe ? {} : { 'retry-after': '5' }),
    });
    res.end(isProbe ? 'ok\n' : 'starting: bootstrapping\n');
  });

  let bound = false;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        server.off('error', reject);
        resolve();
      });
    });
    bound = true;
    console.log(`liveness-holder: holding port ${port} while bootstrap runs`);
  } catch (err) {
    // Not fatal: the real server will report the bind failure with a better message. A holder that
    // cannot bind must never stop the boot.
    console.error(`liveness-holder: could not hold port ${port} (continuing): ${String(err)}`);
  }

  return {
    bound,
    async close() {
      if (!bound) return;
      bound = false;
      await new Promise<void>((resolve) => server.close(() => resolve()));
      console.log(`liveness-holder: released port ${port}`);
    },
  };
}
