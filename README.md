# Jisr · Overtime Planning

A React prototype of centrally-planned overtime for Jisr's **Attendance & Leave** module. It
implements the lifecycle:

> **Plan → Approve** → posts to **Sheets & Settlements** (payroll)

Payable is computed **inline** — `payable = min(worked, approved)` — and posts straight to the sheet's
Approved-overtime columns, capped to the hours actually worked (PRD-aligned; no separate reconcile
stage). Hours worked **beyond** an approved plan become a plan-anchored **Overtime beyond plan** item
raised for its own approval.

Built against the real Jisr **Wasl DS** component API (via the local `@jisr-hr/ds-web` shim in
`src/ds/`), Onest type, and Wasl DS tokens. Reference spec: the Planned OT PRD + the interaction
prototype it was ported from.

## Screens

Screens live under a unified **Attendance & Leave** nav (Attendance Tracker · Shifts & scheduling ·
Leave Tracker · Sheets & Settlements).

| Screen | What it does |
|---|---|
| **Scheduler** | Weekly roster grid; each `OvertimeRecord` reflects as a status-coloured chip (draft/pending/approved). |
| **Plan Overtime** | Plans index (stats + budget meter + table) and a full-page **4-step create flow** (Details → Employees → Hours & cost → Review). |
| **Approvals** | Inbox of pending OT plans (no budget shown to approvers); edit-in-place review drawer, approve-with-edits or **reject-with-comment** (disabled until a comment is entered; no send-back). |
| **Shift Settings** | Feature toggles (incl. *Capture overtime beyond plan*), read-only OT pricing (cap **not enforced** this release; TOIL → leave), **Excess handling** card (mode · tolerance buffer · inherits comp type · counts toward caps), go-live rules, approval cycles. |
| **Sheets & Settlements** | The payroll destination. Monthly sheet with an **Approved overtime** group (Total / Paid / TOIL) showing **payable = min(worked, approved)** — "paid Xh of Yh approved" when under plan, "+Nh excess pending" when over — each value carrying a ⚡ provenance dot. Tabs: **Pending Requests** (generic unplanned lane) and **Overtime beyond plan** (plan-anchored excess: Approve extra / Reject to cap). |

## Cross-surface behaviour (shared records, no event bus)

1. **Approve a plan** → its records flip `pending → approved` → Scheduler chips go amber → violet
   (a chip that overrides automatic OT that day shows a ⚡ "auto OT suppressed" marker).
2. **Payable posts to the sheet** → approved records post `min(worked, approved)`; approved requests
   and approved beyond-plan excess post too, each cell carrying its `source` provenance.
3. **Approve overtime beyond plan** → the excess over the approved plan posts to that employee's columns.
4. **Edit an approved plan** → voids the approval (plan + records revert to Pending) for re-approval.

## Architecture

- **Vite + React 19 + TypeScript + Tailwind + Zustand + react-router v7.**
- `src/ds/` — DS shim mirroring `@jisr-hr/ds-web` (aliased in `vite.config.ts`). Wasl DS tokens live
  in `tailwind.config.js`; Onest loads in `src/index.css`.
- `src/lib/sheet.ts` + `cost.ts` — **pure, unit-tested** engines: sheet posting with
  `payableFor` = `min(worked, approved)` / `excessFor`, and OT pricing. Multipliers are **read from the
  OT policy object, never hardcoded**.
- `src/store/index.ts` — single Zustand store; records normalised into a map so a status change on one
  record reflects across every surface. `src/store/selectors.ts` holds derived views.
- `src/types.ts` — domain model (`OvertimePlan`, `OvertimeRecord`, `OvertimeRequest`,
  `OvertimeBeyondPlan`, `OTPolicy`, `ExcessConfig`). `actualHours` is the attendance input; payable and
  excess are derived inline in `sheet.ts`.

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
