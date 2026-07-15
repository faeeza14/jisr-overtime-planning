// Seed data for the OT planning prototype.
// "Today" is anchored at 2026-07-15 (Wed). Seed plans cover EVERY status
// (draft · pending · approved · reconciling · settled · rejected) plus a settled
// period and an excess record so the Scheduler / Approvals / Reconciliation demos all light up.

import type {
  CostCentre,
  Employee,
  Group,
  OTPolicy,
  OvertimePlan,
  OvertimeRecord,
  Shift,
} from '../types';
import { dayTypeForDate } from '../lib/records';
import { reconcileRecord } from '../lib/reconcile';

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
  actualHours?: number | null;
  /** When true, fills payableHours + outcome via the reconcile engine (used for settled records). */
  reconciled?: boolean;
};

const mk = (i: RecInput): OvertimeRecord => {
  const base: OvertimeRecord = {
    id: `otr-seed-${++seq}`,
    planId: i.planId,
    employeeId: i.employeeId,
    date: i.date,
    shiftId: i.shiftId,
    dayType: dayTypeForDate(i.date),
    otType: i.otType ?? 'paid',
    plannedHours: i.plannedHours,
    actualHours: i.actualHours ?? null,
    baseRate: rateOf(i.employeeId),
    status: i.status,
    outcome: null,
    payableHours: null,
    excessResolution: null,
  };
  if (i.reconciled) {
    const line = reconcileRecord(base);
    base.payableHours = line.payable;
    base.outcome = line.outcome;
  }
  return base;
};

// ── P1 · Settled — Warehouse peak, early July (past week of Jul 5) ──────────────
const p1Records: OvertimeRecord[] = [
  mk({ planId: 'p1', employeeId: 'e1', date: '2026-07-06', shiftId: 'sh-morning', plannedHours: 3, status: 'settled', actualHours: 3, reconciled: true }),
  mk({ planId: 'p1', employeeId: 'e2', date: '2026-07-07', shiftId: 'sh-morning', plannedHours: 4, status: 'settled', actualHours: 3, reconciled: true }),
  mk({ planId: 'p1', employeeId: 'e3', date: '2026-07-08', shiftId: 'sh-morning', plannedHours: 2, status: 'settled', actualHours: 2, reconciled: true }),
];

// ── P2 · Reconciling — Coverage gap Jul 9–10, attendance in, one excess ─────────
const p2Records: OvertimeRecord[] = [
  mk({ planId: 'p2', employeeId: 'e1', date: '2026-07-09', shiftId: 'sh-evening', plannedHours: 3, status: 'reconciling', actualHours: 5 }), // excess (held 2)
  mk({ planId: 'p2', employeeId: 'e2', date: '2026-07-09', shiftId: 'sh-evening', plannedHours: 3, status: 'reconciling', actualHours: 2 }), // short
  mk({ planId: 'p2', employeeId: 'e4', date: '2026-07-10', shiftId: 'sh-night', plannedHours: 4, status: 'reconciling', actualHours: 4 }), // match (rest day 2×)
];

// ── P3 · Pending approval — Project deadline sprint (current week Jul 12–16) ─────
const p3Records: OvertimeRecord[] = [
  mk({ planId: 'p3', employeeId: 'e1', date: '2026-07-13', shiftId: 'sh-morning', plannedHours: 4, status: 'pending' }),
  mk({ planId: 'p3', employeeId: 'e2', date: '2026-07-13', shiftId: 'sh-morning', plannedHours: 4, status: 'pending' }),
  mk({ planId: 'p3', employeeId: 'e3', date: '2026-07-14', shiftId: 'sh-morning', plannedHours: 3, status: 'pending' }),
];

// ── P4 · Approved — Night dispatch coverage (next week Jul 19–23) ────────────────
const p4Records: OvertimeRecord[] = [
  mk({ planId: 'p4', employeeId: 'e4', date: '2026-07-20', shiftId: 'sh-night', plannedHours: 3, status: 'approved' }),
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
    status: 'settled',
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
    status: 'reconciling',
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
