# CLAUDE.md — Jisr Overtime Planning & Reconciliation

React prototype of the OT Plan → Approve → Reconcile → Settle lifecycle, built against the Jisr
**Wasl DS** component API.

## Stack
- Vite + React 19 + TypeScript + Tailwind 3.4 + Zustand 5 + react-router-dom 7.
- DS: `import { X } from '@jisr-hr/ds-web'` → Vite alias to `src/ds/` (local shim mirroring the real
  package; the real `jisr-hr/jisr-frontend-monorepo` is private/inaccessible).
- **Figma DS file:** `dENVT3cpolQRwvDxU35Jvs` (Wasl DS). Tokens live in `tailwind.config.js`.

## Conventions (locked)
- **Tokens only.** No raw hex / hardcoded px for colour, spacing, radius, type — use the Tailwind
  theme tokens (`app.ink`, `danger/warn/ok/info`, `accent` = violet OT emphasis, `shift-*` pastels).
- **OT rates are read from the `OTPolicy` object**, never hardcoded (guards the legacy hardcoded-rate
  bug). See `src/lib/cost.ts` / `reconcile.ts`.
- **Records are the atomic unit** (one per employee × date), normalised into a map in the store so
  status changes reflect across Scheduler / Approvals / Reconciliation with no event bus.
- Status colours (brief §4.3): draft=grey · pending=amber · approved=blue(info) · reconciling=violet ·
  settled=green · rejected=red. Scheduler chips (brief §6) use violet for approved+reconcile.

## Key files
- `src/lib/reconcile.ts` + `cost.ts` + `records.ts` — pure engine; tests in `*.test.ts` (`npm test`).
- `src/store/index.ts` + `selectors.ts` — lifecycle actions + derived views.
- `src/pages/*` — one per screen; `PlanCreatePage.tsx` owns the 4-step wizard.
- `src/components/plan/*` — HoursMatrix, EmployeePicker, Stepper, BudgetMeter, PlanTable, etc.

## Verify
- `npm test` — reconciliation math (match/short/excess, rest-day 2×, policy-driven rates).
- `npm run smoke` — puppeteer drives the full lifecycle + the three cross-surface reflections; gates
  on console errors. Dev server must be running (`npm run dev`).

## Open decisions carried in the build
1. EmployeePicker composed from Input+Item+Tag (shim has no Combobox) — pre-authorised fallback.
2. Added `accent` (violet) + `shift-*` pastel tokens to `tailwind.config.js` for OT emphasis / roster.
3. Recurring plans eager-materialise all dates on submit.
4. Reconciliation gated behind the Shift Settings toggle.
