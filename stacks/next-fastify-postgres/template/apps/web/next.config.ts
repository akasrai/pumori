import path from 'node:path';
import type { NextConfig } from 'next';

const repoRoot = path.join(__dirname, '../..');
// Server-side address of the API. Browser code never talks to it directly: it calls /api/*,
// which is rewritten here so the session cookie stays same-origin.
const apiUrl = process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? '4000'}`;
// `next dev` sets NODE_ENV=development, `next build`/`next start` set production. headers() are
// evaluated at build time, so a production build always carries the production policy.
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy that works with Next without nonces (Next's "Without Nonces" guide):
 * - script-src 'unsafe-inline': the App Router streams its payload in inline <script> tags. To drop
 *   it, generate a per-request nonce in proxy.ts (see node_modules/next/dist/docs/01-app/02-guides/
 *   content-security-policy.md); that makes every page dynamically rendered.
 * - 'unsafe-eval' in development only: React's dev tooling and Fast Refresh use eval.
 * - style-src 'unsafe-inline': React `style` props and Next's injected styles.
 * - connect-src 'self': the browser only talks to this origin (/api/* is rewritten server-side);
 *   in dev it also covers the HMR websocket. Add origins here when you add a third-party service.
 * - frame-ancestors 'none': nobody may frame the app (clickjacking).
 * - no upgrade-insecure-requests: it breaks http staging (`./staging.sh`, `./init.sh --prod`);
 *   HSTS covers https deployments.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // Production builds only: browsers remember HSTS for max-age, and it is ignored over plain http.
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

// Development only: the UI gallery (/dev/ui) shows each app shell live in a same-origin iframe of
// /dev/ui/shells/<shell>, so those preview pages may be framed by this origin. Production builds never
// get this rule (the pages are a 404 there anyway), so the app stays unframeable.
const framableBySelf = securityHeaders.map((header) => {
  if (header.key === 'Content-Security-Policy') return { ...header, value: header.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") };

  if (header.key === 'X-Frame-Options') return { ...header, value: 'SAMEORIGIN' };

  return header;
});

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // e2e and `./verify --release` run their own servers next to ./init.sh's, so they need separate build dirs.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@app/shared'],
  poweredByHeader: false,
  // The repo-root AGENTS.md is authoritative; stop `next dev` from writing apps/web/AGENTS.md.
  agentRules: false,
  reactStrictMode: true,
  // Keep the dev-mode "N" badge away from the app shell's account menu (bottom-left).
  devIndicators: { position: 'bottom-right' },
  async headers() {
    // A later rule overrides an earlier one for the same header key.
    return [
      { source: '/:path*', headers: securityHeaders },
      ...(isProd ? [] : [{ source: '/dev/ui/shells/:path*', headers: framableBySelf }]),
    ];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
