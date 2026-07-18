// Scheduler OT chip — status-aware (Plan → Approve). Chips stop at approved.
// draft: grey dashed · pending: amber · approved: violet.
// An approved chip that overrides automatic OT that day shows a ⚡ "auto OT suppressed" marker (PRD FR-2).

import { Zap } from 'lucide-react';
import type { OvertimeRecord } from '../../types';
import { fmtH } from '../../lib/format';

const suppressesAuto = (r: OvertimeRecord): boolean => r.status === 'approved' && !!r.suppressesAutoOT;

const styleFor = (r: OvertimeRecord): string => {
  switch (r.status) {
    case 'draft':
      return 'border border-dashed border-app-line dark:border-app-line-dark text-app-mute dark:text-app-mute-dark bg-transparent';
    case 'pending':
      return 'bg-warn-bg text-warn-ink dark:bg-warn-bg-dark dark:text-warn-ink-dark';
    case 'approved':
      return 'bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark';
    case 'rejected':
      return 'bg-danger-bg text-danger-ink dark:bg-danger-bg-dark dark:text-danger-ink-dark line-through';
    default:
      return 'bg-app-subtle text-app-ink';
  }
};

const labelFor = (r: OvertimeRecord): string => `+${fmtH(r.plannedHours)} · ${r.status}`;
const titleFor = (r: OvertimeRecord): string =>
  suppressesAuto(r) ? `${labelFor(r)} · auto OT suppressed` : labelFor(r);

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
    title={titleFor(record)}
    className={[
      'inline-flex items-center gap-1 w-full rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate transition',
      'cursor-pointer hover:opacity-80 focus-ring',
      styleFor(record),
    ].join(' ')}
  >
    <span className="truncate">{labelFor(record)}</span>
    {suppressesAuto(record) && (
      <Zap className="size-2.5 shrink-0" aria-label="auto OT suppressed" />
    )}
  </button>
);
