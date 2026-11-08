import Script from 'next/script';
import { headers } from 'next/headers';
import { WidgetStatus } from './widget-status';

export default async function ThirdParty() {
  // Reading headers() makes the page dynamic, which nonces require.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <main>
      <h1>Third-party script</h1>
      <p>
        <code>next/script</code> gets the request nonce. With <code>&apos;strict-dynamic&apos;</code>, scripts it loads
        are trusted too, so analytics or chat widgets work without listing every host they load.
      </p>
      <WidgetStatus />
      <Script src="/widget.js" strategy="afterInteractive" nonce={nonce} />
    </main>
  );
}
