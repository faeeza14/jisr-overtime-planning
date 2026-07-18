// Seed data for the OT planning prototype (Plan → Approve).
// "Today" is anchored at 2026-07-15 (Wed). Seed plans cover every status
// (draft · pending · approved · rejected). Approved plans + approved requests
// post to the Sheets & Settlements "Approved overtime" columns.

import type {
  CostCentre,
  Employee,
  ExcessConfig,
  Group,
  OTPolicy,
  OvertimeBeyondPlan,
  OvertimePlan,
  OvertimeRecord,
  OvertimeRequest,
  Shift,
  SheetMock,
} from '../types';
import { dayTypeForDate } from '../lib/records';

export const TODAY_ISO = '2026-07-15';

export const costCentres: CostCentre[] = [
  { id: 'cc-ops', name: 'Operations · Logistics' },
  { id: 'cc-retail', name: 'Retail · Stores' },
];

export const groups: Group[] = [
  { id: 'g-wh', name: 'Warehouse', kind: 'group' },
  { id: 'g-dsp', name: 'Dispatch', kind: 'group' },
  { id: 'b-ry', name: 'Riyadh DC', kind: 'branch' },
  { id: 'b-jd', name: 'Jeddah DC', kind: 'branch' },
  { id: 'jt-picker', name: 'Picker', kind: 'jobtitle' },
  { id: 'jt-forklift', name: 'Forklift Operator', kind: 'jobtitle' },
  { id: 'jt-dispatch', name: 'Dispatch Agent', kind: 'jobtitle' },
];

export const shifts: Shift[] = [
  { id: 'sh-morning', name: 'Morning', start: '07:00', end: '15:00', location: 'Warehouse A', color: 'peach' },
  { id: 'sh-evening', name: 'Evening', start: '15:00', end: '23:00', location: 'Warehouse B', color: 'lavender' },
  { id: 'sh-night', name: 'Night', start: '23:00', end: '07:00', location: 'Dispatch bay', color: 'pink' },
];

export const employees: Employee[] = [
  { id: 'e1', name: 'Omar Khalid', role: 'Picker', roleNumber: '4021', groupId: 'g-wh', branchId: 'b-ry', costCentreId: 'cc-ops', baseRate: 45 },
  { id: 'e2', name: 'Sara Ali', role: 'Picker', roleNumber: '4022', groupId: 'g-wh', branchId: 'b-ry', costCentreId: 'cc-ops', baseRate: 45 },
  { id: 'e3', name: 'Yousef Nasser', role: 'Forklift Operator', roleNumber: '4108', groupId: 'g-wh', branchId: 'b-ry', costCentreId: 'cc-ops', baseRate: 55 },
  { id: 'e4', name: 'Lina Hassan', role: 'Dispatch Agent', roleNumber: '3307', groupId: 'g-dsp', branchId: 'b-ry', costCentreId: 'cc-ops', baseRate: 50 },
  { id: 'e5', name: 'Mohammed Saleh', role: 'Shift Supervisor', roleNumber: '2201', groupId: 'g-dsp', branchId: 'b-jd', costCentreId: 'cc-ops', baseRate: 70 },
  { id: 'e6', name: 'Noura Faisal', role: 'Picker', roleNumber: '4090', groupId: 'g-wh', branchId: 'b-jd', costCentreId: 'cc-ops', baseRate: 45 },
];

export const otPolicy: OTPolicy = {
  id: 'pol-ot-ksa',
  normalMultiplier: 1.5,
  restMultiplier: 2.0,
  weeklyCapSoft: 60,
  goLiveDate: '2026-01-01',
  budgets: [
    { costCentreId: 'cc-ops', amount: 50000, committed: 12400 },
    { costCentreId: 'cc-retail', amount: 20000, committed: 3200 },
  ],
};

const rateOf = (empId: string) => employees.find((e) => e.id === empId)!.baseRate;

let seq = 0;
type RecInput = {
  planId: string;
  employeeId: string;
  date: string;
  shiftId: string | null;
  plannedHours: number;
  otType?: 'paid' | 'toil';
  status: OvertimeRecord['status'];
  actualHours?: number | null; // attendance input; null = not worked yet (future / unrecorded)
  suppressesAutoOT?: boolean;
};

const mk = (i: RecInput): OvertimeRecord => ({
  id: `otr-seed-${++seq}`,
  planId: i.planId,
  employeeId: i.employeeId,
  date: i.date,
  shiftId: i.shiftId,
  dayType: dayTypeForDate(i.date),
  otType: i.otType ?? 'paid',
  plannedHours: i.plannedHours,
  baseRate: rateOf(i.employeeId),
  status: i.status,
  actualHours: i.actualHours ?? null,
  payableHours: i.plannedHours, // legacy denorm; the sheet derives payable = min(worked, approved)
  suppressesAutoOT: i.suppressesAutoOT,
});

// ── P1 · Approved — Warehouse peak, early July (past week of Jul 5) ─────────────
// Worked hours have landed → the sheet shows payable = min(worked, approved):
//   Omar worked UNDER plan (2 of 3), Sara EXACT (4 of 4), Yousef OVER plan (3.5 of 2 → +1.5h excess).
const p1Records: OvertimeRecord[] = [
  mk({ planId: 'p1', employeeId: 'e1', date: '2026-07-06', shiftId: 'sh-morning', plannedHours: 3, status: 'approved', actualHours: 2 }),
  mk({ planId: 'p1', employeeId: 'e2', date: '2026-07-07', shiftId: 'sh-morning', plannedHours: 4, status: 'approved', actualHours: 4 }),
  mk({ planId: 'p1', employeeId: 'e3', date: '2026-07-08', shiftId: 'sh-morning', plannedHours: 2, otType: 'toil', status: 'approved', actualHours: 3.5 }),
];

// ── P2 · Approved — Coverage gap Jul 9–10 (worked as approved) ──────────────────
const p2Records: OvertimeRecord[] = [
  mk({ planId: 'p2', employeeId: 'e1', date: '2026-07-09', shiftId: 'sh-evening', plannedHours: 3, status: 'approved', actualHours: 3 }),
  mk({ planId: 'p2', employeeId: 'e2', date: '2026-07-09', shiftId: 'sh-evening', plannedHours: 3, status: 'approved', actualHours: 3 }),
  mk({ planId: 'p2', employeeId: 'e4', date: '2026-07-10', shiftId: 'sh-night', plannedHours: 4, status: 'approved', actualHours: 4 }),
];

// ── P3 · Pending approval — Project deadline sprint (current week Jul 12–16) ─────
// One record overrides automatic OT that day → chip shows "auto OT suppressed" once approved.
const p3Records: OvertimeRecord[] = [
  mk({ planId: 'p3', employeeId: 'e1', date: '2026-07-13', shiftId: 'sh-morning', plannedHours: 4, status: 'pending', suppressesAutoOT: true }),
  mk({ planId: 'p3', employeeId: 'e2', date: '2026-07-13', shiftId: 'sh-morning', plannedHours: 4, status: 'pending' }),
  mk({ planId: 'p3', employeeId: 'e3', date: '2026-07-14', shiftId: 'sh-morning', plannedHours: 3, status: 'pending' }),
];

// ── P4 · Approved — Night dispatch coverage (next week Jul 19–23, not yet worked) ─
const p4Records: OvertimeRecord[] = [
  mk({ planId: 'p4', employeeId: 'e4', date: '2026-07-20', shiftId: 'sh-night', plannedHours: 3, status: 'approved', suppressesAutoOT: true }),
  mk({ planId: 'p4', employeeId: 'e5', date: '2026-07-21', shiftId: 'sh-night', plannedHours: 3, otType: 'toil', status: 'approved' }),
];

// ── P5 · Draft — Inventory count (one-off Jul 26) ───────────────────────────────
const p5Records: OvertimeRecord[] = [
  mk({ planId: 'p5', employeeId: 'e1', date: '2026-07-26', shiftId: null, plannedHours: 5, status: 'draft' }),
  mk({ planId: 'p5', employeeId: 'e6', date: '2026-07-26', shiftId: null, plannedHours: 5, status: 'draft' }),
];

// ── P6 · Rejected — Emergency callout (one-off Jul 8) ───────────────────────────
const p6Records: OvertimeRecord[] = [
  mk({ planId: 'p6', employeeId: 'e5', date: '2026-07-08', shiftId: 'sh-night', plannedHours: 6, status: 'rejected' }),
];

export const seedRecords: OvertimeRecord[] = [
  ...p1Records,
  ...p2Records,
  ...p3Records,
  ...p4Records,
  ...p5Records,
  ...p6Records,
];

export const seedPlans: OvertimePlan[] = [
  {
    id: 'p1',
    name: 'Warehouse peak · early July',
    reason: 'peak_demand',
    type: 'range',
    period: { kind: 'range', start: '2026-07-05', end: '2026-07-09' },
    costCentreId: 'cc-ops',
    note: 'Ramadan restock backlog clearance.',
    status: 'approved',
    recordIds: p1Records.map((r) => r.id),
    submittedBy: 'Mohammed Saleh',
    approvalStep: 'Finance → Top management',
  },
  {
    id: 'p2',
    name: 'Coverage gap · Jul 9–10',
    reason: 'coverage_gap',
    type: 'range',
    period: { kind: 'range', start: '2026-07-09', end: '2026-07-10' },
    costCentreId: 'cc-ops',
    note: 'Two dispatch agents on annual leave.',
    status: 'approved',
    recordIds: p2Records.map((r) => r.id),
    submittedBy: 'Lina Hassan',
    approvalStep: 'Finance → Top management',
  },
  {
    id: 'p3',
    name: 'Project deadline sprint',
    reason: 'project_deadline',
    type: 'range',
    period: { kind: 'range', start: '2026-07-12', end: '2026-07-16' },
    costCentreId: 'cc-ops',
    note: 'Q3 outbound SLA — pick rate push.',
    status: 'pending',
    recordIds: p3Records.map((r) => r.id),
    submittedBy: 'Mohammed Saleh',
    approvalStep: 'Finance → Top management',
  },
  {
    id: 'p4',
    name: 'Night dispatch coverage',
    reason: 'coverage_gap',
    type: 'range',
    period: { kind: 'range', start: '2026-07-19', end: '2026-07-23' },
    costCentreId: 'cc-ops',
    status: 'approved',
    recordIds: p4Records.map((r) => r.id),
    submittedBy: 'Lina Hassan',
    approvalStep: 'Finance → Top management',
  },
  {
    id: 'p5',
    name: 'Inventory count',
    reason: 'other',
    type: 'oneoff',
    period: { kind: 'oneoff', date: '2026-07-26' },
    costCentreId: 'cc-ops',
    note: 'Quarterly stock take — full warehouse.',
    status: 'draft',
    recordIds: p5Records.map((r) => r.id),
  },
  {
    id: 'p6',
    name: 'Emergency callout',
    reason: 'emergency',
    type: 'oneoff',
    period: { kind: 'oneoff', date: '2026-07-08' },
    costCentreId: 'cc-ops',
    status: 'rejected',
    recordIds: p6Records.map((r) => r.id),
    submittedBy: 'Mohammed Saleh',
    approvalStep: 'Finance → Top management',
    rejectComment: 'Covered by existing on-call rota — no extra OT approved.',
  },
];

// ── Unplanned OT requests (the exception lane) — pending, awaiting approval ──────
export const seedRequests: OvertimeRequest[] = [
  {
    id: 'req-seed-1',
    employeeId: 'e6',
    date: '2026-07-11',
    durationH: 1,
    rateMultiplier: otPolicy.normalMultiplier,
    otType: 'paid',
    status: 'pending',
    approverId: 'e5',
    approverName: 'Mohammed Saleh',
    requestedOn: '2026-07-12',
    captureSource: 'punch',
  },
  {
    id: 'req-seed-2',
    employeeId: 'e2',
    date: '2026-07-14',
    durationH: 2,
    rateMultiplier: otPolicy.normalMultiplier,
    otType: 'paid',
    status: 'pending',
    approverId: 'e5',
    approverName: 'Mohammed Saleh',
    requestedOn: '2026-07-15',
    captureSource: 'punch',
  },
];

// ── Overtime beyond plan — auto-raised where actual exceeded the approved plan ───
// Yousef (e3) worked 3.5h against a 2h approved plan → +1.5h excess, held for its own approval.
const yousefOverRec = p1Records[2];
export const seedBeyondPlan: OvertimeBeyondPlan[] = [
  {
    id: 'bp-seed-1',
    employeeId: yousefOverRec.employeeId,
    date: yousefOverRec.date,
    planId: yousefOverRec.planId,
    recordId: yousefOverRec.id,
    approvedHours: yousefOverRec.plannedHours, // 2
    actualHours: yousefOverRec.actualHours ?? yousefOverRec.plannedHours, // 3.5
    excessHours: (yousefOverRec.actualHours ?? 0) - yousefOverRec.plannedHours, // 1.5
    otType: yousefOverRec.otType, // inherits the plan's comp type
    rateMultiplier: yousefOverRec.dayType === 'rest' ? otPolicy.restMultiplier : otPolicy.normalMultiplier,
    status: 'pending',
    source: 'auto_create',
    createdOn: '2026-07-09',
  },
];

// Excess-handling config (PRD §2.5) — how OT worked beyond plan is raised & treated.
export const excessConfig: ExcessConfig = {
  mode: 'auto_create',
  toleranceBufferMinutes: 5,
  inheritsCompType: true,
  countsTowardCaps: true,
};

// Per-employee mock figures for the non-OT sheet column groups (production context).
export const sheetMock: SheetMock[] = [
  { employeeId: 'e1', leaveDays: 0, scheduledDur: 176, workedDur: 174, diff: -2, absence: 0 },
  { employeeId: 'e2', leaveDays: 1, scheduledDur: 168, workedDur: 168, diff: 0, absence: 0 },
  { employeeId: 'e3', leaveDays: 0, scheduledDur: 176, workedDur: 176, diff: 0, absence: 0 },
  { employeeId: 'e4', leaveDays: 2, scheduledDur: 160, workedDur: 158, diff: -2, absence: 1 },
  { employeeId: 'e5', leaveDays: 0, scheduledDur: 176, workedDur: 180, diff: 4, absence: 0 },
  { employeeId: 'e6', leaveDays: 0, scheduledDur: 176, workedDur: 172, diff: -4, absence: 0 },
];
