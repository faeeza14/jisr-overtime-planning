// Sheet Summary tab (change set §B) — highlight counts + "View in Scheduler" cross-link.

import { useNavigate } from 'react-router-dom';
import { Card, Banner, Button } from '@jisr-hr/ds-web';
import { Coins, Inbox, RotateCcw, AlertTriangle, Users, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

const HL = ({ icon, label, n, warn }: { icon: ReactNode; label: string; n: number; warn?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-app-line dark:border-app-line-dark last:border-b-0">
    <span className="inline-flex items-center gap-2 text-13 text-app-ink dark:text-app-ink-dark">
      <span className={warn ? 'text-danger-ink' : 'text-app-mute'}>{icon}</span>
      {label}
    </span>
    <span className={['text-13 font-semibold tabular-nums', warn ? 'text-danger-ink' : 'text-app-ink dark:text-app-ink-dark'].join(' ')}>{n}</span>
  </div>
);

export const SummaryPanel = ({
  employeeCount,
  gotApprovedOT,
  gotPending,
}: {
  employeeCount: number;
  gotApprovedOT: number;
  gotPending: number;
}) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Banner appearance="warning" emphasis="mid" title="Attendance sheet might not be accurate">
        Some employees have unscheduled days or incomplete records. Review before compiling payroll.
      </Banner>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-[32px] leading-none font-semibold text-app-ink dark:text-app-ink-dark tabular-nums">{employeeCount}</div>
            <div className="text-11 text-app-mute mt-1">Employees in this sheet</div>
          </Card>
          <Card className="p-4">
            <div className="text-11 uppercase tracking-wide text-app-faint mb-1">Highlights</div>
            <HL icon={<Coins className="size-4" />} label="Got approved overtime" n={gotApprovedOT} />
            <HL icon={<Inbox className="size-4" />} label="Got pending requests" n={gotPending} />
            <HL icon={<RotateCcw className="size-4" />} label="Got retroactive transactions" n={0} />
            <HL icon={<AlertTriangle className="size-4" />} label="Got unscheduled days" n={12} warn />
            <HL icon={<Users className="size-4" />} label="Moved employees" n={5} />
          </Card>
        </div>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark">Need attention</div>
            <Button variant="tertiary" size="sm" onClick={() => navigate('/shifts/scheduler')}>
              View in Scheduler <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
          <p className="text-13 text-app-mute">
            Overtime posted here flows from the Scheduler → Plan Overtime → Approvals journey, plus any
            unplanned requests approved on the Pending Requests tab.
          </p>
        </Card>
      </div>
    </div>
  );
};
