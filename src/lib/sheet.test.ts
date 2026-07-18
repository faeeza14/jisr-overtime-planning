// Sheet posting — unit tests (change set §B, PRD payable = min(worked, approved)). Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileSheet, employeesWithOT, payableFor, excessFor } from './sheet.ts';
import type {
  Employee,
  OvertimeBeyondPlan,
  OvertimeRecord,
  OvertimeRequest,
  SheetMock,
} from '../types.ts';

const emp = (id: string): Employee => ({
  id,
  name: id,
  role: 'Picker',
  roleNumber: '000',
  groupId: 'g',
  branchId: 'b',
  costCentreId: 'cc',
  baseRate: 50,
});

const rec = (over: Partial<OvertimeRecord>): OvertimeRecord => ({
  id: 'r',
  planId: 'p',
  employeeId: 'e1',
  date: '2026-07-06',
  shiftId: null,
  dayType: 'normal',
  otType: 'paid',
  plannedHours: 3,
  baseRate: 50,
  status: 'approved',
  actualHours: null,
  payableHours: 3,
  ...over,
});

const req = (over: Partial<OvertimeRequest>): OvertimeRequest => ({
  id: 'req',
  employeeId: 'e1',
  date: '2026-07-06',
  durationH: 2,
  rateMultiplier: 1.5,
  otType: 'paid',
  status: 'approved',
  approverId: 'e5',
  approverName: 'Sup',
  requestedOn: '2026-07-07',
  captureSource: 'punch',
  ...over,
});

const bp = (over: Partial<OvertimeBeyondPlan>): OvertimeBeyondPlan => ({
  id: 'bp',
  employeeId: 'e1',
  date: '2026-07-06',
  planId: 'p',
  recordId: 'r',
  approvedHours: 2,
  actualHours: 3.5,
  excessHours: 1.5,
  otType: 'paid',
  rateMultiplier: 1.5,
  status: 'pending',
  source: 'auto_create',
  createdOn: '2026-07-06',
  ...over,
});

const mock: SheetMock[] = [{ employeeId: 'e1', leaveDays: 1, scheduledDur: 176, workedDur: 170, diff: -6, absence: 0 }];

test('payableFor / excessFor derive min(worked, approved) and the overage', () => {
  assert.equal(payableFor(rec({ plannedHours: 6, actualHours: null })), 6); // not worked yet → plan
  assert.equal(payableFor(rec({ plannedHours: 6, actualHours: 5 })), 5); // under → actual
  assert.equal(payableFor(rec({ plannedHours: 2, actualHours: 3.5 })), 2); // over → capped at plan
  assert.equal(excessFor(rec({ plannedHours: 2, actualHours: 3.5 })), 1.5);
  assert.equal(excessFor(rec({ plannedHours: 6, actualHours: 5 })), 0);
});

test('approved record with no attendance posts the full plan (otTotal = otApproved)', () => {
  const [row] = compileSheet([emp('e1')], [rec({ plannedHours: 3, otType: 'paid' })], [], [], mock);
  assert.equal(row.otApproved, 3);
  assert.equal(row.otTotal, 3);
  assert.equal(row.otPaid, 3);
  assert.equal(row.otToil, 0);
  assert.equal(row.sources[0].type, 'plan');
  assert.equal(row.leaveDays, 1); // mock non-OT figure carried through
});

test('worked UNDER plan posts payable = actual, capped below the approved ceiling', () => {
  const [row] = compileSheet([emp('e1')], [rec({ plannedHours: 6, actualHours: 5 })], [], [], []);
  assert.equal(row.otApproved, 6); // ceiling shown as "of 6h approved"
  assert.equal(row.otTotal, 5); // payable = min(5, 6)
  assert.equal(row.otPaid, 5);
});

test('worked OVER plan caps payable at plan; the excess does NOT post until its item is approved', () => {
  const record = rec({ plannedHours: 2, actualHours: 3.5 });
  const pending = bp({ status: 'pending', excessHours: 1.5 });
  const [row] = compileSheet([emp('e1')], [record], [], [pending], []);
  assert.equal(row.otTotal, 2); // capped at plan
  assert.equal(row.excessPending, 1.5); // shown as "+1.5h excess pending", not paid
  // no beyond_plan source yet
  assert.ok(!row.sources.some((s) => s.type === 'beyond_plan'));
});

test('approved beyond-plan excess posts its hours with beyond_plan provenance', () => {
  const record = rec({ plannedHours: 2, actualHours: 3.5 });
  const approved = bp({ status: 'approved', excessHours: 1.5 });
  const [row] = compileSheet([emp('e1')], [record], [], [approved], []);
  assert.equal(row.otTotal, 3.5); // 2 capped payable + 1.5 approved excess
  assert.equal(row.otPaid, 3.5);
  assert.equal(row.excessPending, 0);
  assert.ok(row.sources.some((s) => s.type === 'beyond_plan'));
});

test('beyond-plan excess inherits TOIL comp type onto the TOIL column', () => {
  const record = rec({ plannedHours: 2, otType: 'toil', actualHours: 2 });
  const approved = bp({ status: 'approved', otType: 'toil', excessHours: 1 });
  const [row] = compileSheet([emp('e1')], [record], [], [approved], []);
  assert.equal(row.otToil, 3); // 2 payable TOIL + 1 excess TOIL
  assert.equal(row.otPaid, 0);
});

test('TOIL record posts to Total + TOIL, not Paid', () => {
  const [row] = compileSheet([emp('e1')], [rec({ plannedHours: 2, otType: 'toil', actualHours: 2 })], [], [], []);
  assert.equal(row.otTotal, 2);
  assert.equal(row.otPaid, 0);
  assert.equal(row.otToil, 2);
});

test('pending / rejected / draft records do NOT post', () => {
  const recs = [rec({ status: 'pending' }), rec({ id: 'r2', status: 'rejected' }), rec({ id: 'r3', status: 'draft' })];
  const [row] = compileSheet([emp('e1')], recs, [], [], []);
  assert.equal(row.otTotal, 0);
  assert.equal(row.sources.length, 0);
});

test('approved request posts as paid with request provenance; pending does not', () => {
  const [row] = compileSheet(
    [emp('e1')],
    [],
    [req({ durationH: 2, status: 'approved' }), req({ id: 'req2', durationH: 5, status: 'pending' })],
    [],
    [],
  );
  assert.equal(row.otTotal, 2);
  assert.equal(row.otPaid, 2);
  assert.equal(row.sources[0].type, 'request');
});

test('planned + unplanned lanes both accumulate into the same row', () => {
  const [row] = compileSheet(
    [emp('e1')],
    [rec({ plannedHours: 3, otType: 'paid', actualHours: 3 })],
    [req({ durationH: 2, status: 'approved' })],
    [],
    [],
  );
  assert.equal(row.otTotal, 5);
  assert.equal(row.otPaid, 5);
  assert.equal(row.sources.length, 2);
});

test('employeesWithOT counts only rows with posted OT', () => {
  const rows = compileSheet(
    [emp('e1'), emp('e2')],
    [rec({ employeeId: 'e1', plannedHours: 3 })],
    [],
    [],
    [],
  );
  assert.equal(employeesWithOT(rows), 1);
});
