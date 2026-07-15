// Reconciliation math — authoritative unit tests (brief §15).
// Run: npm test   (node --test with native TS type-stripping)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cost, multiplierFor } from './cost.ts';
import { reconcileRecord, reconcilePlan, excessPayrollDelta } from './reconcile.ts';
import type { OTPolicy, OvertimeRecord } from '../types.ts';

const policy: OTPolicy = {
  id: 'pol-1',
  normalMultiplier: 1.5,
  restMultiplier: 2.0,
  weeklyCapSoft: 60,
  goLiveDate: '2026-01-01',
  budgets: [],
};

const rec = (over: Partial<OvertimeRecord>): OvertimeRecord => ({
  id: 'r1',
  planId: 'p1',
  employeeId: 'e1',
  date: '2026-07-06',
  shiftId: null,
  dayType: 'normal',
  otType: 'paid',
  plannedHours: 4,
  actualHours: null,
  baseRate: 50,
  status: 'reconciling',
  outcome: null,
  payableHours: null,
  excessResolution: null,
  ...over,
});

test('match: actual === approved → pay approved', () => {
  const line = reconcileRecord(rec({ plannedHours: 4, actualHours: 4 }));
  assert.equal(line.outcome, 'match');
  assert.equal(line.payable, 4);
  assert.equal(line.excessHeld, 0);
});

test('short: actual < approved → pay actual', () => {
  const line = reconcileRecord(rec({ plannedHours: 4, actualHours: 2.5 }));
  assert.equal(line.outcome, 'short');
  assert.equal(line.payable, 2.5);
  assert.equal(line.excessHeld, 0);
});

test('excess: actual > approved → pay approved (capped), hold the extra', () => {
  const line = reconcileRecord(rec({ plannedHours: 4, actualHours: 6 }));
  assert.equal(line.outcome, 'excess');
  assert.equal(line.payable, 4);
  assert.equal(line.excessHeld, 2);
});

test('rest-day pricing is 2× and normal is 1.5×', () => {
  assert.equal(cost(4, 50, 'normal', policy), 4 * 50 * 1.5); // 300
  assert.equal(cost(4, 50, 'rest', policy), 4 * 50 * 2.0); // 400
  assert.equal(multiplierFor('rest', policy), 2.0);
  assert.equal(multiplierFor('normal', policy), 1.5);
});

test('multipliers are read from the policy — mutating the policy changes output (no hardcoded rates)', () => {
  const custom: OTPolicy = { ...policy, normalMultiplier: 1.25, restMultiplier: 1.75 };
  assert.equal(cost(4, 50, 'normal', custom), 4 * 50 * 1.25); // 250, not 300
  assert.equal(cost(4, 50, 'rest', custom), 4 * 50 * 1.75); // 350, not 400
});

test('rollup sums approved/actual/payable/excess and prices payroll by day type', () => {
  const records = [
    rec({ id: 'a', plannedHours: 4, actualHours: 4, dayType: 'normal', baseRate: 50 }), // match, pay 4 ×1.5 = 300
    rec({ id: 'b', plannedHours: 4, actualHours: 2, dayType: 'normal', baseRate: 50 }), // short, pay 2 ×1.5 = 150
    rec({ id: 'c', plannedHours: 3, actualHours: 5, dayType: 'rest', baseRate: 60 }), // excess, pay 3 ×2 ×60 = 360, hold 2
  ];
  const { rollup, lines } = reconcilePlan(records, policy);
  assert.equal(rollup.approved, 11);
  assert.equal(rollup.actual, 11);
  assert.equal(rollup.payable, 9); // 4 + 2 + 3
  assert.equal(rollup.excessHeld, 2);
  assert.equal(rollup.payrollAmount, 300 + 150 + 360); // 810
  assert.equal(lines.get('c')?.outcome, 'excess');
});

test('excess payroll delta: approve adds priced excess, reject adds nothing', () => {
  const record = rec({ plannedHours: 3, actualHours: 5, dayType: 'rest', baseRate: 60 });
  assert.equal(excessPayrollDelta(record, 'approve', policy), 2 * 60 * 2.0); // 240
  assert.equal(excessPayrollDelta(record, 'reject', policy), 0);
});
