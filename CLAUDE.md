# CLAUDE.md — Jisr Overtime Planning

React prototype of the OT **Plan → Approve** lifecycle that posts approved overtime to
**Sheets & Settlements** (payroll), built against the Jisr **Wasl DS** component API.
Reconciliation/settlement is deferred — the `actualHours`/`payableHours` record fields are retained
so it re-adds without a data migration.

## Stack
- Vite + React 19 + TypeScript + Tailwind 3.4 + Zustand 5 + react-router-dom 7.
- DS: `import { X } from '@jisr-hr/ds-web'` → Vite alias to `src/ds/` (local shim mirroring the real
  package; the real `jisr-hr/jisr-frontend-monorepo` is private/inaccessible).
- **Figma DS file:** `dENVT3cpolQRwvDxU35Jvs` (Wasl DS). Tokens live in `tailwind.config.js`.

## Conventions (locked)
- **Tokens only.** No raw hex / hardcoded px for colour, spacing, radius, type — use the Tailwind
  theme tokens (`app.ink`, `danger/warn/ok/info`, `accent` = violet OT emphasis, `shift-*` pastels).
- **OT rates are read from the `OTPolicy` object**, never hardcoded (guards the legacy hardcoded-rate
  bug). See `src/lib/cost.ts`.
- **Records are the atomic unit** (one per employee × date), normalised into a map in the store so a
  status change reflects across Scheduler / Approvals / Sheets with no event bus.
- Status colours: draft=grey · pending=amber · approved=blue(info)/violet chip · rejected=red.
- The Sheet's Approved-overtime columns are a **live projection** — approving a plan or request
  updates them instantly; each posted value carries its `source` (⚡ provenance dot).

## Key files
- `src/lib/sheet.ts` (posting) + `cost.ts` (pricing) + `records.ts` — pure engines; tests `*.test.ts`.
- `src/store/index.ts` + `selectors.ts` — plan lifecycle + request-lane actions + derived views.
- `src/pages/*` — one per screen; `PlanCreatePage.tsx` owns the 4-step wizard; `SheetsPage.tsx` the sheet.
- `src/components/plan/*` (HoursMatrix, EmployeePicker, Stepper, BudgetMeter, PlanTable) +
  `src/components/sheet/*` (SheetTable, ProvenanceDot, PendingRequestsTable, SummaryPanel).

## Verify
- `npm test` — sheet posting (approved records + requests → Total/Paid/TOIL + provenance; pending/
  rejected don't post), cost (rest-day 2×, policy-driven rates), records.
- `npm run smoke` — puppeteer drives Plan→Approve (reflection #1) + capture→approve request → sheet
  posting; gates on console errors. Dev server must be running (`npm run dev`).

## Open decisions carried in the build
1. EmployeePicker composed from Input+Item+Tag (shim has no Combobox) — pre-authorised fallback.
2. Added `accent` (violet) + `shift-*` pastel tokens to `tailwind.config.js`.
3. Recurring plans eager-materialise all dates on submit.
4. Reconciliation deferred; data fields retained for a no-migration re-add.
5. Unified "Attendance & Leave" nav; Shifts (`/shifts/*`) + Sheets (`/sheets`) are sibling pages.
