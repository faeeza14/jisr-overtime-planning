// Scheduler OT chip — status-aware (brief §6 reflection table).
// draft: grey dashed · pending: amber · approved/reconcile: violet · settled: green + lock.

import { Lock } from 'lucide-react';
import type { OvertimeRecord } from '../../types';
import { fmtH } from '../../lib/format';

const styleFor = (r: OvertimeRecord): string => {
  switch (r.status) {
    case 'draft':
      return 'border border-dashed border-app-line dark:border-app-line-dark text-app-mute dark:text-app-mute-dark bg-transparent';
    case 'pending':
      return 'bg-warn-bg text-warn-ink dark:bg-warn-bg-dark dark:text-warn-ink-dark';
    case 'approved':
    case 'reconciling':
      return 'bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark';
    case 'settled':
      return 'bg-ok-bg text-ok-ink dark:bg-ok-bg-dark dark:text-ok-ink-dark';
    case 'rejected':
      return 'bg-danger-bg text-danger-ink dark:bg-danger-bg-dark dark:text-danger-ink-dark line-through';
    default:
      return 'bg-app-subtle text-app-ink';
  }
};

const labelFor = (r: OvertimeRecord): string => {
  switch (r.status) {
    case 'draft':
      return `+${fmtH(r.plannedHours)} · draft`;
    case 'pending':
      return `+${fmtH(r.plannedHours)} · pending`;
    case 'approved':
      return `+${fmtH(r.plannedHours)} · approved`;
    case 'reconciling':
      return `+${fmtH(r.plannedHours)} · to reconcile`;
    case 'settled': {
      const actual = r.actualHours ?? r.plannedHours;
      return `${fmtH(r.plannedHours)}→${fmtH(actual)} · paid`;
    }
    case 'rejected':
      return `+${fmtH(r.plannedHours)} · rejected`;
    default:
      return `+${fmtH(r.plannedHours)}`;
  }
};

export const OTChip = ({
  record,
  onClick,
}: {
  record: OvertimeRecord;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={labelFor(record)}
    className={[
      'inline-flex items-center gap-1 w-full rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate transition',
      styleFor(record),
      record.status === 'settled' ? 'cursor-default' : 'cursor-pointer hover:opacity-80',
    ].join(' ')}
  >
    <span className="truncate">{labelFor(record)}</span>
    {record.status === 'settled' && <Lock className="size-2.5 shrink-0" />}
  </button>
);
