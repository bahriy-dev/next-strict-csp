import Link from 'next/link';
import { connection } from 'next/server';

export default async function Home() {
  // Nonces need a request: render this page per request instead of at build time.
  await connection();
  return (
    <main>
      <h1>Strict CSP for Next.js</h1>
      <p>
        Every response carries a fresh nonce. Only scripts with that nonce run, along with what they load. Injected
        <code>&lt;script&gt;</code> tags and inline handlers such as <code>onerror=</code> are blocked.
      </p>
      <ul>
        <li>Open DevTools → Network and compare the <code>Content-Security-Policy</code> header across reloads.</li>
        <li>
          <Link href="/third-party">Load a third-party script with the nonce</Link>
        </li>
      </ul>
    </main>
  );
}
