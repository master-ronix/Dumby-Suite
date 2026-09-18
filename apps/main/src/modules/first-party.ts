import type { ModuleRegistry } from './registry.js';
import {
  manifest as healthManifest,
  onLoad as healthOnLoad,
  onReady as healthOnReady,
  onUnload as healthOnUnload,
} from './health/index.js';
import {
  manifest as helloManifest,
  onLoad as helloOnLoad,
  onReady as helloOnReady,
  onUnload as helloOnUnload,
} from './hello-world/index.js';
import {
  manifest as dashboardManifest,
  onLoad as dashboardOnLoad,
  onReady as dashboardOnReady,
  onUnload as dashboardOnUnload,
} from './dashboard/index.js';
import {
  manifest as browseManifest,
  onLoad as browseOnLoad,
  onReady as browseOnReady,
  onUnload as browseOnUnload,
} from './browse/index.js';
import {
  manifest as queueManifest,
  onLoad as queueOnLoad,
  onReady as queueOnReady,
  onUnload as queueOnUnload,
} from './queue/index.js';
import {
  manifest as personaManifest,
  onLoad as personaOnLoad,
  onReady as personaOnReady,
  onUnload as personaOnUnload,
} from './persona/index.js';
import {
  manifest as permitManifest,
  onLoad as permitOnLoad,
  onReady as permitOnReady,
  onUnload as permitOnUnload,
} from './permit/index.js';
import {
  manifest as modulesManifest,
  onLoad as modulesOnLoad,
  onReady as modulesOnReady,
  onUnload as modulesOnUnload,
} from './modules/index.js';

const firstPartyModules = [
  {
    manifest: healthManifest,
    onLoad: healthOnLoad,
    onReady: healthOnReady,
    onUnload: healthOnUnload,
  },
  {
    manifest: helloManifest,
    onLoad: helloOnLoad,
    onReady: helloOnReady,
    onUnload: helloOnUnload,
  },
  {
    manifest: dashboardManifest,
    onLoad: dashboardOnLoad,
    onReady: dashboardOnReady,
    onUnload: dashboardOnUnload,
  },
  {
    manifest: browseManifest,
    onLoad: browseOnLoad,
    onReady: browseOnReady,
    onUnload: browseOnUnload,
  },
  {
    manifest: queueManifest,
    onLoad: queueOnLoad,
    onReady: queueOnReady,
    onUnload: queueOnUnload,
  },
  {
    manifest: personaManifest,
    onLoad: personaOnLoad,
    onReady: personaOnReady,
    onUnload: personaOnUnload,
  },
  {
    manifest: permitManifest,
    onLoad: permitOnLoad,
    onReady: permitOnReady,
    onUnload: permitOnUnload,
  },
  {
    manifest: modulesManifest,
    onLoad: modulesOnLoad,
    onReady: modulesOnReady,
    onUnload: modulesOnUnload,
  },
] as const;

export function registerFirstPartyModules(registry: ModuleRegistry): string[] {
  const registered: string[] = [];
  for (const mod of firstPartyModules) {
    if (registry.has(mod.manifest.name)) continue;
    registry.register(mod);
    registered.push(mod.manifest.name);
  }
  return registered;
}
