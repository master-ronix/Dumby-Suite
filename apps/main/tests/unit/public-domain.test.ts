import { test, expect, describe } from 'vitest';
import { resolvePublicDomain } from '../../src/shared/utils/public-domain.js';

/**
 * §11.5 — the banner (and every other branding asset) ships in the image and this app's own API
 * serves it. Only the URL was platform-specific, and it was read from `RAILWAY_PUBLIC_DOMAIN` alone:
 * on Render the lookup came back empty and every page silently dropped its banner. Nothing failed —
 * the banners were simply absent. These cases pin the platform-agnostic resolution that replaced it.
 */
describe('resolvePublicDomain', () => {
  test('an explicit PUBLIC_DOMAIN wins over everything', () => {
    expect(
      resolvePublicDomain(
        { RAILWAY_PUBLIC_DOMAIN: 'railway.example', RENDER_EXTERNAL_HOSTNAME: 'render.example' },
        'explicit.example',
      ),
    ).toBe('explicit.example');
  });

  test("resolves Railway's injected host", () => {
    expect(resolvePublicDomain({ RAILWAY_PUBLIC_DOMAIN: 'workspace.up.railway.app' })).toBe(
      'workspace.up.railway.app',
    );
  });

  test("resolves Render's injected hostname", () => {
    // This is the case that was broken: no Railway variable, but Render supplies its own.
    expect(resolvePublicDomain({ RENDER_EXTERNAL_HOSTNAME: 'dumby-suite.onrender.com' })).toBe(
      'dumby-suite.onrender.com',
    );
  });

  test("resolves Render's full external URL, stripped to a bare host", () => {
    expect(resolvePublicDomain({ RENDER_EXTERNAL_URL: 'https://dumby-suite.onrender.com' })).toBe(
      'dumby-suite.onrender.com',
    );
  });

  test('normalises a scheme and trailing slashes', () => {
    expect(resolvePublicDomain({ RENDER_EXTERNAL_URL: 'https://example.com/' })).toBe(
      'example.com',
    );
    expect(resolvePublicDomain({}, 'http://example.com///')).toBe('example.com');
  });

  test('returns empty when nothing supplies a host — a local run omits the banner', () => {
    expect(resolvePublicDomain({})).toBe('');
    expect(resolvePublicDomain({ RAILWAY_PUBLIC_DOMAIN: '' })).toBe('');
    expect(resolvePublicDomain({}, '')).toBe('');
  });

  test('Railway outranks Render when both are somehow present', () => {
    expect(
      resolvePublicDomain({
        RAILWAY_PUBLIC_DOMAIN: 'railway.example',
        RENDER_EXTERNAL_HOSTNAME: 'render.example',
      }),
    ).toBe('railway.example');
  });
});
