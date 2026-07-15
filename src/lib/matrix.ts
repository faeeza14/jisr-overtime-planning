// Convert a plan's records into the HoursMatrix value shape and back to edits.
import type { OvertimeRecord } from '../types';
import type { MatrixValue } from '../components/plan/HoursMatrix';
import type { RecordEdit } from '../store';

export const distinctDates = (recs: OvertimeRecord[]): string[] =>
  Array.from(new Set(recs.map((r) => r.date))).sort();

export const recordsToMatrix = (recs: OvertimeRecord[]): MatrixValue => {
  const out: MatrixValue = {};
  for (const r of recs) {
    const row = out[r.employeeId] ?? { otType: r.otType, hours: {} };
    row.hours[r.date] = r.plannedHours;
    row.otType = r.otType;
    out[r.employeeId] = row;
  }
  return out;
};

/** Diff an edited matrix against the plan's records → planned-hours edits for approvePlan. */
export const matrixToEdits = (recs: OvertimeRecord[], matrix: MatrixValue): RecordEdit[] =>
  recs.flatMap((r) => {
    const h = matrix[r.employeeId]?.hours[r.date];
    return h != null && h !== r.plannedHours ? [{ recordId: r.id, plannedHours: h }] : [];
  });
