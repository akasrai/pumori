import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Card } from './card';
import { Icon as IconGlyph } from './icon';
import { Skeleton } from './skeleton';

export const STAT_TREND = { UP: 'up', DOWN: 'down', FLAT: 'flat' } as const;
export type StatTrend = (typeof STAT_TREND)[keyof typeof STAT_TREND];

export interface StatCardProps {
  label: string;
  /** Already formatted (`formatMoney`, `formatNumber`). */
  value: ReactNode;
  /** Change vs. the previous period, already formatted ("+12% vs last week"). */
  change?: string;
  /** Whether the change is good news (green), bad (red) or neutral. Direction alone is not enough. */
  tone?: 'positive' | 'negative' | 'neutral';
  trend?: StatTrend;
  /** Optional; only when it adds meaning (most stats need none). */
  icon?: LucideIcon;
  /** "Next action" shortcut: the whole card links to the filtered list ("12 overdue" → overdue invoices). */
  href?: string;
  /** Visible text of the shortcut link, e.g. "View overdue". */
  actionLabel?: string;
  isLoading?: boolean;
  className?: string;
}

const TONE_CLASS = {
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
} as const;

const TREND_ICON = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: ArrowRightIcon } as const;

/** One KPI on a dashboard: label, big number, change, and an optional link to act on it. */
export const StatCard = ({ label, value, change, tone = 'neutral', trend, icon: Icon, href, actionLabel, isLoading = false, className }: StatCardProps) => {
  const TrendIcon = trend ? TREND_ICON[trend] : null;

  return (
    <Card className={cn('relative gap-1 px-5 py-4 md:px-5', href ? 'transition-colors hover:border-border-strong' : '', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">{label}</p>
        {Icon ? <IconGlyph icon={Icon} /> : null}
      </div>
      {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>}
      {change && !isLoading ? (
        <p className={cn('flex items-center gap-1 text-caption tabular-nums', TONE_CLASS[tone])}>
          {TrendIcon ? <TrendIcon aria-hidden="true" className="size-3.5" /> : null}
          {change}
        </p>
      ) : null}
      {href ? (
        <Link href={href} className="text-caption font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-lg hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring">
          {actionLabel ?? `View ${label.toLowerCase()}`}
        </Link>
      ) : null}
    </Card>
  );
};
