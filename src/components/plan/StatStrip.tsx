// Stat strip for the Plan Overtime index (brief §7.1).
import { Card } from '@jisr-hr/ds-web';
import type { ReactNode } from 'react';
import { BudgetMeter } from './BudgetMeter';
import { fmtH } from '../../lib/format';
import type { PlanStats } from '../../store/selectors';

const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) => (
  <Card className="p-4">
    <div className="text-11 uppercase tracking-wide text-app-faint">{label}</div>
    <div className="mt-1 text-[26px] leading-none font-semibold text-app-ink dark:text-app-ink-dark tabular-nums">
      {value}
    </div>
    {sub && <div className="mt-1 text-11 text-app-mute">{sub}</div>}
  </Card>
);

export const StatStrip = ({ stats }: { stats: PlanStats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <Stat label="Active plans" value={stats.activePlans} />
    <Stat label="Pending approval" value={stats.pendingApproval} sub="awaiting Finance → Top mgmt" />
    <Stat label="Planned hours · month" value={fmtH(stats.plannedHoursMonth)} />
    <Card className="p-4">
      <div className="text-11 uppercase tracking-wide text-app-faint mb-2">Committed vs budget</div>
      <BudgetMeter budget={stats.budget} committed={stats.committed} compact />
    </Card>
  </div>
);
