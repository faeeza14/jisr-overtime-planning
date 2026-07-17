// Plan / record status → DS Badge (Plan → Approve).
// draft=grey · pending=amber · approved=blue(info) · rejected=red.

import { Badge } from '@jisr-hr/ds-web';
import type { PlanStatus } from '../../types';

const LABEL: Record<PlanStatus, string> = {
  draft: 'Draft',
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

const APPEARANCE: Record<PlanStatus, 'neutral' | 'warning' | 'info' | 'danger'> = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
};

export const StatusPill = ({ status }: { status: PlanStatus }) => (
  <Badge appearance={APPEARANCE[status]}>{LABEL[status]}</Badge>
);
