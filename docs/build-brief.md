# Jisr — Overtime Planning & Reconciliation · Web Build Brief

**Feature:** Centrally-planned, budget-controlled overtime for the Attendance & Leave module, living inside **Shifts & Scheduling**.
**Purpose of this doc:** a self-contained spec for building the web feature (reference implementation: `jisr-plan-ot.html`). Build in **React** to match the real Jisr frontend.
**Status:** design review build. Items in **§13 Open questions** are not yet locked with the PM.

---

## 1. Context & goal

The current OT model relies on individual employee requests, which doesn't fit clients whose overtime is **centrally planned, budget-controlled, and managed by supervisors/HR**. There's also no structured link between pre-approved OT, actual attendance, and payroll.

The feature closes that loop as a four-stage lifecycle:

> **Plan → Approve → Reconcile → Settle**

- **Plan** — a manager/supervisor bulk pre-plans OT for people/dates, priced against budget.
- **Approve** — Finance/Top-management approve/reject/modify in place (no send-back).
- **Reconcile** — after the work, approved OT is compared to actual attendance.
- **Settle** — the payable amount is pushed to payroll; the period locks.

The individual OT request flow is **retained** as the *exception lane* for unplanned overtime and for excess above approved.

---

## 2. Where it lives (IA)

Shifts & Scheduling today has two tabs: `Scheduler` · `Shift Settings`. This feature **extends the tab strip**:

```
Scheduler · Plan Overtime · Approvals · Reconciliation · Shift Settings
```

- **Plan Overtime** is a **list of plans** (index), not a wizard. A `＋ New overtime plan` button opens a **full-page create flow**. Existing plans open from the list (draft → builder; approved+ → read-only summary).
- **Approvals** / **Reconciliation** are inbox-style surfaces.
- Global chrome unchanged: company switcher top-left, collapsed icon rail, sticky header.

---

## 3. Design system (match production)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#101010` | text, **primary buttons** |
| `--ink-2` | `#5F636B` | secondary text |
| `--ink-3` | `#9298A1` | tertiary/muted |
| `--ink-4` | `#BCC0C6` | disabled / dashed borders |
| `--bg` | `#FFFFFF` | surfaces |
| `--canvas` | `#F7F8FA` | page/field backgrounds |
| `--line` / `--line-2` | `#E7E9ED` / `#F0F1F4` | borders |
| `--accent` | `#4783FC` | used sparingly (links, "approved" status) |
| `--amber` bg/ink | `#FFF7EA` / `#8A5A00` | pending / warnings |
| `--green` bg/ink | `#EAF8F1` / `#0F7A52` | settled / success |
| `--red` bg/ink | `#FDEDED` / `#B02328` | rejected / excess |
| `--violet` bg/ink | `#F1EEFE` / `#4E36B8` | reconciling / OT emphasis |

- **Font:** Onest (300–800).
- **Radii:** 8px (controls), 12px (cards), 16px (large cards).
- **Buttons:** primary = solid `--ink` (black). Secondary = white + `--line` border. **Blue is not a primary button colour in Jisr.**
- **Shift-block pastels (scheduler):** lavender `#EDE9F6`, peach `#FDECD9`, pink `#FBDCE4`.

---

## 4. Data model

### 4.1 OvertimePlan
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | e.g. "Warehouse peak · Q3" |
| `reason` | enum | `peak_demand` · `coverage_gap` · `project_deadline` · `emergency` · `other` |
| `type` | enum | `range` · `oneoff` · `recurring` |
| `period` | object | `range`: {start,end}; `oneoff`: {date}; `recurring`: {weekdays[], until} |
| `costCentreId` | string | resolves budget + base rates |
| `note` | string? | free text for approver |
| `status` | enum | see §4.3 |
| `records` | OvertimeRecord[] | generated on submit |

### 4.2 OvertimeRecord — **the atomic unit: one per employee, per shift, per date**
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `planId` | string | parent |
| `employeeId` | string | |
| `date` | date | |
| `shiftId` | string? | the shift it rides on (or null = OT with no shift) |
| `dayType` | enum | `normal` · `rest` (Fri/Sat) → drives multiplier |
| `otType` | enum | `paid` · `toil` (set at plan time) |
| `plannedHours` | number | |
| `actualHours` | number? | filled from attendance after the period |
| `baseRate` | number | employee hourly rate |
| `status` | enum | mirrors/derives from plan + reconciliation |
| `payableHours` | number? | computed at reconcile (§7.2) |

> Bulk selection (group/branch/job title/filter) resolves to a set of employees, then generates **individual records** so each can be approved, reconciled and paid on its own while tracing back to `planId`.

### 4.3 Status lifecycle
`draft → pending → approved → reconciling → settled` (+ `rejected` at approval).
Per-record after reconcile: `match` · `short` · `excess`.

| Status | Pill colour |
|---|---|
| Draft | grey |
| Pending approval | amber |
| Approved | blue (`--accent`) |
| Reconciling | violet |
| Settled | green |
| Rejected | red |

### 4.4 OTPolicy (source of truth for rates — from the OT policy engine)
`{ normalMultiplier: 1.5, restMultiplier: 2.0, weeklyCapSoft: 60, goLiveDate, budgets: [{costCentreId, amount, committed}] }`

Rates are **read**, never redefined here — planner and payroll both consume them (this is what prevents the hardcoded-rate bug the bulk template has).

---

## 5. Business rules

- **Cost:** `hours × baseRate × (dayType === 'rest' ? restMultiplier : normalMultiplier)`.
- **Planned vs automatic OT:** planned OT **overrides** automatic shift overtime on the same day.
- **Eligibility (go-live / older dates):** a period is plannable only if `date >= goLiveDate` **AND** its timesheet is not yet submitted. Dates before go-live stay on individual OT requests. After a payroll run the period is **locked** — extra hours need a separate request.
- **Weekly cap:** soft warning at `weeklyCapSoft` (60h) — never a submit blocker.
- **Paid vs TOIL:** set at plan time, per record; they integrate with payroll differently.
- **Approver edits:** approvers may change hours/employees/dates **in place**; log each change as a delta for audit.

---

## 6. Screen: Scheduler (reflection surface)

Weekly grid matching production: `Employees (N) ▾` header; per row = avatar + name + role-number + 🕐 hours; day columns `Sunday 12 … Saturday 18`; pastel shift blocks (time + location); dashed **Leave / Annual** cells; grey **Day Off**; **Ends in next day** pill on overnight shifts; bottom status bar (`Unpublished · Unavailable · Unscheduled · Conflicts`).

**OT reflection (the key integration):** each `OvertimeRecord` renders as a status-coloured chip on its shift/day:

| Record status | Chip | Label |
|---|---|---|
| draft | grey dashed | `+Xh · draft` |
| pending | amber | `+Xh · pending` |
| approved | violet | `+Xh · approved` |
| reconcile (worked, pre-settle) | violet | `+Xh · to reconcile` |
| settled | green + lock | `+planned→actual · paid 🔒` |

- Legend in the toolbar. Clicking a chip opens its owning plan.
- Week nav (`← / →`) changes the week; pre-work weeks show draft/pending/approved, past weeks show reconcile/settled.

---

## 7. Screen: Plan Overtime (list) + create flow

### 7.1 List (index)
- **Stat strip:** Active plans · Pending approval · Planned hours (month) · Committed vs budget (with meter).
- **Toolbar:** search · status filter chips (All/Draft/Pending/Approved/Reconciling/Settled) · `＋ New overtime plan` (primary).
- **Table columns:** Plan (name + reason) · Type (📆 range / 📌 one-off / 🔁 recurring) · Period · Employees (avatar stack) · Planned (h) · Est. cost · Status pill.
- **Row click:** draft → open builder; approved+ → read-only summary.

### 7.2 Create flow — full-page pattern
Breadcrumb chips (`Shifts & Scheduling › Plan Overtime › [name]`) + back arrow → 4-step **stepper** (checkmarks on completed) → **sticky bottom bar**: `Back` / `Save as draft` / `Next` (→ `Submit for approval` on step 4).

**Step 1 — Details:** name; **plan type** cards (range/one-off/recurring — each reshapes the period picker: range = start→end; one-off = single date; recurring = weekday toggles + until-date, generating a record set per week); reason; cost centre/budget; note.

**Step 2 — Employees:** Jisr selection pattern — target-by segmented (Employees/Group/Branch/Job title); search; Filters; `X of Y added` count; `＋ Add all`; `Show only added`; rows = avatar + name + role + dept#, Add/Remove; warning icon for conflict (already planned) / assigned-to-other-method.

**Step 3 — Hours, type & cost:** per-employee × per-day matrix (rest-day columns tinted + `2×` label; normal `1.5×`); per-cell hours input; live per-row cost + grand total; quick-fill (Xh → whole period / weekdays / rest days, everyone/one); per-row Paid/TOIL; validation in cells — **on-leave** locked, **over-cap** amber flag, **conflict** red flag. One-off type collapses to a single column.

**Step 4 — Review:** plan summary (name/type/period/reason/employees/records/paid-TOIL split) + **budget impact** card (budget, committed, this plan, remaining, meter — amber >85%, red >100%). Submit → enters approval cycle.

---

## 8. Screen: Approvals (pre-work)

Inbox of pending items — OT plans **and** shift schedules, each on its own cycle. Row = icon + title + meta + step pill + `Review`.

**OT plan review (drawer):** violet banner (approve against budget, edit-in-place, no send-back); submitted-by / step / reason; **budget check** card; per-employee hours matrix (editable); comment (required to reject); `Reject` / `Approve with edits`.

**Shift schedule review (drawer):** period/employees/shifts/coverage/step; **"Overtime riding on these shifts"** list with per-record OT status — plus explicit copy that approving the schedule does **not** approve the OT. Actions: `Reject` / `Approve` / `Approve & publish`.

---

## 9. Screen: Reconciliation (post-work)

Segmented: **Ready to reconcile** · **Excess approvals** · **Settled**.

**Ready list:** each approved period whose attendance is in → row shows approved h, actual h, excess flag → `Reconcile`.

**Reconcile drawer — per employee, per day:** `Approved | Actual | Payable | Outcome`, applying:

| Condition | Payable | Outcome |
|---|---|---|
| `actual === approved` | approved | **Match** |
| `actual < approved` | actual | **Short — pay actual** |
| `actual > approved` | approved (capped) | **Excess — cap + approve extra** |

Rollup: Approved / Actual / Payable / Excess held + payroll amount. **Settle** pushes the capped amount to payroll and **locks** the period (scheduler chips → settled). Excess (`actual − approved`) is peeled into the **Excess approvals** lane = the retained individual-request path (`Approve extra` → adds to payroll; `Reject` → caps at approved).

---

## 10. Screen: Shift Settings

Existing shift config **plus**:
- **Feature toggles:** Shift schedule approval · Overtime planner · Attendance reconciliation (off → workflow hidden, shifts publish directly).
- **OT pricing & budget:** normal 1.5× / rest 2.0× (read-only, from policy engine) · OT budget per cost centre · weekly soft cap.
- **Go-live & older dates:** go-live date · pre-go-live → individual requests · ongoing rule (plannable until timesheet submitted) · post-payroll lock.
- **Approval cycles:** OT plans = Finance → Top management; shift schedules = Operations manager. Sequential; edit-in-place.

---

## 11. Cross-surface reflections (must-build — proves shared records)

1. **Approve OT plan** (Approvals) → its records flip `pending → approved` → Scheduler chips go amber → violet.
2. **Settle a period** (Reconciliation) → records `→ settled` → Scheduler chips for that week lock and show `planned→actual`.
3. **Approve/reject excess** → updates payable; nothing changes on already-settled base records.

---

## 12. Component inventory (reusable)

`StatusPill` · `OTChip` (status-aware) · `HoursMatrix` (editable, day-typed, validated) · `Stepper` · `BreadcrumbChips` · `StickyActionBar` · `Drawer` · `BudgetMeter` · `EmployeePicker` (target-by + rows) · `PlanTable` · `SchedulerGrid` · `SegmentedControl`.

---

## 13. Open questions (confirm with PM before/at handoff)

1. **Reconciliation in R1 or fast-follow?** Plan+approve can ship first with reconciliation behind the settings toggle.
2. **Recurring plan record generation** — eagerly materialise all weeks on submit, or lazily per week?
3. **Excess lane placement** — Reconciliation only, or also surfaced in Approvals where approvers work?
4. **Go-live cutover date** + confirmation that older/legacy OT stays on individual requests.
5. **Attendance source & timing** — where `actualHours` reads from, and recalculation rule if a punch correction lands after reconcile.
6. **Bulk mapping across a range** — confirmed as the per-day matrix (resolves the old Date-Range gap); confirm for recurring.

---

## 14. Out of scope (separate backlog items — don't build here)

- Fixing the bulk OT template (backend-only, hardcoded-rate fix).
- Automatic OT on off-days (separate epic; interacts via the "planned overrides automatic" rule).
- Mobile app surfaces (separate brief).
- Shift scheduling on mobile / capacity planning.

---

## 15. Build notes

- Reference prototype: `jisr-plan-ot.html` (interaction + copy source of truth).
- Match the **collapsed icon rail + company switcher** chrome and the **black-primary** button system.
- Font: load **Onest**; fall back to system sans if offline.
- Keep rates coming from the **OT policy engine** — never hardcode 1.5×/2×.
- Reconciliation math is unit-testable: assert `match/short/excess` payable outcomes and rest-day (2×) pricing.
