# Jisr · Overtime Planning

A React prototype of centrally-planned, budget-controlled overtime for Jisr's **Attendance & Leave**
module. It implements the lifecycle:

> **Plan → Approve** → posts to **Sheets & Settlements** (payroll)

Reconciliation/settlement is deferred to a fast-follow — the record fields (`actualHours`,
`payableHours`) are retained so it re-adds without a data migration.

Built against the real Jisr **Wasl DS** component API (via the local `@jisr-hr/ds-web` shim in
`src/ds/`), Onest type, and Wasl DS tokens. Reference spec: the build brief in
`docs/` / the interaction prototype it was ported from.

## Screens

Screens live under a unified **Attendance & Leave** nav (Attendance Tracker · Shifts & scheduling ·
Leave Tracker · Sheets & Settlements).

| Screen | What it does |
|---|---|
| **Scheduler** | Weekly roster grid; each `OvertimeRecord` reflects as a status-coloured chip (draft/pending/approved). |
| **Plan Overtime** | Plans index (stats + budget meter + table) and a full-page **4-step create flow** (Details → Employees → Hours & cost → Review). |
| **Approvals** | Inbox of pending OT plans; edit-in-place review drawer, approve-with-edits or reject-with-comment (no send-back). |
| **Shift Settings** | Feature toggles, read-only OT pricing, per-cost-centre budgets, go-live rules, approval cycles. |
| **Sheets & Settlements** | The payroll destination. Monthly sheet with an **Approved overtime** column group (Total / Paid / TOIL) fed live from approved plans + approved requests, each with a ⚡ provenance dot. Plus a **Pending Requests** tab (the unplanned OT lane) and a "Capture unplanned OT from a punch" demo. |

## Cross-surface behaviour (shared records, no event bus)

1. **Approve a plan** → its records flip `pending → approved` → Scheduler chips go amber → violet.
2. **Approved OT posts to the sheet** → approved plans + approved requests fill the Approved-overtime
   columns live, each cell carrying its `source` provenance.
3. **Approve an unplanned request** → posts its hours (as paid) to that employee's sheet columns.

## Architecture

- **Vite + React 19 + TypeScript + Tailwind + Zustand + react-router v7.**
- `src/ds/` — DS shim mirroring `@jisr-hr/ds-web` (aliased in `vite.config.ts`). Wasl DS tokens live
  in `tailwind.config.js`; Onest loads in `src/index.css`.
- `src/lib/sheet.ts` + `cost.ts` — **pure, unit-tested** engines: sheet posting (approved records +
  requests → Total/Paid/TOIL with provenance) and OT pricing. Multipliers are **read from the OT
  policy object, never hardcoded**.
- `src/store/index.ts` — single Zustand store; records normalised into a map so a status change on one
  record reflects across every surface. `src/store/selectors.ts` holds derived views.
- `src/types.ts` — domain model (`OvertimePlan`, `OvertimeRecord`, `OvertimeRequest`, `OTPolicy`).
  Reconciliation is deferred: `actualHours`/`payableHours` are retained for a no-migration re-add.

## Develop

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # sheet-posting + cost + records unit tests (node --test)
npm run smoke     # puppeteer end-to-end lifecycle + reflection checks (dev server must be running)
npm run build
```

## Notes

- The real `@jisr-hr/ds-web` package (in the private `jisr-hr` monorepo) is not publicly installable,
  so this app builds against the local DS shim that mirrors its API and Figma-traced tokens.
- The whole OT workflow (Plan Overtime + Approvals tabs) is gated behind the Shift Settings
  "Overtime planner" toggle.
