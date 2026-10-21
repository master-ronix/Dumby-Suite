/**
 * §11.5 — the public host this deployment's own asset routes are reachable at.
 *
 * The banner (and every other branding asset) ships in the image and this app's own API serves it at
 * `/assets/*`. Only the URL was ever platform-specific — and it was read from `RAILWAY_PUBLIC_DOMAIN`
 * alone. On any other host the lookup came back empty, so the renderer was constructed with no banner
 * URL and EVERY page silently dropped its banner. Nothing failed; the banners simply were not there.
 *
 * This resolves the host platform-agnostically, in precedence order:
 *
 *   1. `explicit`          — an operator-set `PUBLIC_DOMAIN`, which wins everywhere.
 *   2. `RAILWAY_PUBLIC_DOMAIN`     — injected by Railway.
 *   3. `RENDER_EXTERNAL_HOSTNAME`  — injected by Render (host only).
 *   4. `RENDER_EXTERNAL_URL`       — injected by Render (a full URL).
 *
 * With none of them — a local run — it returns `''`, and the caller omits the banner slot rather than
 * pointing it at a URL nothing serves.
 *
 * The value is normalised to a bare host: a leading scheme and any trailing slashes are stripped, so
 * either `dumby-suite.onrender.com` or `https://dumby-suite.onrender.com/` yields the same host.
 */
export function resolvePublicDomain(
  env: Readonly<Record<string, string | undefined>>,
  explicit?: string,
): string {
  const candidates = [
    explicit,
    env['RAILWAY_PUBLIC_DOMAIN'],
    env['RENDER_EXTERNAL_HOSTNAME'],
    env['RENDER_EXTERNAL_URL'],
  ];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== '') return toHost(candidate);
  }
  return '';
}

/** A bare host from a value that may be a bare host or a full URL. */
function toHost(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
