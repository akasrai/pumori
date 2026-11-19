import localFont from 'next/font/local';

/**
 * The product's typeface, self-hosted through next/font so it needs no network at build time and passes
 * the CSP (`font-src 'self'`). Default: Geist (variable, weights 100-900; SIL Open Font License 1.1, see
 * ./OFL.txt). A brand replaces this folder (`pumori brand apply <name>`); keep the export name and the
 * `--font-brand-sans` variable.
 */
export const fontSans = localFont({
  src: [{ path: './Geist-Variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-brand-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});
