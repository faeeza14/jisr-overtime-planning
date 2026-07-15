// Weekly roster grid — the OT reflection surface (brief §6).
// Employees × 7 days; each OvertimeRecord renders as a status-coloured OTChip on its day.

import { useMemo } from 'react';
import { Avatar } from '@jisr-hr/ds-web';
import { Clock } from 'lucide-react';
import type { Employee, OvertimeRecord, Shift } from '../../types';
import {
  DAY_NAMES_FULL,
  eachDayInWeek,
  isWeekend,
  isoDay,
} from '../../lib/weekly';
import { fmtH } from '../../lib/format';
import { OTChip } from '../status/OTChip';

const SHIFT_TINT: Record<Shift['color'], string> = {
  lavender: 'bg-shift-lavender',
  peach: 'bg-shift-peach',
  pink: 'bg-shift-pink',
};

/** Deterministic "home shift" per employee — presentational roster only (not stored). */
const homeShift = (index: number, shifts: Shift[]): Shift =>
  shifts[index % shifts.length] ?? shifts[0];

export const SchedulerGrid = ({
  weekStart,
  employees,
  shifts,
  recordsByCell,
  onChipClick,
}: {
  weekStart: Date;
  employees: Employee[];
  shifts: Shift[];
  recordsByCell: Map<string, OvertimeRecord[]>;
  onChipClick: (record: OvertimeRecord) => void;
}) => {
  const days = useMemo(() => eachDayInWeek(weekStart), [weekStart]);

  return (
    <div className="overflow-x-auto rounded-card hairline bg-app-card dark:bg-app-card-dark">
      <div className="min-w-[900px]">
        {/* Header row */}
        <div
          className="grid border-b border-app-line dark:border-app-line-dark"
          style={{ gridTemplateColumns: '220px repeat(7, minmax(110px, 1fr))' }}
        >
          <div className="px-3 py-2.5 text-11 uppercase tracking-wide text-app-faint">
            Employees ({employees.length})
          </div>
          {days.map((d) => {
            const rest = isWeekend(d);
            return (
              <div
                key={isoDay(d)}
                className={[
                  'px-2 py-2.5 text-center border-l border-app-line dark:border-app-line-dark',
                  rest ? 'bg-app-surface dark:bg-app-subtle-dark' : '',
                ].join(' ')}
              >
                <div className="text-11 text-app-faint">{DAY_NAMES_FULL[d.getDay()]}</div>
                <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark">
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Employee rows */}
        {employees.map((emp, i) => {
          const shift = homeShift(i, shifts);
          const weekHours = days.reduce((sum, d) => {
            const recs = recordsByCell.get(`${emp.id}|${isoDay(d)}`) ?? [];
            return sum + recs.reduce((h, r) => h + r.plannedHours, 0);
          }, 0);

          return (
            <div
              key={emp.id}
              className="grid border-b border-app-line dark:border-app-line-dark last:border-b-0"
              style={{ gridTemplateColumns: '220px repeat(7, minmax(110px, 1fr))' }}
            >
              {/* Employee cell */}
              <div className="px-3 py-2.5 flex items-center gap-2 min-w-0">
                <Avatar size="m" name={emp.name} />
                <div className="min-w-0">
                  <div className="text-13 font-medium truncate text-app-ink dark:text-app-ink-dark">
                    {emp.name}
                  </div>
                  <div className="text-11 text-app-faint truncate">
                    {emp.role} · #{emp.roleNumber}
                  </div>
                  {weekHours > 0 && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-11 text-accent-ink dark:text-accent-ink-dark">
                      <Clock className="size-3" /> {fmtH(weekHours)} OT
                    </div>
                  )}
                </div>
              </div>

              {/* Day cells */}
              {days.map((d) => {
                const iso = isoDay(d);
                const rest = isWeekend(d);
                const recs = recordsByCell.get(`${emp.id}|${iso}`) ?? [];
                return (
                  <div
                    key={iso}
                    className={[
                      'px-1.5 py-1.5 border-l border-app-line dark:border-app-line-dark space-y-1 align-top',
                      rest ? 'bg-app-surface/60 dark:bg-app-subtle-dark/40' : '',
                    ].join(' ')}
                  >
                    {rest && recs.length === 0 ? (
                      <div className="text-[10px] text-app-faint text-center py-1.5">Day Off</div>
                    ) : (
                      <div
                        className={[
                          'rounded-md px-1.5 py-1 text-[10px] leading-tight text-app-ink/80',
                          SHIFT_TINT[shift.color],
                        ].join(' ')}
                      >
                        <div className="font-medium truncate">
                          {shift.start}–{shift.end}
                        </div>
                        <div className="truncate text-app-ink/55">{shift.location}</div>
                      </div>
                    )}
                    {recs.map((r) => (
                      <OTChip key={r.id} record={r} onClick={() => onChipClick(r)} />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
