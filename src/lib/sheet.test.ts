// Sheet posting — unit tests (change set §B). Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileSheet, employeesWithOT } from './sheet.ts';
import type { Employee, OvertimeRecord, OvertimeRequest, SheetMock } from '../types.ts';

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

const mock: SheetMock[] = [{ employeeId: 'e1', leaveDays: 1, scheduledDur: 176, workedDur: 170, diff: -6, absence: 0 }];

test('approved planned record posts to Total + Paid with plan provenance', () => {
  const [row] = compileSheet([emp('e1')], [rec({ plannedHours: 3, otType: 'paid' })], [], mock);
  assert.equal(row.otTotal, 3);
  assert.equal(row.otPaid, 3);
  assert.equal(row.otToil, 0);
  assert.equal(row.sources.length, 1);
  assert.equal(row.sources[0].type, 'plan');
  assert.equal(row.leaveDays, 1); // mock non-OT figure carried through
});

test('TOIL record posts to Total + TOIL, not Paid', () => {
  const [row] = compileSheet([emp('e1')], [rec({ plannedHours: 2, otType: 'toil' })], [], []);
  assert.equal(row.otTotal, 2);
  assert.equal(row.otPaid, 0);
  assert.equal(row.otToil, 2);
});

test('pending / rejected / draft records do NOT post', () => {
  const recs = [rec({ status: 'pending' }), rec({ id: 'r2', status: 'rejected' }), rec({ id: 'r3', status: 'draft' })];
  const [row] = compileSheet([emp('e1')], recs, [], []);
  assert.equal(row.otTotal, 0);
  assert.equal(row.sources.length, 0);
});

test('approved request posts as paid with request provenance; pending does not', () => {
  const [row] = compileSheet(
    [emp('e1')],
    [],
    [req({ durationH: 2, status: 'approved' }), req({ id: 'req2', durationH: 5, status: 'pending' })],
    [],
  );
  assert.equal(row.otTotal, 2);
  assert.equal(row.otPaid, 2);
  assert.equal(row.sources[0].type, 'request');
});

test('planned + unplanned lanes both accumulate into the same row', () => {
  const [row] = compileSheet(
    [emp('e1')],
    [rec({ plannedHours: 3, otType: 'paid' })],
    [req({ durationH: 2, status: 'approved' })],
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
  );
  assert.equal(employeesWithOT(rows), 1);
});
