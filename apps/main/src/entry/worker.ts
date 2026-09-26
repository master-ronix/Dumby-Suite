import { bootstrap } from '../bootstrap/bootstrap.js';
import { isMainEntry } from './is-main-entry.js';

if (isMainEntry(import.meta.url, process.argv[1])) {
  bootstrap().catch((err: unknown) => {
    console.error('Fatal worker bootstrap error:', err);
    process.exit(1);
  });
}
