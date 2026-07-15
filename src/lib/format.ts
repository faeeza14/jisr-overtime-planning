// Small formatting helpers shared across screens.

import type { PlanPeriod, PlanReason } from '../types';
import { DAY_NAMES, parseIsoLocal } from './weekly';

/** "6h" / "6.5h" — trims trailing .0 */
export const fmtH = (h: number): string => {
  const rounded = Math.round(h * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0$/, '')}h`;
};

/** SAR money — no decimals for whole amounts, 2dp otherwise. */
export const money = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  const body = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `SAR ${body}`;
};

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** "Mon, Jul 6" */
export const fmtDayShort = (iso: string): string =>
  parseIsoLocal(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

/** "Jul 6 – Jul 12" for a range period. */
export const fmtRange = (start: string, end: string): string => {
  const s = parseIsoLocal(start);
  const e = parseIsoLocal(end);
  const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return `${mo(s)} ${s.getDate()} – ${mo(e)} ${e.getDate()}`;
};

export const REASON_LABEL: Record<PlanReason, string> = {
  peak_demand: 'Peak demand',
  coverage_gap: 'Coverage gap',
  project_deadline: 'Project deadline',
  emergency: 'Emergency',
  other: 'Other',
};

export const periodLabel = (period: PlanPeriod): string => {
  if (period.kind === 'oneoff') return fmtDayShort(period.date);
  if (period.kind === 'range') return fmtRange(period.start, period.end);
  const days = period.weekdays.map((d) => DAY_NAMES[d]).join(', ');
  return `${days} · until ${fmtDayShort(period.until)}`;
};
