/**
 * Worker entry point — runs background job processors without a
 * Discord gateway connection. Used for long-running queue workers
 * that should be horizontally scaled independently of the bot process.
 *
 * This entry point shares the same bootstrap as main.ts up through
 * Stage 08 (QUEUE_INIT), then skips the Discord-specific stages.
 */
import { bootstrap } from '../bootstrap/bootstrap.js';

// Workers use the same full bootstrap in this V1 build.
// A dedicated worker-only bootstrap path (skipping Discord login stages)
// is a documented fast-follow — see apps/main/docs/adr/004-three-tier-scope.md.
bootstrap().catch((err: unknown) => {
  console.error('Fatal worker bootstrap error:', err);
  process.exit(1);
});
