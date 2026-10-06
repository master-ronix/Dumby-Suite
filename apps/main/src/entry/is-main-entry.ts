import { pathToFileURL } from 'node:url';

export function isMainEntry(moduleUrl: string, argv1: string | undefined): boolean {
  if (!argv1) return false;
  try {
    return pathToFileURL(argv1).href === moduleUrl;
  } catch {
    return false;
  }
}
