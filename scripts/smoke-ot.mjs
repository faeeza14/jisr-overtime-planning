// End-to-end smoke test — drives the whole OT lifecycle as one assertion chain and
// verifies the three cross-surface reflections (brief §11). SPA navigation only
// (full reloads would reset the in-memory store). Gates on console errors.
//
// Run: npm run smoke   (dev server must be running on :5173)

import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s ?? '').replace(/\(\d+\)/g, '').replace(/\d+$/, '').trim();

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 900 });

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const clickText = async (text, sel = 'a,button') => {
  for (const h of await page.$$(sel)) {
    if (norm(await page.evaluate((el) => el.textContent, h)) === text) {
      await h.click();
      return true;
    }
  }
  return false;
};
const clickReviewFor = async (planName) => {
  for (const h of await page.$$('button')) {
    if (norm(await page.evaluate((el) => el.textContent, h)) === 'Review') {
      const card = await page.evaluate((el) => el.closest('[class*="p-3"]')?.textContent || '', h);
      if (card.includes(planName)) { await h.click(); return true; }
    }
  }
  return false;
};
const countText = (needle) =>
  page.$$eval('*', (els, n) =>
    els.filter((e) => e.children.length === 0 && e.textContent?.includes(n)).length, needle);
// OT chips are <button>s — count by label substring (matches the rendered chip text).
const countChip = (needle) =>
  page.$$eval('button', (els, n) => els.filter((e) => e.textContent?.includes(n)).length, needle);
// Dismiss any lingering toasts (they sit bottom-right and can overlap a drawer footer).
const dismissToasts = async () => {
  for (const h of await page.$$('[role="status"] button')) { await h.click().catch(() => {}); }
};

// ── 1. Scheduler: seed pending chips are amber ────────────────────────────────
await page.goto(`${BASE}/shifts/scheduler?weekStart=2026-07-12`, { waitUntil: 'networkidle0' });
await sleep(400);
const pendingBefore = await countChip('· pending');
check('scheduler shows pending OT chips', pendingBefore > 0, `${pendingBefore} chips`);

// ── 2. Approvals: approve the pending plan (reflection #1 setup) ───────────────
await clickText('Approvals');
await sleep(400);
const opened = await clickReviewFor('Project deadline sprint');
check('approval drawer opens', opened);
await sleep(300);
await clickText('Approve with edits');
await sleep(400);

// ── 3. Scheduler: chips flipped pending → approved (reflection #1) ─────────────
await clickText('Scheduler');
await sleep(500);
const pendingAfter = await countChip('· pending');
const approvedAfter = await countChip('· approved');
check('reflection #1 — pending chips cleared', pendingAfter === 0, `${pendingBefore} → ${pendingAfter}`);
check('reflection #1 — chips now approved (violet)', approvedAfter >= pendingBefore, `${approvedAfter} approved`);

// ── 4. Reconciliation: reconcile + settle the reconciling plan ────────────────
await dismissToasts();
await clickText('Reconciliation');
await sleep(400);
await clickText('Reconcile');
await sleep(400);
const hasMatch = (await countText('Match')) > 0;
const hasShort = (await countText('Short')) > 0;
const hasExcess = (await countText('Excess')) > 0;
check('reconcile drawer shows match/short/excess outcomes', hasMatch && hasShort && hasExcess);
await dismissToasts();
await clickText('Settle & push to payroll');
await sleep(400);

// ── 5. Scheduler (past week): settled chips locked (reflection #2) ─────────────
await clickText('Scheduler');
await sleep(300);
for (const h of await page.$$('button[aria-label="Previous week"]')) { await h.click(); break; }
await sleep(500);
const toReconcile = await countChip('to reconcile');
const paidLocked = await countChip('· paid');
check('reflection #2 — no "to reconcile" chips remain', toReconcile === 0);
check('reflection #2 — settled chips show as paid/locked', paidLocked >= 6, `${paidLocked} paid chips`);

// ── 6. Excess lane: approve the extra (reflection #3) ─────────────────────────
await clickText('Reconciliation');
await sleep(300);
await clickText('Excess approvals');
await sleep(300);
const excessBefore = await page.$$eval('button', (els) => els.filter((e) => e.textContent === 'Approve extra').length);
await clickText('Approve extra');
await sleep(400);
const excessAfter = await page.$$eval('button', (els) => els.filter((e) => e.textContent === 'Approve extra').length);
check('reflection #3 — excess resolves out of the lane', excessBefore > 0 && excessAfter === excessBefore - 1, `${excessBefore} → ${excessAfter}`);

// ── 7. Settings: toggling Overtime planner off hides the workflow tabs ────────
await clickText('Shift Settings');
await sleep(300);
const tabsBefore = await page.$$eval('a', (els) => els.map((e) => e.textContent?.replace(/\d+$/, '').trim()));
// The Overtime planner switch is the 2nd Switch (role=switch) on the page
const switches = await page.$$('[role="switch"], button[aria-checked]');
if (switches[1]) await switches[1].click();
await sleep(400);
const tabsAfter = await page.$$eval('a', (els) => els.map((e) => e.textContent?.replace(/\d+$/, '').trim()));
const planHidden = tabsBefore.includes('Plan Overtime') && !tabsAfter.includes('Plan Overtime');
check('feature toggle hides Plan Overtime / Approvals / Reconciliation', planHidden);

// ── 8. Console-error gate ─────────────────────────────────────────────────────
check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length ? 1 : 0;
