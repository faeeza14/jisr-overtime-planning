// Reconciliation engine — pure, unit-testable (brief §9). No React/store imports.
// Compares approved (planned) OT to actual attendance and derives payable + outcome.

import type { OTPolicy, OvertimeRecord, RecordOutcome } from '../types';
import { cost } from './cost.ts';

export interface ReconcileLine {
  approved: number;
  actual: number;
  payable: number;
  outcome: RecordOutcome;
  /** Hours above approved that are peeled into the Excess-approvals lane (0 unless excess). */
  excessHeld: number;
}

/**
 * Per-record reconciliation (brief §9):
 *   actual === approved → Match, pay approved
 *   actual  <  approved → Short, pay actual
 *   actual  >  approved → Excess, pay approved (capped); hold (actual − approved) for the excess lane
 */
export function reconcileRecord(record: OvertimeRecord): ReconcileLine {
  const approved = record.plannedHours;
  const actual = record.actualHours ?? 0;

  if (actual === approved) {
    return { approved, actual, payable: approved, outcome: 'match', excessHeld: 0 };
  }
  if (actual < approved) {
    return { approved, actual, payable: actual, outcome: 'short', excessHeld: 0 };
  }
  return { approved, actual, payable: approved, outcome: 'excess', excessHeld: actual - approved };
}

export interface ReconcileRollup {
  approved: number;
  actual: number;
  payable: number;
  excessHeld: number;
  payrollAmount: number;
}

export interface ReconcilePlanResult {
  lines: Map<string, ReconcileLine>; // keyed by record id
  rollup: ReconcileRollup;
}

/**
 * Reconcile a whole set of records. `payrollAmount` sums the priced payable hours,
 * reading the day-type multiplier from the policy per record.
 */
export function reconcilePlan(
  records: OvertimeRecord[],
  policy: OTPolicy,
): ReconcilePlanResult {
  const lines = new Map<string, ReconcileLine>();
  const rollup: ReconcileRollup = {
    approved: 0,
    actual: 0,
    payable: 0,
    excessHeld: 0,
    payrollAmount: 0,
  };

  for (const record of records) {
    const line = reconcileRecord(record);
    lines.set(record.id, line);
    rollup.approved += line.approved;
    rollup.actual += line.actual;
    rollup.payable += line.payable;
    rollup.excessHeld += line.excessHeld;
    rollup.payrollAmount += cost(line.payable, record.baseRate, record.dayType, policy);
  }

  return { lines, rollup };
}

/**
 * Payroll delta for approving held excess hours on a record (excess-approvals lane).
 * `approve` adds the priced excess to payroll; `reject` caps at approved (delta 0).
 */
export function excessPayrollDelta(
  record: OvertimeRecord,
  decision: 'approve' | 'reject',
  policy: OTPolicy,
): number {
  if (decision === 'reject') return 0;
  const { excessHeld } = reconcileRecord(record);
  return cost(excessHeld, record.baseRate, record.dayType, policy);
}
