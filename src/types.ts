// Domain model — Jisr Overtime Planning (Plan → Approve).
// The OvertimeRecord is the atomic unit (one per employee × shift × date).
// Reconciliation is deferred: the actualHours / payableHours fields are retained so the
// reconcile step can slot back in later without a data migration.

export type PlanReason =
  | 'peak_demand'
  | 'coverage_gap'
  | 'project_deadline'
  | 'emergency'
  | 'other';

export type PlanType = 'range' | 'oneoff' | 'recurring';

/** Lifecycle: draft → pending → approved (+ rejected at approval). */
export type PlanStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type DayType = 'normal' | 'rest';
export type OTType = 'paid' | 'toil';

/** Provenance for a value posted to the attendance sheet (planned record or unplanned request). */
export type OTSource =
  | { type: 'plan'; planId: string; recordId: string }
  | { type: 'request'; requestId: string };

export type PlanPeriod =
  | { kind: 'range'; start: string; end: string }
  | { kind: 'oneoff'; date: string }
  | { kind: 'recurring'; weekdays: number[]; until: string; start: string };

export interface CostCentre {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  roleNumber: string;
  groupId: string;
  branchId: string;
  costCentreId: string;
  baseRate: number; // hourly
}

export interface Group {
  id: string;
  name: string;
  kind: 'group' | 'branch' | 'jobtitle';
}

export interface Shift {
  id: string;
  name: string;
  start: string; // "07:00"
  end: string; // "15:00"
  location: string;
  color: 'lavender' | 'peach' | 'pink';
}

/** OTPolicy — the single source of truth for rates (brief §4.4). Rates are READ, never redefined. */
export interface OTBudget {
  costCentreId: string;
  amount: number;
  committed: number;
}

export interface OTPolicy {
  id: string;
  normalMultiplier: number; // 1.5×
  restMultiplier: number; // 2.0×
  weeklyCapSoft: number; // 60h soft warning
  goLiveDate: string;
  budgets: OTBudget[];
}

/** The atomic unit — one per employee, per shift, per date (brief §4.2). */
export interface OvertimeRecord {
  id: string;
  planId: string;
  employeeId: string;
  date: string;
  shiftId: string | null; // null = OT with no shift
  dayType: DayType; // snapshotted at generation → drives multiplier
  otType: OTType;
  plannedHours: number;
  baseRate: number; // snapshotted employee hourly rate → deterministic pricing
  status: PlanStatus; // mirrors the plan's approval state
  /** Deferred reconcile fields — retained now so reconciliation re-adds without a migration. */
  actualHours: number | null; // will be filled from attendance later
  payableHours: number | null; // defaults to plannedHours; approved = payable for now
}

export interface OvertimePlan {
  id: string;
  name: string;
  reason: PlanReason;
  type: PlanType;
  period: PlanPeriod;
  costCentreId: string;
  note?: string;
  status: PlanStatus;
  recordIds: string[];
  submittedBy?: string;
  approvalStep?: string; // e.g. "Finance → Top management"
  rejectComment?: string;
}

/** Approver edit log — each in-place change is a delta for audit (brief §5). */
export interface AuditDelta {
  id: string;
  recordId: string;
  planId: string;
  field: 'plannedHours' | 'employeeId' | 'date' | 'status';
  before: unknown;
  after: unknown;
  by: string;
  at: string;
}

/** Feature toggles + config surfaced on Shift Settings (brief §10). */
export interface FeatureConfig {
  shiftScheduleApproval: boolean;
  overtimePlanner: boolean;
}

/** Unplanned OT lane — captured from a punch, approved into the sheet (change set §B). */
export interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  durationH: number;
  rateMultiplier: number; // ×rate from OTPolicy (e.g. 1.5)
  otType: OTType; // unplanned always posts as paid
  status: 'pending' | 'approved' | 'rejected';
  approverId: string;
  approverName: string;
  requestedOn: string;
  captureSource: 'punch' | 'manual';
}

/** One compiled attendance-sheet row per employee (change set §B). */
export interface SheetRow {
  employeeId: string;
  // Mock non-OT groups (production context — not computed here)
  leaveDays: number;
  scheduledDur: number;
  workedDur: number;
  diff: number;
  absence: number;
  // Approved-overtime group — computed from approved records + approved requests
  otTotal: number;
  otPaid: number;
  otToil: number;
  sources: OTSource[];
}

/** Per-employee mock figures for the non-OT sheet column groups. */
export interface SheetMock {
  employeeId: string;
  leaveDays: number;
  scheduledDur: number;
  workedDur: number;
  diff: number;
  absence: number;
}
