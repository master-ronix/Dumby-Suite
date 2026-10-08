/**
 * Project-wide default module icons (UR-20261008-004).
 *
 * A module's declared `ui.icon` always wins; when a module declares none, the default below
 * applies, keyed by module name, with a generic fallback for any module not listed. This is the
 * single icon fallback for every module-icon surface — the dashboard command list today, the
 * marketplace and modules pages next — so a module never renders without an icon.
 */
export const FALLBACK_MODULE_ICON = '🧩';

export const DEFAULT_MODULE_ICONS: Readonly<Record<string, string>> = {
  dashboard: '🏠',
  health: '🩺',
  browse: '🛒',
  queue: '📋',
  persona: '👥',
  permit: '🔑',
  modules: '📦',
  'hello-world': '👋',
};

export function moduleIcon(name: string, declared?: string): string {
  return declared ?? DEFAULT_MODULE_ICONS[name] ?? FALLBACK_MODULE_ICON;
}
