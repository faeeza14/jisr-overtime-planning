// Derived views over the store — pure functions so screens stay thin.

import type { OTPolicy, OvertimePlan, OvertimeRecord, PlanStatus } from '../types';
import { reconcileRecord } from '../lib/reconcile';
import { cost } from '../lib/cost';
import { parseIsoLocal } from '../lib/weekly';

export const recordsForPlan = (
  records: Record<string, OvertimeRecord>,
  plan: OvertimePlan,
): OvertimeRecord[] => plan.recordIds.map((id) => records[id]).filter(Boolean);

export const plannedHours = (recs: OvertimeRecord[]): number =>
  recs.reduce((sum, r) => sum + r.plannedHours, 0);

/** Estimated cost of planned OT for a set of records (rates read from policy). */
export const estCost = (recs: OvertimeRecord[], policy: OTPolicy): number =>
  recs.reduce((sum, r) => sum + cost(r.plannedHours, r.baseRate, r.dayType, policy), 0);

/** Distinct employee ids in a set of records. */
export const distinctEmployees = (recs: OvertimeRecord[]): string[] =>
  Array.from(new Set(recs.map((r) => r.employeeId)));

/** Records keyed by `employeeId|date` for O(1) Scheduler cell lookup. */
export const recordsByCell = (
  records: Record<string, OvertimeRecord>,
): Map<string, OvertimeRecord[]> => {
  const map = new Map<string, OvertimeRecord[]>();
  for (const r of Object.values(records)) {
    const key = `${r.employeeId}|${r.date}`;
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }
  return map;
};

export interface PlanStats {
  activePlans: number;
  pendingApproval: number;
  plannedHoursMonth: number;
  committed: number;
  budget: number;
}

const isSameMonth = (iso: string, ref: string): boolean => {
  const d = parseIsoLocal(iso);
  const r = parseIsoLocal(ref);
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
};

export const planStats = (
  plans: Record<string, OvertimePlan>,
  records: Record<string, OvertimeRecord>,
  budgetTotal: number,
  committedBase: number,
  refDate: string,
): PlanStats => {
  const planList = Object.values(plans);
  const active = planList.filter((p) => ['pending', 'approved', 'reconciling'].includes(p.status)).length;
  const pending = planList.filter((p) => p.status === 'pending').length;
  const monthHours = Object.values(records)
    .filter((r) => r.status !== 'rejected' && r.status !== 'draft' && isSameMonth(r.date, refDate))
    .reduce((sum, r) => sum + r.plannedHours, 0);
  return {
    activePlans: active,
    pendingApproval: pending,
    plannedHoursMonth: monthHours,
    committed: committedBase,
    budget: budgetTotal,
  };
};

export const plansByStatus = (
  plans: Record<string, OvertimePlan>,
  status: PlanStatus,
): OvertimePlan[] => Object.values(plans).filter((p) => p.status === status);

/** Excess records awaiting a decision (outcome excess, not yet resolved). */
export const excessRecords = (records: Record<string, OvertimeRecord>): OvertimeRecord[] =>
  Object.values(records).filter((r) => {
    if (r.actualHours == null) return false;
    const line = reconcileRecord(r);
    return line.outcome === 'excess' && r.excessResolution == null && r.status !== 'draft';
  });
