import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Table, Avatar, Badge, SmartBreadcrumb, Banner } from '@jisr-hr/ds-web';
import type { TableColumn } from '@jisr-hr/ds-web';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useOTStore } from '../store';
import { recordsForPlan, plannedHours, estCost } from '../store/selectors';
import { StatusPill } from '../components/status/StatusPill';
import { BudgetMeter } from '../components/plan/BudgetMeter';
import { REASON_LABEL, fmtDayShort, fmtH, money, periodLabel } from '../lib/format';
import type { OvertimeRecord } from '../types';

const Meta = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-11 text-app-faint">{label}</dt>
    <dd className="text-13 text-app-ink dark:text-app-ink-dark">{value ?? '—'}</dd>
  </div>
);

export const PlanSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { plans, records, employees, policy, costCentres } = useOTStore();

  const plan = id ? plans[id] : undefined;
  if (!plan) {
    return (
      <div className="p-6">
        <Banner appearance="warning">Plan not found.</Banner>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate('/shifts/plan-overtime')}>Back to plans</Button>
        </div>
      </div>
    );
  }

  const recs = recordsForPlan(records, plan);
  const empById = new Map(employees.map((e) => [e.id, e]));
  const costCentre = costCentres.find((c) => c.id === plan.costCentreId);
  const budget = policy.budgets.find((b) => b.costCentreId === plan.costCentreId);

  const columns: TableColumn<OvertimeRecord>[] = [
    {
      key: 'emp',
      header: 'Employee',
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <Avatar size="s" name={empById.get(r.employeeId)?.name ?? '?'} />
          {empById.get(r.employeeId)?.name}
        </span>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => fmtDayShort(r.date) },
    {
      key: 'dayType',
      header: 'Day',
      render: (r) => (
        <Badge appearance={r.dayType === 'rest' ? 'info' : 'neutral'} size="small">
          {r.dayType === 'rest' ? 'Rest · 2×' : 'Normal · 1.5×'}
        </Badge>
      ),
    },
    { key: 'planned', header: 'Planned', align: 'right', render: (r) => fmtH(r.plannedHours) },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <Badge appearance={r.otType === 'paid' ? 'info' : 'neutral'} size="small">
          {r.otType === 'paid' ? 'Paid' : 'TOIL'}
        </Badge>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ];

  return (
    <div className="p-5 sm:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/shifts/plan-overtime')}
          className="size-7 inline-flex items-center justify-center rounded-md hover:bg-app-surface dark:hover:bg-app-subtle-dark"
          aria-label="Back to plans"
        >
          <ArrowLeft className="size-4" />
        </button>
        <SmartBreadcrumb
          items={[
            { label: 'Shifts & scheduling', to: '/shifts/scheduler' },
            { label: 'Plan Overtime', to: '/shifts/plan-overtime' },
            { label: plan.name },
          ]}
        />
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-semibold text-app-ink dark:text-app-ink-dark">{plan.name}</h1>
          <div className="mt-1"><StatusPill status={plan.status} /></div>
        </div>
        {plan.status === 'draft' && (
          <Button variant="secondary" onClick={() => navigate('/shifts/plan-overtime/new')}>
            <Pencil className="size-3.5" /> New plan
          </Button>
        )}
      </div>

      {plan.status === 'rejected' && plan.rejectComment && (
        <Banner appearance="danger" title="Rejected">{plan.rejectComment}</Banner>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            <Meta label="Type" value={plan.type === 'oneoff' ? 'One-off' : plan.type === 'recurring' ? 'Recurring' : 'Date range'} />
            <Meta label="Period" value={periodLabel(plan.period)} />
            <Meta label="Reason" value={REASON_LABEL[plan.reason]} />
            <Meta label="Cost centre" value={costCentre?.name} />
            <Meta label="Planned hours" value={fmtH(plannedHours(recs))} />
            <Meta label="Est. cost" value={money(estCost(recs, policy))} />
            {plan.submittedBy && <Meta label="Submitted by" value={plan.submittedBy} />}
            {plan.approvalStep && <Meta label="Approval cycle" value={plan.approvalStep} />}
            {plan.note && <Meta label="Note" value={plan.note} />}
          </dl>
        </Card>
        {budget && (
          <Card className="p-4 space-y-2">
            <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark">Budget · {costCentre?.name}</div>
            <BudgetMeter budget={budget.amount} committed={budget.committed} />
          </Card>
        )}
      </div>

      <div>
        <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark mb-2">
          Records ({recs.length})
        </div>
        <Table columns={columns} data={recs} getRowKey={(r) => r.id} />
      </div>
    </div>
  );
};
