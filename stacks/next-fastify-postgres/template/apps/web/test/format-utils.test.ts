import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatDate, formatMoney, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format-utils';

const NOW = Date.parse('2026-11-07T12:00:00Z');

describe('format-utils', () => {
  it('groups thousands and caps decimals at two', () => {
    expect(formatNumber(1234567.891)).toBe('1,234,567.89');
  });

  it('compacts large numbers for dashboards', () => {
    expect(formatCompactNumber(1_250_000)).toBe('1.3M');
  });

  it('formats a ratio as a percentage', () => {
    expect(formatPercent(0.1234)).toBe('12.3%');
  });

  it('formats integer minor units as money, including negatives and zero-decimal currencies', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
    expect(formatMoney(-500)).toBe('-$5.00');
    expect(formatMoney(1500, 'JPY')).toBe('¥1,500');
  });

  it('formats a date in the given time zone', () => {
    expect(formatDate('2026-11-07T23:30:00Z', 'UTC')).toBe('Nov 7, 2026');
  });

  it('describes recent times relatively and older ones as a date', () => {
    expect(formatRelativeTime(new Date(NOW - 30_000), NOW)).toBe('just now');
    expect(formatRelativeTime(new Date(NOW - 5 * 60_000), NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(new Date(NOW + 2 * 86_400_000), NOW)).toBe('in 2 days');
    expect(formatRelativeTime('2026-01-15T12:00:00Z', NOW)).toBe(formatDate('2026-01-15T12:00:00Z'));
  });
});
