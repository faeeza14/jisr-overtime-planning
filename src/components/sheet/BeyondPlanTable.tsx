// Overtime beyond plan (PRD §2.3 / §4.3) — plan-anchored excess worked over an approved plan.
// Shows Approved (P) / Worked (A) / +excess. Approve → the excess posts to the sheet; Reject → capped.

import { Button, Avatar, Badge, Empty } from '@jisr-hr/ds-web';
import { CalendarDays, Inbox } from 'lucide-react';
import type { Employee, OvertimeBeyondPlan, OvertimePlan } from '../../types';
import { fmtDayShort, fmtH } from '../../lib/format';

export const BeyondPlanTable = ({
  items,
  employees,
  plans,
  onApprove,
  onReject,
}: {
  items: OvertimeBeyondPlan[];
  employees: Employee[];
  plans: Record<string, OvertimePlan>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  const empById = new Map(employees.map((e) => [e.id, e]));

  if (items.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Empty
          media={<Inbox className="size-8" />}
          title="No overtime beyond plan"
          description="When an employee works more than their approved plan, the excess is raised here for its own approval."
        />
      </div>
    );
  }

  const metaPill =
    'inline-flex items-center gap-1 rounded-full bg-app-surface dark:bg-app-subtle-dark px-2 py-0.5 text-11 text-app-mute';

  return (
    <div className="rounded-card hairline divide-y divide-app-line dark:divide-app-line-dark bg-app-card dark:bg-app-card-dark">
      {items.map((bp) => {
        const emp = empById.get(bp.employeeId);
        return (
          <div key={bp.id} className="flex flex-wrap items-center gap-3 p-3">
            <Avatar size="m" name={emp?.name ?? '?'} />
            <div className="min-w-0 w-40">
              <div className="font-medium truncate text-app-ink dark:text-app-ink-dark">{emp?.name}</div>
              <div className="text-11 text-app-faint truncate">{emp?.role} · #{emp?.roleNumber}</div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              <Badge appearance="warning" size="small">Overtime beyond plan</Badge>
              <span className={metaPill}><CalendarDays className="size-3" /> {fmtDayShort(bp.date)}</span>
              <span className={metaPill}>Approved {fmtH(bp.approvedHours)}</span>
              <span className={metaPill}>Worked {fmtH(bp.actualHours)}</span>
              <span className="inline-flex items-center rounded-full bg-warn-bg text-warn-ink px-2 py-0.5 text-11 font-medium">
                +{fmtH(bp.excessHours)}
              </span>
              <span className={metaPill}>×{bp.rateMultiplier}</span>
              {bp.otType === 'toil' && <Badge appearance="neutral" size="small">TOIL</Badge>}
            </div>
            <div className="text-11 text-app-mute w-40">
              <div className="text-app-faint">Plan</div>
              {plans[bp.planId]?.name ?? bp.planId}
            </div>
            <div className="text-11 text-app-mute w-28">
              <div className="text-app-faint">Raised</div>
              {bp.source === 'auto_create' ? 'Auto' : 'Employee'} · {fmtDayShort(bp.createdOn)}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" appearance="danger" size="sm" onClick={() => onReject(bp.id)}>
                Reject — cap at plan
              </Button>
              <Button variant="primary" size="sm" onClick={() => onApprove(bp.id)}>
                Approve extra
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
