// Plans index table (brief §7.1). DS Table with custom cell renderers + row routing.
import { useNavigate } from 'react-router-dom';
import { Table, Avatar, AvatarGroup } from '@jisr-hr/ds-web';
import type { TableColumn } from '@jisr-hr/ds-web';
import { CalendarRange, CalendarDays, Repeat } from 'lucide-react';
import type { Employee, OTPolicy, OvertimePlan, OvertimeRecord } from '../../types';
import { StatusPill } from '../status/StatusPill';
import { distinctEmployees, estCost, plannedHours, recordsForPlan } from '../../store/selectors';
import { REASON_LABEL, fmtH, money, periodLabel } from '../../lib/format';

const TYPE_ICON = {
  range: <CalendarRange className="size-3.5" />,
  oneoff: <CalendarDays className="size-3.5" />,
  recurring: <Repeat className="size-3.5" />,
};

const TYPE_LABEL = { range: 'Range', oneoff: 'One-off', recurring: 'Recurring' };

export const PlanTable = ({
  plans,
  records,
  employees,
  policy,
}: {
  plans: OvertimePlan[];
  records: Record<string, OvertimeRecord>;
  employees: Employee[];
  policy: OTPolicy;
}) => {
  const navigate = useNavigate();
  const empById = new Map(employees.map((e) => [e.id, e]));

  const columns: TableColumn<OvertimePlan>[] = [
    {
      key: 'name',
      header: 'Plan',
      render: (p) => (
        <div>
          <div className="font-medium text-app-ink dark:text-app-ink-dark">{p.name}</div>
          <div className="text-11 text-app-faint">{REASON_LABEL[p.reason]}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 text-app-mute dark:text-app-mute-dark">
          {TYPE_ICON[p.type]} {TYPE_LABEL[p.type]}
        </span>
      ),
    },
    { key: 'period', header: 'Period', render: (p) => periodLabel(p.period) },
    {
      key: 'employees',
      header: 'Employees',
      render: (p) => {
        const ids = distinctEmployees(recordsForPlan(records, p));
        if (ids.length === 0) return <span className="text-app-faint">—</span>;
        return (
          <AvatarGroup max={4} size="s">
            {ids.map((id) => (
              <Avatar key={id} size="s" name={empById.get(id)?.name ?? '?'} />
            ))}
          </AvatarGroup>
        );
      },
    },
    {
      key: 'hours',
      header: 'Planned',
      align: 'right',
      render: (p) => fmtH(plannedHours(recordsForPlan(records, p))),
    },
    {
      key: 'cost',
      header: 'Est. cost',
      align: 'right',
      render: (p) => money(estCost(recordsForPlan(records, p), policy)),
    },
    { key: 'status', header: 'Status', render: (p) => <StatusPill status={p.status} /> },
  ];

  return (
    <Table
      columns={columns}
      data={plans}
      getRowKey={(p) => p.id}
      onRowClick={(p) => navigate(`/shifts/plan-overtime/${p.id}`)}
      emptyState={{ title: 'No plans match', description: 'Try a different status filter or search.' }}
    />
  );
};
