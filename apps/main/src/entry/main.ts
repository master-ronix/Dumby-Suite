/**
 * Main entry point — starts the full Dumby bot process.
 * This is the gateway-connected mode; set DISCORD_ADAPTER=live.
 *
 * For headless/mock mode (no live Discord connection), use the
 * bootstrap directly or leave DISCORD_ADAPTER unset (defaults to 'mock').
 *
 * Side effects only run when this file is the process entry script
 * (UR-C-23); importing it is inert.
 */
import { bootstrap } from '../bootstrap/bootstrap.js';
import { isMainEntry } from './is-main-entry.js';

if (isMainEntry(import.meta.url, process.argv[1])) {
  bootstrap().catch((err: unknown) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}
