// Pricing helpers — pure, no React/store imports.
// Multipliers are READ from the OTPolicy object (brief §4.4/§15) — never hardcoded here.
// This is what prevents the hardcoded-rate bug the legacy bulk template had.

import type { DayType, OTPolicy } from '../types';

export const multiplierFor = (dayType: DayType, policy: OTPolicy): number =>
  dayType === 'rest' ? policy.restMultiplier : policy.normalMultiplier;

/** Cost of OT hours: hours × baseRate × dayType multiplier (brief §5). */
export const cost = (
  hours: number,
  baseRate: number,
  dayType: DayType,
  policy: OTPolicy,
): number => hours * baseRate * multiplierFor(dayType, policy);
