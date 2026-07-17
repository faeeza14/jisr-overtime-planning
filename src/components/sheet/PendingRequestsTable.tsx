// Pending Requests — the unplanned OT lane (change set §B). Approving posts to the sheet.

import { Button, Avatar, Badge, Empty } from '@jisr-hr/ds-web';
import { CalendarDays, Clock, Inbox } from 'lucide-react';
import type { Employee, OvertimeRequest } from '../../types';
import { fmtDayShort, fmtH } from '../../lib/format';

export const PendingRequestsTable = ({
  requests,
  employees,
  onApprove,
  onReject,
}: {
  requests: OvertimeRequest[];
  employees: Employee[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  const empById = new Map(employees.map((e) => [e.id, e]));

  if (requests.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Empty media={<Inbox className="size-8" />} title="No pending requests" description="Unplanned OT captured from punches will appear here to approve." />
      </div>
    );
  }

  const metaPill = 'inline-flex items-center gap-1 rounded-full bg-app-surface dark:bg-app-subtle-dark px-2 py-0.5 text-11 text-app-mute';

  return (
    <div className="rounded-card hairline divide-y divide-app-line dark:divide-app-line-dark bg-app-card dark:bg-app-card-dark">
      {requests.map((req) => {
        const emp = empById.get(req.employeeId);
        return (
          <div key={req.id} className="flex flex-wrap items-center gap-3 p-3">
            <Avatar size="m" name={emp?.name ?? '?'} />
            <div className="min-w-0 w-40">
              <div className="font-medium truncate text-app-ink dark:text-app-ink-dark">{emp?.name}</div>
              <div className="text-11 text-app-faint truncate">{emp?.role} · #{emp?.roleNumber}</div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              <Badge appearance="success" size="small">Overtime</Badge>
              <span className={metaPill}><CalendarDays className="size-3" /> {fmtDayShort(req.date)}</span>
              <span className={metaPill}><Clock className="size-3" /> {fmtH(req.durationH)}</span>
              <span className={metaPill}>×{req.rateMultiplier}</span>
            </div>
            <div className="text-11 text-app-mute w-40">
              <div className="text-app-faint">Pending on</div>
              {req.approverName}
            </div>
            <div className="text-11 text-app-mute w-28">
              <div className="text-app-faint">Requested</div>
              {fmtDayShort(req.requestedOn)}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" appearance="danger" size="sm" onClick={() => onReject(req.id)}>Reject</Button>
              <Button variant="primary" size="sm" onClick={() => onApprove(req.id)}>Approve</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
