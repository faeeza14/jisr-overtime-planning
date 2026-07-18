// Attendance-sheet compilation (change set §B) — pure, unit-testable. No React/store imports.
// The "Approved overtime" columns are a live projection of the store. Payable = min(worked, approved):
// only APPROVED OvertimeRecords (planned lane, capped to hours worked), APPROVED OvertimeRequests
// (unplanned lane) and APPROVED OvertimeBeyondPlan excess (over-plan lane) post to the columns.

import type {
  Employee,
  OvertimeBeyondPlan,
  OvertimeRecord,
  OvertimeRequest,
  SheetMock,
  SheetRow,
} from '../types';

/** Payable hours for a record: the plan capped to what was actually worked. */
export const payableFor = (r: OvertimeRecord): number =>
  r.actualHours == null ? r.plannedHours : Math.min(r.plannedHours, r.actualHours);

/** Hours worked beyond the approved plan (0 until attendance lands / when under plan). */
export const excessFor = (r: OvertimeRecord): number =>
  r.actualHours == null ? 0 : Math.max(0, r.actualHours - r.plannedHours);

const emptyRow = (employeeId: string, mock?: SheetMock): SheetRow => ({
  employeeId,
  leaveDays: mock?.leaveDays ?? 0,
  scheduledDur: mock?.scheduledDur ?? 0,
  workedDur: mock?.workedDur ?? 0,
  diff: mock?.diff ?? 0,
  absence: mock?.absence ?? 0,
  otApproved: 0,
  otTotal: 0,
  otPaid: 0,
  otToil: 0,
  excessPending: 0,
  sources: [],
});

/**
 * Compile one sheet row per employee.
 * - Approved planned record → otApproved += planned; otTotal += payable (min(worked, approved)).
 * - Approved unplanned request → posts durationH (always paid).
 * - Approved beyond-plan excess → posts excessHours with beyond_plan provenance.
 * - Pending beyond-plan excess → excessPending (annotation only, not paid until approved).
 * Pending / rejected / draft records & requests do NOT post.
 */
export function compileSheet(
  employees: Employee[],
  records: OvertimeRecord[],
  requests: OvertimeRequest[],
  beyondPlan: OvertimeBeyondPlan[],
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
    const pay = payableFor(r);
    row.otApproved += r.plannedHours; // the ceiling shown as "of Y approved"
    row.otTotal += pay;
    if (r.otType === 'paid') row.otPaid += pay;
    else row.otToil += pay;
    row.sources.push({ type: 'plan', planId: r.planId, recordId: r.id });
  }

  for (const req of requests) {
    if (req.status !== 'approved') continue;
    const row = rows.get(req.employeeId);
    if (!row) continue;
    row.otApproved += req.durationH;
    row.otTotal += req.durationH;
    // Unplanned OT always posts as paid.
    if (req.otType === 'paid') row.otPaid += req.durationH;
    else row.otToil += req.durationH;
    row.sources.push({ type: 'request', requestId: req.id });
  }

  for (const bp of beyondPlan) {
    const row = rows.get(bp.employeeId);
    if (!row) continue;
    if (bp.status === 'approved') {
      row.otTotal += bp.excessHours;
      if (bp.otType === 'paid') row.otPaid += bp.excessHours;
      else row.otToil += bp.excessHours;
      row.sources.push({ type: 'beyond_plan', id: bp.id });
    } else if (bp.status === 'pending') {
      row.excessPending += bp.excessHours;
    }
  }

  return employees.map((e) => rows.get(e.id)!);
}

/** Count of employees with any posted approved OT (Summary "Got approved overtime"). */
export const employeesWithOT = (rows: SheetRow[]): number =>
  rows.filter((r) => r.otTotal > 0).length;
