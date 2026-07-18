// Domain model — Jisr Overtime Planning (Plan → Approve).
// The OvertimeRecord is the atomic unit (one per employee × shift × date).
// Payable = min(worked, approved): actualHours is the attendance input; payable/excess are derived
// inline (see lib/sheet.ts) and post straight to the attendance sheet — there is no separate stage.

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

/** Provenance for a value posted to the attendance sheet (planned record, unplanned request, or excess). */
export type OTSource =
  | { type: 'plan'; planId: string; recordId: string }
  | { type: 'request'; requestId: string }
  | { type: 'beyond_plan'; id: string };

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
  /** Attendance input. payable = min(plannedHours, actualHours), excess = max(0, actual − planned);
   *  both derived inline in lib/sheet.ts. actualHours === null → nothing worked yet, payable = planned. */
  actualHours: number | null;
  payableHours: number | null; // legacy denorm; the sheet derives payable, does not read this
  /** When approved planned OT overrides automatic OT on this day (PRD FR-2) — surfaced on the chip. */
  suppressesAutoOT?: boolean;
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
  captureBeyondPlan: boolean; // capture OT worked beyond an approved plan (PRD §2.5)
}

/** How overtime worked beyond an approved plan is handled (PRD §2.5 / §8.3). */
export interface ExcessConfig {
  mode: 'auto_create' | 'employee_submits'; // who raises the excess item
  toleranceBufferMinutes: number; // ignore stray minutes over plan
  inheritsCompType: boolean; // excess inherits the plan's paid/TOIL comp type
  countsTowardCaps: boolean; // excess counts toward OT policy caps
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

/** Overtime worked beyond an approved plan — plan-anchored, raised for its own approval (PRD §2.3). */
export interface OvertimeBeyondPlan {
  id: string;
  employeeId: string;
  date: string;
  planId: string; // anchor
  recordId: string; // the approved record it exceeded
  approvedHours: number; // P
  actualHours: number; // A
  excessHours: number; // A − P
  otType: OTType; // inherits the plan's comp type
  rateMultiplier: number; // ×rate from OTPolicy (rest 2× / normal 1.5×)
  status: 'pending' | 'approved' | 'rejected';
  source: 'auto_create' | 'employee';
  createdOn: string;
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
  // Approved-overtime group — computed from approved records + requests + beyond-plan excess
  otApproved: number; // ceiling = Σ approved/planned hours (the "of Y approved" figure)
  otTotal: number; // payable = Σ min(worked, approved) + approved requests + approved excess
  otPaid: number;
  otToil: number;
  excessPending: number; // Σ pending beyond-plan excess awaiting its own approval
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
