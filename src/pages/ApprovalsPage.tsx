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
  Textarea,
  Field,
  Empty,
  useToast,
} from '@jisr-hr/ds-web';
import { Clock, CalendarDays, Inbox } from 'lucide-react';
import { useOTStore } from '../store';
import { plansByStatus, recordsForPlan, plannedHours, estCost, distinctEmployees } from '../store/selectors';
import { HoursMatrix, type MatrixValue } from '../components/plan/HoursMatrix';
import { BudgetMeter } from '../components/plan/BudgetMeter';
import { recordsToMatrix, distinctDates, matrixToEdits } from '../lib/matrix';
import { REASON_LABEL, fmtH, money, periodLabel } from '../lib/format';
import type { OvertimePlan } from '../types';

export const ApprovalsPage = () => {
  const { plans, records, employees, policy, approvePlan, rejectPlan } = useOTStore();
  const toast = useToast();

  const pending = useMemo(() => plansByStatus(plans, 'pending'), [plans]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MatrixValue>({});
  const [comment, setComment] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const active = activeId ? plans[activeId] : undefined;
  const activeRecs = active ? recordsForPlan(records, active) : [];
  const dates = useMemo(() => distinctDates(activeRecs), [activeRecs]);
  const activeEmployees = useMemo(
    () => employees.filter((e) => distinctEmployees(activeRecs).includes(e.id)),
    [employees, activeRecs],
  );
  const budget = active ? policy.budgets.find((b) => b.costCentreId === active.costCentreId) : undefined;

  const open = (plan: OvertimePlan) => {
    setActiveId(plan.id);
    setMatrix(recordsToMatrix(recordsForPlan(records, plan)));
    setComment('');
    setRejecting(false);
  };
  const close = () => setActiveId(null);

  const doApprove = () => {
    if (!active) return;
    const edits = matrixToEdits(activeRecs, matrix);
    approvePlan(active.id, edits);
    toast.success('Approved', edits.length ? `${active.name} · ${edits.length} edit(s) applied` : active.name);
    close();
  };
  const doReject = () => {
    if (!active) return;
    if (!comment.trim()) {
      setRejecting(true);
      return;
    }
    rejectPlan(active.id, comment.trim());
    toast.warning('Rejected', active.name);
    close();
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="text-13 text-app-mute">
        Pending items — overtime plans and shift schedules, each on its own approval cycle.
      </div>

      {pending.length === 0 && (
        <div className="flex justify-center py-10">
          <Empty media={<Inbox className="size-8" />} title="Nothing to approve" description="Submitted OT plans will appear here." />
        </div>
      )}

      <div className="space-y-2">
        {pending.map((plan) => {
          const recs = recordsForPlan(records, plan);
          return (
            <Card key={plan.id} className="p-3 flex items-center gap-3">
              <span className="size-9 rounded-lg bg-accent-bg text-accent-ink flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-app-ink dark:text-app-ink-dark truncate">{plan.name}</div>
                <div className="text-11 text-app-faint truncate">
                  OT plan · {plan.submittedBy} · {periodLabel(plan.period)} · {distinctEmployees(recs).length} people ·{' '}
                  {fmtH(plannedHours(recs))} · {money(estCost(recs, policy))}
                </div>
              </div>
              <Badge appearance="warning" size="small">{plan.approvalStep}</Badge>
              <Button variant="primary" size="sm" onClick={() => open(plan)}>Review</Button>
            </Card>
          );
        })}

        {/* Illustrative shift-schedule item — separate cycle from OT (brief §8) */}
        <Card className="p-3 flex items-center gap-3 opacity-90">
          <span className="size-9 rounded-lg bg-app-subtle text-app-mute flex items-center justify-center shrink-0">
            <CalendarDays className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-app-ink dark:text-app-ink-dark truncate">Week of Jul 19 · Dispatch roster</div>
            <div className="text-11 text-app-faint truncate">Shift schedule · Operations manager · 6 employees · 12 shifts</div>
          </div>
          <Badge appearance="neutral" size="small">Operations manager</Badge>
          <Button variant="secondary" size="sm" disabled>Review</Button>
        </Card>
      </div>

      {/* OT review drawer */}
      <Drawer open={!!active} onOpenChange={(o) => !o && close()}>
        {active && (
          <>
            <DrawerHeader onClose={close}>
              <DrawerTitle>Review · {active.name}</DrawerTitle>
            </DrawerHeader>
            <DrawerBody className="!w-full">
              <Banner appearance="info" emphasis="mid" title="Approve against budget · edit in place">
                Adjust hours directly here. There is no send-back — approve with your edits, or reject with a comment.
              </Banner>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-13">
                <div><span className="text-11 text-app-faint block">Submitted by</span>{active.submittedBy}</div>
                <div><span className="text-11 text-app-faint block">Cycle</span>{active.approvalStep}</div>
                <div><span className="text-11 text-app-faint block">Reason</span>{REASON_LABEL[active.reason]}</div>
                <div><span className="text-11 text-app-faint block">Period</span>{periodLabel(active.period)}</div>
              </div>
              {active.note && (
                <div className="text-13 bg-app-surface dark:bg-app-subtle-dark rounded-lg p-2.5 text-app-mute">
                  “{active.note}”
                </div>
              )}

              {budget && (
                <Card className="p-3 space-y-2">
                  <div className="text-13 font-medium">Budget check</div>
                  <BudgetMeter budget={budget.amount} committed={budget.committed} thisPlan={estCost(activeRecs, policy)} />
                </Card>
              )}

              <div>
                <div className="text-13 font-medium mb-2">Hours (editable)</div>
                <HoursMatrix employees={activeEmployees} dates={dates} policy={policy} value={matrix} onChange={setMatrix} />
              </div>

              <Field
                label="Comment"
                description="Required to reject"
                error={rejecting && !comment.trim() ? 'Add a comment to reject.' : undefined}
              >
                <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional for approval, required for rejection" />
              </Field>
            </DrawerBody>
            <DrawerFooter>
              <Button variant="secondary" appearance="danger" onClick={doReject}>Reject</Button>
              <Button variant="primary" onClick={doApprove}>Approve with edits</Button>
            </DrawerFooter>
          </>
        )}
      </Drawer>
    </div>
  );
};
