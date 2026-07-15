# Jisr · Overtime Planning & Reconciliation

A React prototype of centrally-planned, budget-controlled overtime for Jisr's Attendance & Leave
module, living inside **Shifts & Scheduling**. It implements the full four-stage lifecycle:

> **Plan → Approve → Reconcile → Settle**

Built against the real Jisr **Wasl DS** component API (via the local `@jisr-hr/ds-web` shim in
`src/ds/`), Onest type, and Wasl DS tokens. Reference spec: the build brief in
`docs/` / the interaction prototype it was ported from.

## Screens

| Tab | What it does |
|---|---|
| **Scheduler** | Weekly roster grid; each `OvertimeRecord` reflects as a status-coloured chip on its day (the reflection surface). |
| **Plan Overtime** | Plans index (stats + budget meter + table) and a full-page **4-step create flow** (Details → Employees → Hours & cost → Review). |
| **Approvals** | Inbox of pending OT plans; edit-in-place review drawer, approve-with-edits or reject-with-comment (no send-back). |
| **Reconciliation** | Ready / Excess / Settled. Reconcile drawer compares approved vs actual → payable + outcome, then settles to payroll. |
| **Shift Settings** | Feature toggles, read-only OT pricing, per-cost-centre budgets, go-live rules, approval cycles. |

## Cross-surface reflections (shared records, no event bus)

1. **Approve a plan** → its records flip `pending → approved` → Scheduler chips go amber → violet.
2. **Settle a period** → records `→ settled` → Scheduler chips lock and show `planned→actual · paid 🔒`.
3. **Approve/reject excess** → updates only the payable; settled base records are untouched.

## Architecture

- **Vite + React 19 + TypeScript + Tailwind + Zustand + react-router v7.**
- `src/ds/` — DS shim mirroring `@jisr-hr/ds-web` (aliased in `vite.config.ts`). Wasl DS tokens live
  in `tailwind.config.js`; Onest loads in `src/index.css`.
- `src/lib/reconcile.ts` + `cost.ts` — **pure, unit-tested** reconciliation engine (match/short/excess,
  rest-day 2× pricing). Multipliers are **read from the OT policy object, never hardcoded**.
- `src/store/index.ts` — single Zustand store; records normalised into a map so a status change on one
  record reflects across every surface. `src/store/selectors.ts` holds derived views.
- `src/types.ts` — domain model (`OvertimePlan`, `OvertimeRecord`, `OTPolicy`).

## Develop

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # reconciliation + records unit tests (node --test)
npm run smoke     # puppeteer end-to-end lifecycle + reflection checks (dev server must be running)
npm run build
```

## Notes

- The real `@jisr-hr/ds-web` package (in the private `jisr-hr` monorepo) is not publicly installable,
  so this app builds against the local DS shim that mirrors its API and Figma-traced tokens.
- Reconciliation is gated behind the Shift Settings "Attendance reconciliation" toggle; the whole OT
  workflow is gated behind "Overtime planner".
