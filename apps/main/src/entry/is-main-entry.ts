/**
 * Main-module detection for entrypoints (UR-C-23): an entry file may only
 * run its side effects (bootstrap etc.) when it is the actual process entry
 * script. Importing the file for testing or as a library must never start
 * the process.
 */
import { pathToFileURL } from 'node:url';

export function isMainEntry(moduleUrl: string, argv1: string | undefined): boolean {
  if (!argv1) return false;
  try {
    return pathToFileURL(argv1).href === moduleUrl;
  } catch {
    return false;
  }
}
