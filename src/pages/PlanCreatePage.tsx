import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
  SegmentedControl,
  SmartBreadcrumb,
  Banner,
  Badge,
  useToast,
} from '@jisr-hr/ds-web';
import { ArrowLeft } from 'lucide-react';
import { useOTStore } from '../store';
import { Stepper } from '../components/plan/Stepper';
import { StickyActionBar } from '../components/plan/StickyActionBar';
import { EmployeePicker } from '../components/plan/EmployeePicker';
import { HoursMatrix, type MatrixValue } from '../components/plan/HoursMatrix';
import { BudgetMeter } from '../components/plan/BudgetMeter';
import { buildRecords, datesForPeriod, type EmployeeHoursEntry } from '../lib/records';
import { cost } from '../lib/cost';
import { dayTypeForDate } from '../lib/records';
import { REASON_LABEL, fmtH, money, periodLabel } from '../lib/format';
import { TODAY_ISO } from '../data/seed';
import { addDays, isoDay, parseIsoLocal } from '../lib/weekly';
import type { PlanPeriod, PlanReason, PlanType } from '../types';

const STEPS = ['Details', 'Employees', 'Hours & cost', 'Review'];
const REASONS: PlanReason[] = ['peak_demand', 'coverage_gap', 'project_deadline', 'emergency', 'other'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PlanCreatePage = () => {
  const { employees, groups, costCentres, policy, records, createDraftPlan, setPlanRecords, submitForApproval } =
    useOTStore();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);

  // Step 1 — details
  const [name, setName] = useState('');
  const [reason, setReason] = useState<PlanReason>('peak_demand');
  const [type, setType] = useState<PlanType>('range');
  const [costCentreId, setCostCentreId] = useState(costCentres[0].id);
  const [note, setNote] = useState('');
  const [rangeStart, setRangeStart] = useState(TODAY_ISO);
  const [rangeEnd, setRangeEnd] = useState(isoDay(addDays(parseIsoLocal(TODAY_ISO), 4)));
  const [oneoffDate, setOneoffDate] = useState(TODAY_ISO);
  const [recStart, setRecStart] = useState(TODAY_ISO);
  const [recUntil, setRecUntil] = useState(isoDay(addDays(parseIsoLocal(TODAY_ISO), 21)));
  const [recWeekdays, setRecWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);

  // Step 2 — employees
  const [selected, setSelected] = useState<string[]>([]);
  // Step 3 — hours
  const [matrix, setMatrix] = useState<MatrixValue>({});

  const period: PlanPeriod = useMemo(() => {
    if (type === 'oneoff') return { kind: 'oneoff', date: oneoffDate };
    if (type === 'recurring')
      return { kind: 'recurring', start: recStart, until: recUntil, weekdays: recWeekdays };
    return { kind: 'range', start: rangeStart, end: rangeEnd };
  }, [type, oneoffDate, recStart, recUntil, recWeekdays, rangeStart, rangeEnd]);

  const dates = useMemo(() => datesForPeriod(period), [period]);
  const selectedEmployees = useMemo(
    () => employees.filter((e) => selected.includes(e.id)),
    [employees, selected],
  );

  // employees already committed elsewhere → conflict flag
  const conflicts = useMemo(() => {
    const set = new Set<string>();
    for (const r of Object.values(records)) {
      if (['pending', 'approved', 'reconciling'].includes(r.status)) set.add(r.employeeId);
    }
    return set;
  }, [records]);

  const entries: EmployeeHoursEntry[] = useMemo(
    () =>
      selected.map((id) => ({
        employeeId: id,
        otType: matrix[id]?.otType ?? 'paid',
        hoursByDate: Object.fromEntries(
          dates.map((d) => [d, matrix[id]?.hours[d] ?? 0]).filter(([, h]) => (h as number) > 0),
        ),
      })),
    [selected, matrix, dates],
  );

  const totalPlannedHours = entries.reduce(
    (sum, e) => sum + Object.values(e.hoursByDate).reduce((a, b) => a + b, 0),
    0,
  );
  const estCost = useMemo(
    () =>
      entries.reduce((sum, e) => {
        const emp = employees.find((x) => x.id === e.employeeId)!;
        return (
          sum +
          Object.entries(e.hoursByDate).reduce(
            (a, [d, h]) => a + cost(h, emp.baseRate, dayTypeForDate(d), policy),
            0,
          )
        );
      }, 0),
    [entries, employees, policy],
  );

  const paidCount = entries.filter((e) => e.otType === 'paid').length;
  const toilCount = entries.length - paidCount;

  const budget = policy.budgets.find((b) => b.costCentreId === costCentreId);
  const budgetTotal = budget?.amount ?? 0;
  const committed = budget?.committed ?? 0;

  // validation per step
  const periodValid =
    type === 'oneoff'
      ? !!oneoffDate
      : type === 'recurring'
        ? recWeekdays.length > 0 && recStart <= recUntil
        : rangeStart <= rangeEnd;
  const stepValid = [
    name.trim().length > 0 && periodValid,
    selected.length > 0,
    totalPlannedHours > 0,
    true,
  ][step];

  const buildAndCreate = (submit: boolean) => {
    const planId = createDraftPlan({ name: name.trim(), reason, type, period, costCentreId, note: note.trim() || undefined });
    const recs = buildRecords(planId, entries, employees);
    setPlanRecords(planId, recs);
    if (submit) {
      submitForApproval(planId);
      toast.success('Submitted for approval', `${name.trim()} · ${fmtH(totalPlannedHours)} across ${entries.length} people`);
    } else {
      toast.info('Saved as draft', name.trim());
    }
    navigate('/shifts/plan-overtime');
  };

  const dateInput = 'field-input h-9';

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-app-line dark:border-app-line-dark">
        <div className="flex items-center gap-2 mb-2">
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
              { label: name.trim() || 'New plan' },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-[18px] font-semibold text-app-ink dark:text-app-ink-dark">
            {name.trim() || 'New overtime plan'}
          </h1>
          <Stepper steps={STEPS} current={step} onStepClick={(i) => i <= step && setStep(i)} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 sm:p-6 max-w-4xl w-full mx-auto">
        {step === 0 && (
          <div className="space-y-5">
            <Field label="Plan name" required>
              <Input placeholder="e.g. Warehouse peak · Q3" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <div>
              <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark mb-2">Plan type</div>
              <SegmentedControl<PlanType>
                value={type}
                onChange={setType}
                options={[
                  { value: 'range', label: 'Date range', description: 'Start → end date' },
                  { value: 'oneoff', label: 'One-off', description: 'A single date' },
                  { value: 'recurring', label: 'Recurring', description: 'Weekdays until a date' },
                ]}
              />
            </div>

            {/* Period picker reshapes by type */}
            {type === 'range' && (
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <Field label="Start date">
                  <input type="date" className={dateInput} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                </Field>
                <Field label="End date">
                  <input type="date" className={dateInput} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                </Field>
              </div>
            )}
            {type === 'oneoff' && (
              <Field label="Date" className="max-w-xs">
                <input type="date" className={dateInput} value={oneoffDate} onChange={(e) => setOneoffDate(e.target.value)} />
              </Field>
            )}
            {type === 'recurring' && (
              <div className="space-y-3">
                <div>
                  <div className="text-13 font-medium mb-1.5">Weekdays</div>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((w, i) => {
                      const on = recWeekdays.includes(i);
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() =>
                            setRecWeekdays((prev) => (on ? prev.filter((d) => d !== i) : [...prev, i].sort()))
                          }
                          className={[
                            'px-2.5 py-1 rounded-lg text-13 border transition',
                            on
                              ? 'bg-app-ink text-white border-app-ink dark:bg-app-ink-dark dark:text-app-bg'
                              : 'bg-white dark:bg-app-card-dark border-app-line text-app-mute hover:text-app-ink',
                          ].join(' ')}
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <Field label="From">
                    <input type="date" className={dateInput} value={recStart} onChange={(e) => setRecStart(e.target.value)} />
                  </Field>
                  <Field label="Until">
                    <input type="date" className={dateInput} value={recUntil} onChange={(e) => setRecUntil(e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {periodValid && (
              <Banner appearance="info" emphasis="mid">
                {dates.length} date{dates.length === 1 ? '' : 's'} in this plan — a record is generated per
                employee per date.
              </Banner>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Reason">
                <div className="flex flex-wrap gap-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={[
                        'px-2.5 py-1.5 rounded-lg text-13 border transition',
                        reason === r
                          ? 'bg-app-ink text-white border-app-ink dark:bg-app-ink-dark dark:text-app-bg'
                          : 'bg-white dark:bg-app-card-dark border-app-line text-app-mute hover:text-app-ink',
                      ].join(' ')}
                    >
                      {REASON_LABEL[r]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Cost centre / budget">
                <select
                  className={dateInput}
                  value={costCentreId}
                  onChange={(e) => setCostCentreId(e.target.value)}
                >
                  {costCentres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Note for approver" description="Optional">
              <Textarea rows={2} placeholder="Context to help Finance / Top management decide" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <EmployeePicker
            employees={employees}
            groups={groups}
            selected={selected}
            onChange={setSelected}
            conflicts={conflicts}
          />
        )}

        {step === 2 && (
          <HoursMatrix employees={selectedEmployees} dates={dates} policy={policy} value={matrix} onChange={setMatrix} />
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2 space-y-3">
              <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark">Plan summary</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-13">
                <Meta label="Name" value={name.trim()} />
                <Meta label="Type" value={type === 'oneoff' ? 'One-off' : type === 'recurring' ? 'Recurring' : 'Date range'} />
                <Meta label="Period" value={periodLabel(period)} />
                <Meta label="Reason" value={REASON_LABEL[reason]} />
                <Meta label="Employees" value={`${entries.length}`} />
                <Meta label="Records" value={`${entries.reduce((n, e) => n + Object.keys(e.hoursByDate).length, 0)}`} />
                <Meta label="Planned hours" value={fmtH(totalPlannedHours)} />
                <Meta
                  label="Paid / TOIL"
                  value={
                    <span className="inline-flex gap-1.5">
                      <Badge appearance="info" size="small">{paidCount} paid</Badge>
                      {toilCount > 0 && <Badge appearance="neutral" size="small">{toilCount} TOIL</Badge>}
                    </span>
                  }
                />
              </dl>
              <div className="pt-2 border-t border-app-line dark:border-app-line-dark flex items-center justify-between">
                <span className="text-13 text-app-mute">Estimated cost</span>
                <span className="text-[20px] font-semibold text-app-ink dark:text-app-ink-dark">{money(estCost)}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark">Budget impact</div>
              <BudgetMeter budget={budgetTotal} committed={committed} thisPlan={estCost} />
              {committed + estCost > budgetTotal && (
                <Banner appearance="danger" emphasis="mid">This plan exceeds the remaining budget.</Banner>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Sticky bar */}
      <StickyActionBar
        left={
          step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Back</Button>
          ) : null
        }
        right={
          <>
            <Button variant="tertiary" onClick={() => buildAndCreate(false)} disabled={!name.trim()}>
              Save as draft
            </Button>
            {step < 3 ? (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!stepValid}>
                Next
              </Button>
            ) : (
              <Button variant="primary" onClick={() => buildAndCreate(true)} disabled={totalPlannedHours <= 0}>
                Submit for approval
              </Button>
            )}
          </>
        }
      />
    </div>
  );
};

const Meta = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-11 text-app-faint">{label}</dt>
    <dd className="text-app-ink dark:text-app-ink-dark">{value || '—'}</dd>
  </div>
);
