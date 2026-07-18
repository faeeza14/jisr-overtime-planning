// Monthly attendance Sheet table (change set §B). Grouped two-row header, sticky employee
// column, violet "Approved overtime" group fed live from approved records + requests.

import { Avatar } from '@jisr-hr/ds-web';
import type {
  Employee,
  OvertimeBeyondPlan,
  OvertimePlan,
  OvertimeRequest,
  OTSource,
  SheetRow,
} from '../../types';
import { ProvenanceDot } from './ProvenanceDot';
import { fmtH, fmtDayShort } from '../../lib/format';

const sourceTitle = (
  src: OTSource,
  plans: Record<string, OvertimePlan>,
  requests: Record<string, OvertimeRequest>,
  beyondPlan: Record<string, OvertimeBeyondPlan>,
): string => {
  if (src.type === 'plan') return `Overtime plan · ${plans[src.planId]?.name ?? src.planId}`;
  if (src.type === 'beyond_plan') {
    const bp = beyondPlan[src.id];
    return `Overtime beyond plan · ${bp ? fmtDayShort(bp.date) : src.id}`;
  }
  const req = requests[src.requestId];
  return `Approved request · ${req ? fmtDayShort(req.date) : src.requestId}`;
};

const Num = ({ v, neg }: { v: number; neg?: boolean }) => (
  <span className={neg && v < 0 ? 'text-danger-ink font-semibold' : ''}>{v}</span>
);

export const SheetTable = ({
  rows,
  employees,
  plans,
  requests,
  beyondPlan,
  flashEmployeeId,
}: {
  rows: SheetRow[];
  employees: Employee[];
  plans: Record<string, OvertimePlan>;
  requests: Record<string, OvertimeRequest>;
  beyondPlan: Record<string, OvertimeBeyondPlan>;
  flashEmployeeId?: string | null;
}) => {
  const empById = new Map(employees.map((e) => [e.id, e]));
  const th = 'px-3 py-2.5 border-b border-r border-app-line dark:border-app-line-dark text-center whitespace-nowrap';
  const td = 'px-3 py-2.5 border-b border-r border-app-line dark:border-app-line-dark text-center whitespace-nowrap tabular-nums';
  const otTd = `${td} bg-accent-bg/30 dark:bg-accent-bg-dark/30`;

  return (
    <div className="overflow-x-auto rounded-card hairline bg-app-card dark:bg-app-card-dark">
      <table className="w-full text-13 border-collapse min-w-[1100px]">
        <thead>
          <tr className="bg-app-surface dark:bg-app-subtle-dark text-11 uppercase tracking-wide text-app-mute">
            <th
              rowSpan={2}
              className={`${th} text-left sticky left-0 z-20 bg-app-surface dark:bg-app-subtle-dark min-w-[220px]`}
            >
              Employees ({employees.length})
            </th>
            <th colSpan={2} className={th}>Scheduled</th>
            <th colSpan={2} className={th}>Recorded</th>
            <th colSpan={4} className={th}>Punctuality Deductions</th>
            <th colSpan={3} className={`${th} bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark`}>
              Approved overtime
            </th>
          </tr>
          <tr className="bg-app-card dark:bg-app-card-dark text-[10.5px] font-medium text-app-faint">
            <th className={th}>Leave days</th>
            <th className={th}>Duration</th>
            <th className={th}>Worked duration</th>
            <th className={th}>Difference</th>
            <th className={th}>Absence</th>
            <th className={th}>Delay</th>
            <th className={th}>Shortage</th>
            <th className={th}>Missed shifts</th>
            <th className={`${th} bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark`}>Total approved OT</th>
            <th className={`${th} bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark`}>Approved OT as paid</th>
            <th className={`${th} bg-accent-bg text-accent-ink dark:bg-accent-bg-dark dark:text-accent-ink-dark`}>Approved OT as TOIL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const emp = empById.get(row.employeeId);
            const titles = row.sources.map((s) => sourceTitle(s, plans, requests, beyondPlan));
            const cappedUnder = row.otTotal > 0 && row.otTotal < row.otApproved; // worked under plan
            const flash = flashEmployeeId === row.employeeId;
            const otCell = [otTd, flash ? 'ring-2 ring-inset ring-ok-line bg-ok-bg/40' : ''].join(' ');
            return (
              <tr key={row.employeeId} className="hover:bg-app-surface/60 dark:hover:bg-app-subtle-dark/40">
                <td className="px-3 py-2.5 border-b border-r border-app-line dark:border-app-line-dark text-left sticky left-0 z-10 bg-app-card dark:bg-app-card-dark min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <Avatar size="s" name={emp?.name ?? '?'} />
                    <div className="min-w-0">
                      <div className="font-medium truncate text-app-ink dark:text-app-ink-dark">{emp?.name}</div>
                      <div className="text-11 text-app-faint truncate">{emp?.role} · #{emp?.roleNumber}</div>
                    </div>
                  </div>
                </td>
                <td className={td}><Num v={row.leaveDays} /></td>
                <td className={td}>{fmtH(row.scheduledDur)}</td>
                <td className={td}>{fmtH(row.workedDur)}</td>
                <td className={td}><Num v={row.diff} neg /></td>
                <td className={td}><Num v={row.absence} /></td>
                <td className={`${td} text-app-faint`}>—</td>
                <td className={`${td} text-app-faint`}>—</td>
                <td className={`${td} text-app-faint`}>—</td>
                <td className={otCell}>
                  <div className="flex flex-col items-center gap-0.5">
                    {row.otTotal > 0 ? (
                      <span className="font-medium text-app-ink dark:text-app-ink-dark">
                        {fmtH(row.otTotal)}
                        <ProvenanceDot titles={titles} />
                      </span>
                    ) : (
                      <span className="text-app-faint">—</span>
                    )}
                    {cappedUnder && (
                      <span className="text-[10px] text-app-faint">
                        paid {fmtH(row.otTotal)} of {fmtH(row.otApproved)} approved
                      </span>
                    )}
                    {row.excessPending > 0 && (
                      <span className="text-[10px] font-medium text-warn-ink bg-warn-bg rounded px-1 py-px">
                        +{fmtH(row.excessPending)} excess pending
                      </span>
                    )}
                  </div>
                </td>
                <td className={otCell}>{row.otPaid > 0 ? fmtH(row.otPaid) : <span className="text-app-faint">—</span>}</td>
                <td className={otCell}>{row.otToil > 0 ? fmtH(row.otToil) : <span className="text-app-faint">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
