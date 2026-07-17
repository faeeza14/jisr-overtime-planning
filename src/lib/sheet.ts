// Attendance-sheet compilation (change set §B) — pure, unit-testable. No React/store imports.
// The "Approved overtime" columns are a live projection of the store: only APPROVED
// OvertimeRecords (planned lane) and APPROVED OvertimeRequests (unplanned lane) post.

import type {
  Employee,
  OvertimeRecord,
  OvertimeRequest,
  SheetMock,
  SheetRow,
} from '../types';

const emptyRow = (employeeId: string, mock?: SheetMock): SheetRow => ({
  employeeId,
  leaveDays: mock?.leaveDays ?? 0,
  scheduledDur: mock?.scheduledDur ?? 0,
  workedDur: mock?.workedDur ?? 0,
  diff: mock?.diff ?? 0,
  absence: mock?.absence ?? 0,
  otTotal: 0,
  otPaid: 0,
  otToil: 0,
  sources: [],
});

/**
 * Compile one sheet row per employee. Approved planned records + approved unplanned
 * requests increment Total / Paid / TOIL and record their provenance `source`.
 * Pending / rejected / draft do NOT post.
 */
export function compileSheet(
  employees: Employee[],
  records: OvertimeRecord[],
  requests: OvertimeRequest[],
  mock: SheetMock[],
): SheetRow[] {
  const mockById = new Map(mock.map((m) => [m.employeeId, m]));
  const rows = new Map<string, SheetRow>(
    employees.map((e) => [e.id, emptyRow(e.id, mockById.get(e.id))]),
  );

  for (const r of records) {
    if (r.status !== 'approved') continue;
    const row = rows.get(r.employeeId);
    if (!row) continue;
    row.otTotal += r.plannedHours;
    if (r.otType === 'paid') row.otPaid += r.plannedHours;
    else row.otToil += r.plannedHours;
    row.sources.push({ type: 'plan', planId: r.planId, recordId: r.id });
  }

  for (const req of requests) {
    if (req.status !== 'approved') continue;
    const row = rows.get(req.employeeId);
    if (!row) continue;
    row.otTotal += req.durationH;
    // Unplanned OT always posts as paid.
    if (req.otType === 'paid') row.otPaid += req.durationH;
    else row.otToil += req.durationH;
    row.sources.push({ type: 'request', requestId: req.id });
  }

  return employees.map((e) => rows.get(e.id)!);
}

/** Count of employees with any posted approved OT (Summary "Got approved overtime"). */
export const employeesWithOT = (rows: SheetRow[]): number =>
  rows.filter((r) => r.otTotal > 0).length;
