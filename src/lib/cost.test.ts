// Cost/pricing — unit tests (rates read from policy, never hardcoded). Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cost, multiplierFor } from './cost.ts';
import type { OTPolicy } from '../types.ts';

const policy: OTPolicy = {
  id: 'pol',
  normalMultiplier: 1.5,
  restMultiplier: 2.0,
  weeklyCapSoft: 60,
  goLiveDate: '2026-01-01',
  budgets: [],
};

test('rest-day pricing is 2× and normal is 1.5×', () => {
  assert.equal(cost(4, 50, 'normal', policy), 4 * 50 * 1.5); // 300
  assert.equal(cost(4, 50, 'rest', policy), 4 * 50 * 2.0); // 400
  assert.equal(multiplierFor('normal', policy), 1.5);
  assert.equal(multiplierFor('rest', policy), 2.0);
});

test('multipliers are read from the policy — mutating it changes output (no hardcoded rates)', () => {
  const custom: OTPolicy = { ...policy, normalMultiplier: 1.25, restMultiplier: 1.75 };
  assert.equal(cost(4, 50, 'normal', custom), 4 * 50 * 1.25); // 250
  assert.equal(cost(4, 50, 'rest', custom), 4 * 50 * 1.75); // 350
});
