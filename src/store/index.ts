import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  AuditDelta,
  CostCentre,
  Employee,
  FeatureConfig,
  Group,
  OTPolicy,
  OvertimePlan,
  OvertimeRecord,
  PlanPeriod,
  PlanReason,
  PlanType,
  Shift,
} from '../types';
import {
  costCentres as seedCostCentres,
  employees as seedEmployees,
  groups as seedGroups,
  otPolicy as seedPolicy,
  seedPlans,
  seedRecords,
  shifts as seedShifts,
  TODAY_ISO,
} from '../data/seed';
import { reconcileRecord } from '../lib/reconcile';

const indexById = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((it) => [it.id, it]));

const tsNow = () => new Date().toISOString();
const CURRENT_USER = 'Faeeza Adams';

export interface CreatePlanInput {
  name: string;
  reason: PlanReason;
  type: PlanType;
  period: PlanPeriod;
  costCentreId: string;
  note?: string;
}

export interface RecordEdit {
  recordId: string;
  plannedHours: number;
}

type OTState = {
  policy: OTPolicy;
  costCentres: CostCentre[];
  employees: Employee[];
  groups: Group[];
  shifts: Shift[];
  plans: Record<string, OvertimePlan>;
  records: Record<string, OvertimeRecord>;
  audit: AuditDelta[];
  features: FeatureConfig;
  ui: { currentDate: string };

  // lifecycle
  createDraftPlan: (input: CreatePlanInput) => string;
  updateDraftPlan: (id: string, patch: Partial<CreatePlanInput>) => void;
  setPlanRecords: (planId: string, records: OvertimeRecord[]) => void;
  submitForApproval: (planId: string) => void;
  approvePlan: (planId: string, edits?: RecordEdit[]) => void;
  rejectPlan: (planId: string, comment: string) => void;
  startReconciling: (planId: string) => void;
  settlePeriod: (planId: string) => void;

  // record-level
  setActualHours: (recordId: string, hrs: number) => void;
  resolveExcess: (recordId: string, decision: 'approve' | 'reject') => void;

  // config
  setFeature: (key: keyof FeatureConfig, on: boolean) => void;
  updatePolicy: (patch: Partial<OTPolicy>) => void;
};

const setRecordStatus = (
  records: Record<string, OvertimeRecord>,
  ids: string[],
  status: OvertimeRecord['status'],
): Record<string, OvertimeRecord> => {
  const next = { ...records };
  for (const id of ids) if (next[id]) next[id] = { ...next[id], status };
  return next;
};

export const useOTStore = create<OTState>((set) => ({
  policy: seedPolicy,
  costCentres: seedCostCentres,
  employees: seedEmployees,
  groups: seedGroups,
  shifts: seedShifts,
  plans: indexById(seedPlans),
  records: indexById(seedRecords),
  audit: [],
  features: {
    shiftScheduleApproval: true,
    overtimePlanner: true,
    attendanceReconciliation: true,
  },
  ui: { currentDate: TODAY_ISO },

  createDraftPlan: (input) => {
    const id = `plan-${nanoid(6)}`;
    const plan: OvertimePlan = {
      id,
      name: input.name,
      reason: input.reason,
      type: input.type,
      period: input.period,
      costCentreId: input.costCentreId,
      note: input.note,
      status: 'draft',
      recordIds: [],
    };
    set((s) => ({ plans: { ...s.plans, [id]: plan } }));
    return id;
  },

  updateDraftPlan: (id, patch) =>
    set((s) => ({ plans: { ...s.plans, [id]: { ...s.plans[id], ...patch } } })),

  setPlanRecords: (planId, records) =>
    set((s) => {
      // drop any existing records for this plan, then add the new set
      const kept = Object.fromEntries(
        Object.entries(s.records).filter(([, r]) => r.planId !== planId),
      );
      for (const r of records) kept[r.id] = r;
      return {
        records: kept,
        plans: { ...s.plans, [planId]: { ...s.plans[planId], recordIds: records.map((r) => r.id) } },
      };
    }),

  submitForApproval: (planId) =>
    set((s) => {
      const plan = s.plans[planId];
      if (!plan) return s;
      return {
        records: setRecordStatus(s.records, plan.recordIds, 'pending'),
        plans: {
          ...s.plans,
          [planId]: {
            ...plan,
            status: 'pending',
            submittedBy: CURRENT_USER,
            approvalStep: 'Finance → Top management',
          },
        },
      };
    }),

  // Reflection #1 — approving flips records pending → approved, so Scheduler chips recolor.
  approvePlan: (planId, edits = []) =>
    set((s) => {
      const plan = s.plans[planId];
      if (!plan) return s;
      const records = { ...s.records };
      const audit = [...s.audit];
      for (const edit of edits) {
        const r = records[edit.recordId];
        if (r && r.plannedHours !== edit.plannedHours) {
          audit.push({
            id: `aud-${nanoid(6)}`,
            recordId: r.id,
            planId,
            field: 'plannedHours',
            before: r.plannedHours,
            after: edit.plannedHours,
            by: CURRENT_USER,
            at: tsNow(),
          });
          records[edit.recordId] = { ...r, plannedHours: edit.plannedHours };
        }
      }
      for (const id of plan.recordIds) if (records[id]) records[id] = { ...records[id], status: 'approved' };
      return { records, audit, plans: { ...s.plans, [planId]: { ...plan, status: 'approved' } } };
    }),

  rejectPlan: (planId, comment) =>
    set((s) => {
      const plan = s.plans[planId];
      if (!plan) return s;
      return {
        records: setRecordStatus(s.records, plan.recordIds, 'rejected'),
        plans: { ...s.plans, [planId]: { ...plan, status: 'rejected', rejectComment: comment } },
      };
    }),

  // Move an approved plan into reconciliation. In the prototype, attendance is mocked:
  // records without an actual default to their planned hours so they are reconcilable.
  startReconciling: (planId) =>
    set((s) => {
      const plan = s.plans[planId];
      if (!plan) return s;
      const records = { ...s.records };
      for (const id of plan.recordIds) {
        const r = records[id];
        if (!r) continue;
        records[id] = {
          ...r,
          status: 'reconciling',
          actualHours: r.actualHours ?? r.plannedHours,
        };
      }
      return { records, plans: { ...s.plans, [planId]: { ...plan, status: 'reconciling' } } };
    }),

  // Reflection #2 — settling computes payable/outcome, locks records → Scheduler chips lock.
  settlePeriod: (planId) =>
    set((s) => {
      const plan = s.plans[planId];
      if (!plan) return s;
      const records = { ...s.records };
      for (const id of plan.recordIds) {
        const r = records[id];
        if (!r) continue;
        const line = reconcileRecord(r);
        // If an excess was explicitly approved, pay the full actual; otherwise cap at approved.
        const payable = r.excessResolution === 'approved' ? line.actual : line.payable;
        records[id] = {
          ...r,
          status: 'settled',
          outcome: line.outcome,
          payableHours: payable,
        };
      }
      return { records, plans: { ...s.plans, [planId]: { ...plan, status: 'settled' } } };
    }),

  setActualHours: (recordId, hrs) =>
    set((s) => {
      const r = s.records[recordId];
      if (!r) return s;
      return { records: { ...s.records, [recordId]: { ...r, actualHours: hrs } } };
    }),

  // Reflection #3 — approve/reject excess updates only that record's payable; settled bases untouched.
  resolveExcess: (recordId, decision) =>
    set((s) => {
      const r = s.records[recordId];
      if (!r) return s;
      const line = reconcileRecord(r);
      const resolution = decision === 'approve' ? 'approved' : 'rejected';
      const payable = decision === 'approve' ? line.actual : line.payable;
      return {
        records: {
          ...s.records,
          [recordId]: { ...r, excessResolution: resolution, payableHours: payable, outcome: line.outcome },
        },
      };
    }),

  setFeature: (key, on) => set((s) => ({ features: { ...s.features, [key]: on } })),

  updatePolicy: (patch) => set((s) => ({ policy: { ...s.policy, ...patch } })),
}));
