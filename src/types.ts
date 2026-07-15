// Domain model — Jisr Overtime Planning & Reconciliation.
// Mirrors the build brief §4. The OvertimeRecord is the atomic unit (one per employee × shift × date).

export type PlanReason =
  | 'peak_demand'
  | 'coverage_gap'
  | 'project_deadline'
  | 'emergency'
  | 'other';

export type PlanType = 'range' | 'oneoff' | 'recurring';

/** Lifecycle: draft → pending → approved → reconciling → settled (+ rejected at approval). */
export type PlanStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'reconciling'
  | 'settled'
  | 'rejected';

export type DayType = 'normal' | 'rest';
export type OTType = 'paid' | 'toil';

/** Per-record reconciliation outcome (only meaningful once actualHours is in). */
export type RecordOutcome = 'match' | 'short' | 'excess';

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
  actualHours: number | null; // filled from attendance after the period
  baseRate: number; // snapshotted employee hourly rate → deterministic pricing
  status: PlanStatus; // mirrors/derives from plan + reconciliation
  outcome: RecordOutcome | null; // computed at reconcile
  payableHours: number | null; // computed at reconcile (§7.2 / §9)
  /** Excess-lane decision once outcome === 'excess' (brief §9). null = awaiting decision. */
  excessResolution: 'approved' | 'rejected' | null;
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
  attendanceReconciliation: boolean;
}
