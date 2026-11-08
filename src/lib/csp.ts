/**
 * Builds the Content-Security-Policy for one request.
 *
 * - Scripts: only those carrying this request's nonce, plus what they load ('strict-dynamic').
 *   No 'unsafe-inline', so injected <script> tags and inline event handlers (onerror=…) never run.
 * - Styles: same-origin stylesheets and nonce'd <style> tags. The dev server injects <style> tags without a nonce,
 *   so development allows inline styles; production does not.
 * - Everything else defaults to same-origin, and plugins, <base> rewriting and framing are off.
 *
 * Add third-party origins in `extra`, never by loosening the defaults.
 */
export type CspSources = Partial<Record<'script' | 'style' | 'img' | 'font' | 'connect' | 'frame', string[]>>;

export function buildCsp(
  nonce: string,
  { dev = false, https = true, extra = {} }: { dev?: boolean; https?: boolean; extra?: CspSources } = {},
): string {
  const list = (...sources: (string | false | undefined)[]) => sources.filter(Boolean).join(' ');
  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': list("'self'", `'nonce-${nonce}'`, "'strict-dynamic'", dev && "'unsafe-eval'", ...(extra.script ?? [])),
    'style-src': list("'self'", dev ? "'unsafe-inline'" : `'nonce-${nonce}'`, ...(extra.style ?? [])),
    'img-src': list("'self'", 'data:', 'blob:', ...(extra.img ?? [])),
    'font-src': list("'self'", ...(extra.font ?? [])),
    'connect-src': list("'self'", dev && 'ws:', ...(extra.connect ?? [])),
    'frame-src': extra.frame?.length ? extra.frame.join(' ') : "'none'",
    'object-src': "'none'",
    'base-uri': "'none'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
  };
  // Only over HTTPS: Safari applies the upgrade to http://localhost too, so a production build served over plain HTTP
  // (local `next start`, an internal health check) would request every asset over TLS and break.
  if (!dev && https) directives['upgrade-insecure-requests'] = '';
  return Object.entries(directives)
    .map(([name, value]) => (value ? `${name} ${value}` : name))
    .join('; ');
}

/** 128 bits from the platform CSPRNG, base64-encoded. Works in the Node and Edge runtimes. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
