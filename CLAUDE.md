# CLAUDE.md — Jisr Overtime Planning

React prototype of the OT **Plan → Approve** lifecycle that posts approved overtime to
**Sheets & Settlements** (payroll), built against the Jisr **Wasl DS** component API.
Payable is computed **inline** — `payable = min(worked, approved)` (PRD-aligned) — and posts straight
to the sheet's Approved-overtime columns; there is no separate reconcile/settle stage. Hours worked
**beyond** an approved plan become a plan-anchored **Overtime beyond plan** item (its own approval).
Do **not** use the term "reconcile/reconciliation" — the behaviour is just `min(worked, approved)`.

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
- The Sheet's Approved-overtime columns are a **live projection** — approving a plan, request or
  beyond-plan excess updates them instantly; each posted value carries its `source` (⚡ provenance dot).
- **Payable is derived, not stored.** `sheet.ts` computes `payableFor` = `min(worked, approved)` and
  `excessFor` = `max(0, worked − approved)` from `record.actualHours`; approved records post payable,
  approved `OvertimeBeyondPlan` posts the excess, pending excess shows as "+Nh excess pending".
- Budget meters are **planner-side only** (Create / Summary / list) — never shown to approvers.

## Key files
- `src/lib/sheet.ts` (posting + `payableFor`/`excessFor`) + `cost.ts` (pricing) + `records.ts` — pure
  engines; tests `*.test.ts`.
- `src/store/index.ts` + `selectors.ts` — plan lifecycle (`approvePlan`/`voidApproval`), request lane,
  beyond-plan lane (`approveBeyondPlan`/`captureBeyondPlan`), `excess` config + derived views.
- `src/pages/*` — one per screen; `PlanCreatePage.tsx` owns the 4-step wizard; `SheetsPage.tsx` the sheet
  (tabs: Summary · Sheet · Pending Requests · Overtime beyond plan · Retroactives).
- `src/components/sheet/*` (SheetTable, ProvenanceDot, PendingRequestsTable, **BeyondPlanTable**,
  SummaryPanel) + `src/components/plan/*` (HoursMatrix, BudgetMeter, PlanTable, …).

## Verify
- `npm test` — sheet posting (payable = min(worked, approved); over-plan caps + excess held; approved
  beyond-plan posts with provenance; pending/rejected don't post), cost (rest-day 2×), records.
- `npm run smoke` — puppeteer drives Plan→Approve (reject-gate + reflection + suppressed chip),
  sheet capping annotations, beyond-plan approve→post, edit-voids-approval, feature gating; console gate.
  Dev server must be running (`npm run dev`).

## Open decisions carried in the build
1. EmployeePicker composed from Input+Item+Tag (shim has no Combobox) — pre-authorised fallback.
2. Added `accent` (violet) + `shift-*` pastel tokens to `tailwind.config.js`.
3. Recurring plans eager-materialise all dates on submit.
4. Unified "Attendance & Leave" nav; Shifts (`/shifts/*`) + Sheets (`/sheets`) are sibling pages.
5. Edit an approved plan → `voidApproval` reverts plan+records to pending → re-review in Approvals.
6. **Not built (PRD open decisions):** committed-vs-budget beyond planner view; past-date gate;
   day-level vs per-shift atomic unit; recurring keep/cut; bulk upload; approval-flow config page.
