import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export type LocaleMessages = Record<string, string>;
export type LocaleBundle = Record<string, LocaleMessages>;

const DEFAULT_LOCALE = 'en-US';

export class I18nManager {
  private readonly bundles = new Map<string, LocaleBundle>();

  register(moduleId: string, bundle: LocaleBundle): void {
    this.bundles.set(moduleId, bundle);
  }

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
      return `${moduleId}.${key}`;
    }

    for (const [k, v] of Object.entries(params)) {
      raw = raw.replaceAll(`{{${k}}}`, String(v));
    }
    return raw;
  }

  static loadLocaleFile(localesDir: string, locale: string): LocaleMessages {
    const filePath = join(localesDir, `${locale}.json`);
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as LocaleMessages;
  }

  static buildBundle(localesDirUrl: string, locales: string[] = [DEFAULT_LOCALE]): LocaleBundle {
    const dir = dirname(fileURLToPath(localesDirUrl));
    const bundle: LocaleBundle = {};
    for (const locale of locales) {
      try {
        bundle[locale] = I18nManager.loadLocaleFile(dir, locale);
      } catch {}
    }
    return bundle;
  }
}
