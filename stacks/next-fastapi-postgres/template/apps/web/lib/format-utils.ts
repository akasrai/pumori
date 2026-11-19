/**
 * Display formatting for numbers, money and dates (docs/design.md § Formatting). One locale for the
 * whole app; never format with string concatenation or `toFixed` in components.
 */
export const LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'USD';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/** 1234567 → "1,234,567"; 0.5 → "0.5". */
export const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}): string => {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2, ...options }).format(value);
};

/** 1234567 → "1.2M": dashboards and stat cards only; tables show the full number. */
export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

/** 0.1234 → "12.3%". Takes a ratio, not a percentage. */
export const formatPercent = (ratio: number, fractionDigits = 1): string => {
  return new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: fractionDigits }).format(ratio);
};

/**
 * Money is stored and sent as integer minor units (cents). 123456 → "$1,234.56"; negative → "-$1,234.56".
 * Always shows the currency's minor digits so amounts line up in tables.
 */
export const formatMoney = (amountMinor: number, currency: string = DEFAULT_CURRENCY): string => {
  const format = new Intl.NumberFormat(LOCALE, { style: 'currency', currency });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;

  return format.format(amountMinor / 10 ** digits);
};

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

/** "Nov 7, 2026". Pass `timeZone` when the date must not shift with the viewer's zone (e.g. due dates). */
export const formatDate = (value: Date | string, timeZone?: string): string => {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', ...(timeZone ? { timeZone } : {}) }).format(toDate(value));
};

/** "Nov 7, 2026, 3:04 PM". */
export const formatDateTime = (value: Date | string, timeZone?: string): string => {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) }).format(toDate(value));
};

/** "just now", "5 minutes ago", "in 2 days"; older than a week falls back to `formatDate`. */
export const formatRelativeTime = (value: Date | string, now: number = Date.now()): string => {
  const diff = toDate(value).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

  if (abs < MINUTE_MS) return 'just now';

  if (abs < HOUR_MS) return rtf.format(Math.round(diff / MINUTE_MS), 'minute');

  if (abs < DAY_MS) return rtf.format(Math.round(diff / HOUR_MS), 'hour');

  if (abs < WEEK_MS) return rtf.format(Math.round(diff / DAY_MS), 'day');

  return formatDate(value);
};
