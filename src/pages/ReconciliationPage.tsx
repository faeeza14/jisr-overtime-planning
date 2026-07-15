import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  Banner,
  Badge,
  NumberInput,
  Avatar,
  SegmentedControl,
  Empty,
  useToast,
} from '@jisr-hr/ds-web';
import { CheckCheck } from 'lucide-react';
import { useOTStore } from '../store';
import { recordsForPlan, excessRecords, distinctEmployees } from '../store/selectors';
import { reconcileRecord, reconcilePlan } from '../lib/reconcile';
import { parseIsoLocal } from '../lib/weekly';
import { TODAY_ISO } from '../data/seed';
import { fmtDayShort, fmtH, money } from '../lib/format';
import type { OvertimePlan, OvertimeRecord, RecordOutcome } from '../types';

type Seg = 'ready' | 'excess' | 'settled';

const OUTCOME_BADGE: Record<RecordOutcome, { appearance: 'success' | 'warning' | 'danger'; label: string }> = {
  match: { appearance: 'success', label: 'Match' },
  short: { appearance: 'warning', label: 'Short · pay actual' },
  excess: { appearance: 'danger', label: 'Excess · capped' },
};

const periodStarted = (plan: OvertimePlan): boolean => {
  const p = plan.period;
  const start = p.kind === 'oneoff' ? p.date : p.start;
  return parseIsoLocal(start) <= parseIsoLocal(TODAY_ISO);
};

export const ReconciliationPage = () => {
  const { plans, records, employees, policy, startReconciling, settlePeriod, setActualHours, resolveExcess } =
    useOTStore();
  const toast = useToast();
  const [seg, setSeg] = useState<Seg>('ready');
  const [activeId, setActiveId] = useState<string | null>(null);

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? '?';

  const readyPlans = useMemo(
    () =>
      Object.values(plans).filter(
        (p) => p.status === 'reconciling' || (p.status === 'approved' && periodStarted(p)),
      ),
    [plans],
  );
  const settledPlans = useMemo(() => Object.values(plans).filter((p) => p.status === 'settled'), [plans]);
  const excess = useMemo(() => excessRecords(records), [records]);

  const active = activeId ? plans[activeId] : undefined;
  const activeRecs = active ? recordsForPlan(records, active) : [];
  const rollup = active ? reconcilePlan(activeRecs, policy).rollup : null;

  const openReconcile = (plan: OvertimePlan) => {
    if (plan.status === 'approved') startReconciling(plan.id);
    setActiveId(plan.id);
  };
  const doSettle = () => {
    if (!active) return;
    settlePeriod(active.id);
    toast.success('Period settled', `${active.name} · ${money(rollup?.payrollAmount ?? 0)} to payroll`);
    setActiveId(null);
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <SegmentedControl<Seg>
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'ready', label: `Ready to reconcile (${readyPlans.length})` },
          { value: 'excess', label: `Excess approvals (${excess.length})` },
          { value: 'settled', label: `Settled (${settledPlans.length})` },
        ]}
      />

      {/* Ready */}
      {seg === 'ready' &&
        (readyPlans.length === 0 ? (
          <EmptyState title="Nothing to reconcile" description="Approved periods appear here once their attendance is in." />
        ) : (
          <div className="space-y-2">
            {readyPlans.map((plan) => {
              const recs = recordsForPlan(records, plan);
              const { rollup: r } = reconcilePlan(recs, policy);
              const hasExcess = r.excessHeld > 0;
              return (
                <Card key={plan.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-app-ink dark:text-app-ink-dark truncate">{plan.name}</div>
                    <div className="text-11 text-app-faint">
                      {distinctEmployees(recs).length} people · Approved {fmtH(r.approved)} · Actual {fmtH(r.actual)}
                    </div>
                  </div>
                  {hasExcess && <Badge appearance="danger" size="small">Excess {fmtH(r.excessHeld)}</Badge>}
                  {plan.status === 'approved' && <Badge appearance="info" size="small">Attendance pending</Badge>}
                  <Button variant="primary" size="sm" onClick={() => openReconcile(plan)}>Reconcile</Button>
                </Card>
              );
            })}
          </div>
        ))}

      {/* Excess approvals — the retained individual-request path */}
      {seg === 'excess' &&
        (excess.length === 0 ? (
          <EmptyState title="No excess to review" description="Hours worked above approved are peeled into this lane." />
        ) : (
          <div className="space-y-2">
            <Banner appearance="info" emphasis="mid">
              Employees worked more than their approved OT. Approve the extra to add it to payroll, or reject to cap at approved.
            </Banner>
            {excess.map((r) => {
              const line = reconcileRecord(r);
              return (
                <Card key={r.id} className="p-3 flex items-center gap-3">
                  <Avatar size="m" name={empName(r.employeeId)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-app-ink dark:text-app-ink-dark truncate">{empName(r.employeeId)}</div>
                    <div className="text-11 text-app-faint">
                      {fmtDayShort(r.date)} · Approved {fmtH(r.plannedHours)} · Actual {fmtH(r.actualHours ?? 0)} ·{' '}
                      <span className="text-danger-ink">Extra {fmtH(line.excessHeld)}</span>
                    </div>
                  </div>
                  <Button variant="secondary" appearance="danger" size="sm" onClick={() => { resolveExcess(r.id, 'reject'); toast.warning('Excess rejected', `${empName(r.employeeId)} · capped at approved`); }}>
                    Reject
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => { resolveExcess(r.id, 'approve'); toast.success('Extra approved', `${empName(r.employeeId)} · +${fmtH(line.excessHeld)} to payroll`); }}>
                    Approve extra
                  </Button>
                </Card>
              );
            })}
          </div>
        ))}

      {/* Settled */}
      {seg === 'settled' &&
        (settledPlans.length === 0 ? (
          <EmptyState title="Nothing settled yet" description="Settled periods lock and push payable amounts to payroll." />
        ) : (
          <div className="space-y-2">
            {settledPlans.map((plan) => {
              const recs = recordsForPlan(records, plan);
              const payable = recs.reduce((s, r) => s + (r.payableHours ?? 0), 0);
              const { rollup: r } = reconcilePlan(recs, policy);
              return (
                <Card key={plan.id} className="p-3 flex items-center gap-3">
                  <span className="size-9 rounded-lg bg-ok-bg text-ok-ink flex items-center justify-center shrink-0">
                    <CheckCheck className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-app-ink dark:text-app-ink-dark truncate">{plan.name}</div>
                    <div className="text-11 text-app-faint">
                      Payable {fmtH(payable)} · {money(r.payrollAmount)} to payroll · locked
                    </div>
                  </div>
                  <Badge appearance="success" size="small">Settled</Badge>
                </Card>
              );
            })}
          </div>
        ))}

      {/* Reconcile drawer */}
      <Drawer open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        {active && rollup && (
          <>
            <DrawerHeader onClose={() => setActiveId(null)}>
              <DrawerTitle>Reconcile · {active.name}</DrawerTitle>
            </DrawerHeader>
            <DrawerBody>
              <Banner appearance="info" emphasis="mid">
                Edit actual hours from attendance. Payable caps at approved; shortfalls pay the actual.
              </Banner>
              <div className="rounded-card hairline overflow-hidden">
                <table className="w-full text-13">
                  <thead>
                    <tr className="border-b border-app-line dark:border-app-line-dark text-11 uppercase tracking-wide text-app-faint">
                      <th className="text-left px-2.5 py-2">Employee · day</th>
                      <th className="text-right px-2 py-2">Appr.</th>
                      <th className="text-center px-2 py-2">Actual</th>
                      <th className="text-right px-2 py-2">Pay</th>
                      <th className="text-left px-2 py-2">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecs.map((r: OvertimeRecord) => {
                      const line = reconcileRecord(r);
                      const ob = OUTCOME_BADGE[line.outcome];
                      return (
                        <tr key={r.id} className="border-b border-app-line dark:border-app-line-dark last:border-b-0">
                          <td className="px-2.5 py-2">
                            <div className="font-medium truncate">{empName(r.employeeId)}</div>
                            <div className="text-11 text-app-faint">
                              {fmtDayShort(r.date)}{r.dayType === 'rest' ? ' · rest 2×' : ''}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtH(r.plannedHours)}</td>
                          <td className="px-2 py-2 text-center">
                            <NumberInput
                              value={r.actualHours ?? 0}
                              onChange={(h) => setActualHours(r.id, h)}
                              min={0}
                              step={0.5}
                              size="sm"
                              showStepControls={false}
                              className="w-14"
                            />
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums font-medium">{fmtH(line.payable)}</td>
                          <td className="px-2 py-2">
                            <Badge appearance={ob.appearance} size="small">{ob.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Card className="p-3">
                <div className="grid grid-cols-2 gap-y-1.5 text-13">
                  <span className="text-app-mute">Approved</span><span className="text-right tabular-nums">{fmtH(rollup.approved)}</span>
                  <span className="text-app-mute">Actual</span><span className="text-right tabular-nums">{fmtH(rollup.actual)}</span>
                  <span className="text-app-mute">Payable (capped)</span><span className="text-right tabular-nums font-medium">{fmtH(rollup.payable)}</span>
                  <span className="text-app-mute">Excess held</span><span className="text-right tabular-nums text-danger-ink">{fmtH(rollup.excessHeld)}</span>
                  <span className="text-app-ink dark:text-app-ink-dark font-medium pt-1 border-t border-app-line mt-1">Payroll amount</span>
                  <span className="text-right font-semibold pt-1 border-t border-app-line mt-1">{money(rollup.payrollAmount)}</span>
                </div>
              </Card>
              {rollup.excessHeld > 0 && (
                <Banner appearance="warning" emphasis="mid">
                  {fmtH(rollup.excessHeld)} of excess is held for the Excess approvals lane — settling pays only the capped amount.
                </Banner>
              )}
            </DrawerBody>
            <DrawerFooter>
              <Button variant="secondary" onClick={() => setActiveId(null)}>Cancel</Button>
              <Button variant="primary" onClick={doSettle}>Settle &amp; push to payroll</Button>
            </DrawerFooter>
          </>
        )}
      </Drawer>
    </div>
  );
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex justify-center py-10">
    <Empty title={title} description={description} />
  </div>
);
