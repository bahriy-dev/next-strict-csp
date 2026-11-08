import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce } from '@/lib/csp';

// A fresh nonce per request. Next.js reads it from the request's CSP header and stamps it on every script it renders;
// server components can read it from the `x-nonce` header to pass to <Script nonce>.
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  // Behind a proxy or load balancer, the original scheme arrives in x-forwarded-proto.
  const https = (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')) === 'https';
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === 'development', https });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: static assets, images and API routes don't need a per-request policy.
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:js|css|png|svg|ico|txt|xml)$).*)',
      // Prefetches are not rendered as documents, so they would only burn a nonce.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
