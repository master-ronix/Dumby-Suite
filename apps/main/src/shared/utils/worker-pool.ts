import { Worker } from 'node:worker_threads';

/**
 * ACC-MOD-0015-4 — CPU-bound work runs in a `WorkerThreadPool`, and the request's correlationId
 * is serialized across the thread boundary so worker logs/traces stay linked to the request.
 */
export type PoolTask<I, O> = (input: I, correlationId: string) => O | Promise<O>;

interface WorkerReply<T> {
  ok: boolean;
  result?: T;
  error?: string;
  correlationId: string;
}

const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
const fn = (0, eval)('(' + workerData.source + ')');
Promise.resolve()
  .then(() => fn(workerData.input, workerData.correlationId))
  .then((result) => parentPort.postMessage({ ok: true, result, correlationId: workerData.correlationId }))
  .catch((error) => parentPort.postMessage({ ok: false, error: String((error && error.message) || error), correlationId: workerData.correlationId }));
`;

export class WorkerThreadPool {
  constructor(readonly size: number) {
    if (size < 1) throw new RangeError('WorkerThreadPool size must be >= 1');
  }

  async run<I, O>(task: PoolTask<I, O>, input: I, correlationId: string): Promise<O> {
    return new Promise<O>((resolve, reject) => {
      const worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: { source: task.toString(), input, correlationId },
      });
      worker.once('message', (reply: WorkerReply<O>) => {
        void worker.terminate();
        if (reply.ok) resolve(reply.result as O);
        else reject(new Error(reply.error ?? 'worker task failed'));
      });
      worker.once('error', (err) => {
        void worker.terminate();
        reject(err);
      });
    });
  }
}
