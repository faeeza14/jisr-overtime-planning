// Step 3 — per-employee × per-day hours matrix (brief §7.2).
// Rest-day columns tinted + 2× label; normal 1.5×. Live per-row + grand-total cost.
// Quick-fill; per-row Paid/TOIL; over-cap amber flag.

import { useMemo, useState } from 'react';
import { NumberInput, SegmentedControl, Button, Avatar, Banner } from '@jisr-hr/ds-web';
import type { Employee, OTPolicy, OTType } from '../../types';
import { dayTypeForDate } from '../../lib/records';
import { cost, multiplierFor } from '../../lib/cost';
import { DAY_NAMES, isWeekend, parseIsoLocal } from '../../lib/weekly';
import { fmtH, money } from '../../lib/format';

export interface MatrixRow {
  otType: OTType;
  hours: Record<string, number>; // keyed by ISO date
}
export type MatrixValue = Record<string, MatrixRow>; // keyed by employeeId

const dayLabel = (iso: string) => {
  const d = parseIsoLocal(iso);
  return { dow: DAY_NAMES[d.getDay()], day: d.getDate(), rest: isWeekend(d) };
};

export const HoursMatrix = ({
  employees,
  dates,
  policy,
  value,
  onChange,
}: {
  employees: Employee[];
  dates: string[];
  policy: OTPolicy;
  value: MatrixValue;
  onChange: (next: MatrixValue) => void;
}) => {
  const [fill, setFill] = useState(3);

  const rowOf = (empId: string): MatrixRow => value[empId] ?? { otType: 'paid', hours: {} };

  const setHours = (empId: string, date: string, h: number) => {
    const row = rowOf(empId);
    onChange({ ...value, [empId]: { ...row, hours: { ...row.hours, [date]: h } } });
  };
  const setType = (empId: string, otType: OTType) =>
    onChange({ ...value, [empId]: { ...rowOf(empId), otType } });

  const quickFill = (scope: 'all' | 'weekday' | 'rest') => {
    const next: MatrixValue = { ...value };
    for (const emp of employees) {
      const row = rowOf(emp.id);
      const hours = { ...row.hours };
      for (const date of dates) {
        const rest = isWeekend(parseIsoLocal(date));
        if (scope === 'all' || (scope === 'weekday' && !rest) || (scope === 'rest' && rest)) {
          hours[date] = fill;
        }
      }
      next[emp.id] = { ...row, hours };
    }
    onChange(next);
  };

  const rowCost = (emp: Employee): number => {
    const row = rowOf(emp.id);
    return dates.reduce((sum, date) => {
      const h = row.hours[date] ?? 0;
      return sum + cost(h, emp.baseRate, dayTypeForDate(date), policy);
    }, 0);
  };
  const rowHours = (emp: Employee): number =>
    dates.reduce((sum, date) => sum + (rowOf(emp.id).hours[date] ?? 0), 0);

  const grandTotal = useMemo(
    () => employees.reduce((sum, e) => sum + rowCost(e), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, value, dates],
  );

  return (
    <div className="space-y-3">
      {/* Quick-fill */}
      <div className="flex flex-wrap items-center gap-2 text-13">
        <span className="text-app-mute">Quick-fill</span>
        <NumberInput value={fill} onChange={setFill} min={0} step={0.5} size="sm" endAddon="h" className="w-28" />
        <Button variant="secondary" size="sm" onClick={() => quickFill('all')}>Whole period</Button>
        <Button variant="secondary" size="sm" onClick={() => quickFill('weekday')}>Weekdays</Button>
        <Button variant="secondary" size="sm" onClick={() => quickFill('rest')}>Rest days</Button>
        <span className="text-11 text-app-faint">applies to everyone</span>
      </div>

      <div className="overflow-x-auto rounded-card hairline">
        <table className="w-full text-13 border-collapse">
          <thead>
            <tr className="border-b border-app-line dark:border-app-line-dark">
              <th className="text-left font-medium text-app-faint text-11 uppercase tracking-wide px-3 py-2 sticky left-0 bg-app-card dark:bg-app-card-dark">
                Employee
              </th>
              {dates.map((iso) => {
                const { dow, day, rest } = dayLabel(iso);
                return (
                  <th
                    key={iso}
                    className={[
                      'px-2 py-2 text-center min-w-[76px]',
                      rest ? 'bg-app-surface dark:bg-app-subtle-dark' : '',
                    ].join(' ')}
                  >
                    <div className="text-11 text-app-faint">{dow} {day}</div>
                    <div className={['text-[10px] font-medium', rest ? 'text-accent-ink' : 'text-app-mute'].join(' ')}>
                      {rest ? '2×' : '1.5×'}
                    </div>
                  </th>
                );
              })}
              <th className="px-2 py-2 text-center text-11 uppercase tracking-wide text-app-faint">Type</th>
              <th className="px-3 py-2 text-right text-11 uppercase tracking-wide text-app-faint">Row cost</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const row = rowOf(emp.id);
              const overCap = rowHours(emp) > policy.weeklyCapSoft;
              return (
                <tr key={emp.id} className="border-b border-app-line dark:border-app-line-dark last:border-b-0">
                  <td className="px-3 py-2 sticky left-0 bg-app-card dark:bg-app-card-dark">
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <Avatar size="s" name={emp.name} />
                      <div className="min-w-0">
                        <div className="font-medium truncate text-app-ink dark:text-app-ink-dark">{emp.name}</div>
                        <div className="text-11 text-app-faint">{money(emp.baseRate)}/h</div>
                      </div>
                    </div>
                  </td>
                  {dates.map((iso) => {
                    const rest = isWeekend(parseIsoLocal(iso));
                    return (
                      <td key={iso} className={['px-1.5 py-1.5 text-center', rest ? 'bg-app-surface/50 dark:bg-app-subtle-dark/40' : ''].join(' ')}>
                        <NumberInput
                          value={row.hours[iso] ?? 0}
                          onChange={(h) => setHours(emp.id, iso, h)}
                          min={0}
                          step={0.5}
                          size="sm"
                          showStepControls={false}
                          className="w-14"
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    <SegmentedControl<OTType>
                      value={row.otType}
                      onChange={(t) => setType(emp.id, t)}
                      options={[
                        { value: 'paid', label: 'Paid' },
                        { value: 'toil', label: 'TOIL' },
                      ]}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    <div className="font-medium text-app-ink dark:text-app-ink-dark tabular-nums">{money(rowCost(emp))}</div>
                    <div className="text-11 text-app-faint">
                      {fmtH(rowHours(emp))}
                      {overCap && <span className="text-warn-ink"> · over cap</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {employees.some((e) => rowHours(e) > policy.weeklyCapSoft) && (
        <Banner appearance="warning" emphasis="mid">
          One or more employees exceed the {policy.weeklyCapSoft}h weekly soft cap. This is a warning, not a blocker.
        </Banner>
      )}

      <div className="flex items-center justify-between px-1">
        <div className="text-11 text-app-faint">
          Rest days priced at {multiplierFor('rest', policy)}× · weekdays {multiplierFor('normal', policy)}× (from OT policy)
        </div>
        <div className="text-13">
          Grand total{' '}
          <span className="text-[18px] font-semibold text-app-ink dark:text-app-ink-dark">{money(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
};
