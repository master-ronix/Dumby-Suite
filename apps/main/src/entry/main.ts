// No functional change: this commit exists only to trigger a fresh CI run on
// feature/dev so Railway redeploys the merged persona-owner sentinel fix (c7e4b4f37).
import { bootstrap } from '../bootstrap/bootstrap.js';
import { isMainEntry } from './is-main-entry.js';

if (isMainEntry(import.meta.url, process.argv[1])) {
  bootstrap().catch((err: unknown) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}
