/**
 * i18n manager (Cluster: Ink). Loads and resolves locale strings.
 * Each module ships a mandatory en-US.json locale file; the manager
 * merges them keyed by module name. Only en-US is shipped in this build.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export type LocaleMessages = Record<string, string>;
export type LocaleBundle = Record<string, LocaleMessages>;

const DEFAULT_LOCALE = 'en-US';

export class I18nManager {
  private readonly bundles = new Map<string, LocaleBundle>();

  /** Register a module's locale bundle. Call from onLoad. */
  register(moduleId: string, bundle: LocaleBundle): void {
    this.bundles.set(moduleId, bundle);
  }

  /**
   * Resolve a translation string.
   * Key format: `{moduleId}.{key}` or just `{key}` for the module's own context.
   */
  t(
    moduleId: string,
    key: string,
    params: Record<string, string | number> = {},
    locale: string = DEFAULT_LOCALE,
  ): string {
    const bundle = this.bundles.get(moduleId);
    const messages = bundle?.[locale] ?? bundle?.[DEFAULT_LOCALE];
    let raw = messages?.[key];

    if (raw === undefined) {
      return `${moduleId}.${key}`; // Fallback: return the key itself.
    }

    // Simple {{param}} interpolation.
    for (const [k, v] of Object.entries(params)) {
      raw = raw.replaceAll(`{{${k}}}`, String(v));
    }
    return raw;
  }

  /** Load a JSON locale file from a module's locales/ directory. */
  static loadLocaleFile(localesDir: string, locale: string): LocaleMessages {
    const filePath = join(localesDir, `${locale}.json`);
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as LocaleMessages;
  }

  /** Build a bundle from a module's locales/ directory for all supported locales. */
  static buildBundle(localesDirUrl: string, locales: string[] = [DEFAULT_LOCALE]): LocaleBundle {
    const dir = dirname(fileURLToPath(localesDirUrl));
    const bundle: LocaleBundle = {};
    for (const locale of locales) {
      try {
        bundle[locale] = I18nManager.loadLocaleFile(dir, locale);
      } catch {
        // File not found for this locale — skip silently.
      }
    }
    return bundle;
  }
}
