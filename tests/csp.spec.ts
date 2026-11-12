import { expect, test, type Page } from '@playwright/test';

const nonceOf = (csp: string) => csp.match(/'nonce-([^']+)'/)?.[1];

/** Collect CSP violations the page reports, so a test can assert there were none (or exactly the expected one). */
async function trackViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { violations: string[] }).violations.push(`${e.effectiveDirective} ${e.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { violations: string[] }).violations);
}

test('every page response carries a strict policy with a fresh nonce', async ({ request }) => {
  const policies = await Promise.all([request.get('/'), request.get('/')].map(async (r) => (await r).headers()['content-security-policy']));
  for (const csp of policies) {
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  }
  const [a, b] = policies.map(nonceOf);
  expect(a).toBeTruthy();
  expect(a).not.toBe(b);
});

test('every script Next.js renders carries the request nonce', async ({ page }) => {
  const response = await page.goto('/');
  const nonce = nonceOf(response!.headers()['content-security-policy']);
  const html = await response!.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const tag of scripts) expect(tag).toContain(`nonce="${nonce}"`);
});

test('the app hydrates and navigates without a single violation', async ({ page }) => {
  const violations = await trackViolations(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('link', { name: /third-party script/ }).click();
  await expect(page.getByRole('status')).toHaveText('Widget loaded under the strict policy.');
  expect(await violations()).toEqual([]);
  expect(errors).toEqual([]);
});

test('an injected inline handler (classic XSS) is blocked', async ({ page }) => {
  const violations = await trackViolations(page);
  await page.goto('/');
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<img src="/does-not-exist.png" onerror="window.pwned = true">');
  });
  await expect.poll(violations).toContainEqual(expect.stringMatching(/^script-src/));
  expect(await page.evaluate(() => (window as unknown as { pwned?: boolean }).pwned)).toBeUndefined();
});

test('static security headers are set and the framework is not advertised', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['strict-transport-security']).toContain('max-age=63072000');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('insecure requests are upgraded only when the page was served over HTTPS', async ({ request }) => {
  // Safari also upgrades http://localhost, so the directive must not appear on plain-HTTP responses.
  expect((await request.get('/')).headers()['content-security-policy']).not.toContain('upgrade-insecure-requests');
  const behindTls = await request.get('/', { headers: { 'x-forwarded-proto': 'https' } });
  expect(behindTls.headers()['content-security-policy']).toContain('upgrade-insecure-requests');
});
