// Plan → OvertimeRecord generation (brief §4.2). Pure; no React/store imports.
// Bulk selection resolves to a set of employees, then generates INDIVIDUAL records
// (one per employee × date) so each can be approved / reconciled / paid on its own.

import { nanoid } from 'nanoid';
import type {
  DayType,
  Employee,
  OTType,
  OvertimeRecord,
  PlanPeriod,
} from '../types';
import { addDays, isWeekend, isoDay, parseIsoLocal } from './weekly.ts';

/** Fri/Sat are rest days in the KSA convention → drives the rest multiplier. */
export const dayTypeForDate = (iso: string): DayType =>
  isWeekend(parseIsoLocal(iso)) ? 'rest' : 'normal';

/** Expand a plan period into the concrete list of dates it covers. */
export function datesForPeriod(period: PlanPeriod): string[] {
  if (period.kind === 'oneoff') return [period.date];

  if (period.kind === 'range') {
    const out: string[] = [];
    let d = parseIsoLocal(period.start);
    const end = parseIsoLocal(period.end);
    while (d <= end) {
      out.push(isoDay(d));
      d = addDays(d, 1);
    }
    return out;
  }

  // recurring — every matching weekday from start until `until` (eager materialisation)
  const out: string[] = [];
  let d = parseIsoLocal(period.start);
  const end = parseIsoLocal(period.until);
  while (d <= end) {
    if (period.weekdays.includes(d.getDay())) out.push(isoDay(d));
    d = addDays(d, 1);
  }
  return out;
}

/** Per-employee hours + type input from the HoursMatrix (Step 3 of the create flow). */
export interface EmployeeHoursEntry {
  employeeId: string;
  otType: OTType;
  /** hours keyed by ISO date; a missing/zero entry means no record generated for that day */
  hoursByDate: Record<string, number>;
  /** optional shift the OT rides on, per date */
  shiftByDate?: Record<string, string | null>;
}

export function buildRecords(
  planId: string,
  entries: EmployeeHoursEntry[],
  employees: Employee[],
): OvertimeRecord[] {
  const empById = new Map(employees.map((e) => [e.id, e]));
  const records: OvertimeRecord[] = [];

  for (const entry of entries) {
    const emp = empById.get(entry.employeeId);
    if (!emp) continue;
    for (const [date, hours] of Object.entries(entry.hoursByDate)) {
      if (!hours || hours <= 0) continue;
      records.push({
        id: `otr-${nanoid(8)}`,
        planId,
        employeeId: entry.employeeId,
        date,
        shiftId: entry.shiftByDate?.[date] ?? null,
        dayType: dayTypeForDate(date),
        otType: entry.otType,
        plannedHours: hours,
        actualHours: null,
        baseRate: emp.baseRate,
        status: 'draft',
        outcome: null,
        payableHours: null,
        excessResolution: null,
      });
    }
  }

  return records;
}
