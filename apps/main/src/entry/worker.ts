/**
 * Worker entry point — runs the same full bootstrap as main.ts. A
 * dedicated worker-only bootstrap path (skipping the Discord-specific
 * stages) is a documented fast-follow, not this build's behavior — see
 * apps/main/docs/adr/004-three-tier-scope.md. The justification comment
 * below is therefore written to match what actually runs (UR-C-23): this
 * header does not claim a truncated bootstrap that does not exist yet.
 *
 * Side effects only run when this file is the process entry script
 * (UR-C-23); importing it is inert.
 */
import { bootstrap } from '../bootstrap/bootstrap.js';
import { isMainEntry } from './is-main-entry.js';

if (isMainEntry(import.meta.url, process.argv[1])) {
  bootstrap().catch((err: unknown) => {
    console.error('Fatal worker bootstrap error:', err);
    process.exit(1);
  });
}
