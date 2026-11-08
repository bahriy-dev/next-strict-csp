# next-strict-csp

[![CI](https://github.com/bahriy-dev/next-strict-csp/actions/workflows/ci.yml/badge.svg)](https://github.com/bahriy-dev/next-strict-csp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)

**Next.js 16 starter with a nonce-based strict Content Security Policy and security headers, plus Playwright tests
that keep them working in Chromium, Firefox and WebKit.**

Click **Use this template** to start a project from it.

## What you get

| | |
| --- | --- |
| Per-request nonce | Generated in [`src/proxy.ts`](src/proxy.ts) with the platform CSPRNG. Next.js stamps it on every script it renders. |
| `'strict-dynamic'` | Scripts loaded by a trusted script are trusted too, so `next/script` widgets work without host allow-lists. |
| No `'unsafe-inline'` / `'unsafe-eval'` in production | Injected `<script>` tags and inline handlers like `onerror=` don't run. |
| Locked-down defaults | `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'self'`. |
| Security headers | HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, and no `X-Powered-By`. See [`next.config.ts`](next.config.ts). |
| Dev mode that works | `'unsafe-eval'` and inline styles only in `next dev`, which needs them for error overlays and HMR. |

## Tests that prove it

[`tests/csp.spec.ts`](tests/csp.spec.ts) runs against the production build in three engines:

- Every page response has a strict policy, and the nonce differs between requests.
- Every `<script>` Next.js renders carries the request's nonce.
- The app hydrates, navigates client-side and loads a third-party script with **zero** `securitypolicyviolation`
  events.
- An injected `<img onerror=…>` (the classic XSS payload) is blocked and reported.
- Static security headers are present.

```bash
npm install
npm run build
npx playwright install
npm run test:e2e
```

## The Safari pitfall this avoids

`upgrade-insecure-requests` is a common copy-paste directive. Chrome and Firefox don't apply it to `localhost`, but
**WebKit does**. A production build served over plain HTTP (`next start` locally, an internal health check) then
requests every script over HTTPS, so hydration and client navigation silently break in Safari.

This starter adds the directive only when the request arrived over HTTPS, using `x-forwarded-proto` behind a proxy.
The test suite covers both cases.

## Adding a third-party service

Extend the policy in one place and keep the defaults strict:

```ts
// src/proxy.ts
const csp = buildCsp(nonce, {
  dev,
  https,
  extra: {
    connect: ['https://www.google-analytics.com'],
    img: ['https://www.google-analytics.com'],
  },
});
```

Load the script with the nonce from a Server Component:

```tsx
import Script from 'next/script';
import { headers } from 'next/headers';

const nonce = (await headers()).get('x-nonce') ?? undefined;
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXX" strategy="afterInteractive" nonce={nonce} />;
```

## Trade-off: dynamic rendering

Nonces are per request, so pages that use them can't be statically prerendered. `await connection()` or reading
`headers()` opts a page into dynamic rendering. If a page has no scripts that need a nonce, consider a hash-based
policy and keep it static instead.

## Project structure

```
src/
  proxy.ts            per-request nonce + CSP header
  lib/csp.ts          policy builder (one place to extend)
  app/                demo pages, including a next/script widget
next.config.ts        static security headers
tests/csp.spec.ts     Playwright: Chromium, Firefox, WebKit
```

Based on the setup running in production at [parolaolustur.com](https://parolaolustur.com)
([source](https://github.com/bahriy-dev/parola-olustur)).

## License

[MIT](LICENSE)
