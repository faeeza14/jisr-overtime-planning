// Plan / record status → DS Badge (brief §4.3 colour map).
// draft=grey · pending=amber · approved=blue(info) · reconciling=violet · settled=green · rejected=red.

import { Badge } from '@jisr-hr/ds-web';
import type { PlanStatus } from '../../types';

const LABEL: Record<PlanStatus, string> = {
  draft: 'Draft',
  pending: 'Pending approval',
  approved: 'Approved',
  reconciling: 'Reconciling',
  settled: 'Settled',
  rejected: 'Rejected',
};

// Badge appearances: info | success | warning | danger | neutral.
// Reconciling has no DS appearance → rendered as a violet accent pill (tokens-only).
const APPEARANCE: Record<Exclude<PlanStatus, 'reconciling'>, 'neutral' | 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'info',
  settled: 'success',
  rejected: 'danger',
};

export const StatusPill = ({ status }: { status: PlanStatus }) => {
  if (status === 'reconciling') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-11 font-medium bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark">
        {LABEL.reconciling}
      </span>
    );
  }
  return <Badge appearance={APPEARANCE[status]}>{LABEL[status]}</Badge>;
};
