// Period expansion + record generation tests.
// Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datesForPeriod, dayTypeForDate, buildRecords } from './records.ts';
import type { Employee } from '../types.ts';

test('range period expands inclusive of both ends', () => {
  const dates = datesForPeriod({ kind: 'range', start: '2026-07-06', end: '2026-07-09' });
  assert.deepEqual(dates, ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09']);
});

test('oneoff period is a single date', () => {
  assert.deepEqual(datesForPeriod({ kind: 'oneoff', date: '2026-07-06' }), ['2026-07-06']);
});

test('recurring period materialises matching weekdays until the end date', () => {
  // Sundays (0) and Tuesdays (2) between Jul 5 (Sun) and Jul 15 (Wed) 2026
  const dates = datesForPeriod({
    kind: 'recurring',
    start: '2026-07-05',
    until: '2026-07-15',
    weekdays: [0, 2],
  });
  assert.deepEqual(dates, ['2026-07-05', '2026-07-07', '2026-07-12', '2026-07-14']);
});

test('dayTypeForDate flags Fri/Sat as rest', () => {
  assert.equal(dayTypeForDate('2026-07-10'), 'rest'); // Friday
  assert.equal(dayTypeForDate('2026-07-11'), 'rest'); // Saturday
  assert.equal(dayTypeForDate('2026-07-06'), 'normal'); // Monday
});

test('buildRecords creates one record per employee × date, skipping zero hours', () => {
  const employees: Employee[] = [
    {
      id: 'e1',
      name: 'A B',
      role: 'Picker',
      roleNumber: '001',
      groupId: 'g1',
      branchId: 'b1',
      costCentreId: 'cc1',
      baseRate: 50,
    },
  ];
  const records = buildRecords(
    'plan-1',
    [
      {
        employeeId: 'e1',
        otType: 'paid',
        hoursByDate: { '2026-07-06': 3, '2026-07-10': 4, '2026-07-07': 0 },
      },
    ],
    employees,
  );
  assert.equal(records.length, 2); // zero-hour day skipped
  const normal = records.find((r) => r.date === '2026-07-06')!;
  assert.equal(normal.dayType, 'normal');
  assert.equal(normal.plannedHours, 3);
  assert.equal(normal.baseRate, 50);
  assert.equal(normal.status, 'draft');
  const rest = records.find((r) => r.date === '2026-07-10')!;
  assert.equal(rest.dayType, 'rest');
});
