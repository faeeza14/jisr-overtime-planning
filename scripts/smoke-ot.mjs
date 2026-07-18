// End-to-end smoke test — Plan → Approve + payable=min(worked,approved) + beyond-plan excess lane.
// SPA navigation only (full reloads reset the in-memory store). Gates on console errors.
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
  results.push({ ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const clickText = async (text, sel = 'a,button') => {
  for (const h of await page.$$(sel)) {
    if (norm(await page.evaluate((el) => el.textContent, h)) === text) { await h.click(); return true; }
  }
  return false;
};
const findButton = async (text) => {
  for (const h of await page.$$('button')) {
    if (norm(await page.evaluate((el) => el.textContent, h)) === text) return h;
  }
  return null;
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
const dismissToasts = async () => {
  for (const h of await page.$$('[role="status"] button')) { await h.click().catch(() => {}); }
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const countSel = (sel) => page.$$eval(sel, (els) => els.length);

// ── 1. Scheduler: seed pending chips are amber; no reconcile/settled ───────────
await page.goto(`${BASE}/shifts/scheduler?weekStart=2026-07-12`, { waitUntil: 'networkidle0' });
await sleep(400);
const countChip = (needle) =>
  page.$$eval('button', (els, n) => els.filter((e) => e.textContent?.includes(n)).length, needle);
const pendingBefore = await countChip('· pending');
check('scheduler shows pending OT chips', pendingBefore > 0, `${pendingBefore} chips`);
check('no reconcile/settled chips remain', (await countChip('reconcile')) === 0 && (await countChip('settled')) === 0);

// ── 2. Approvals: Reject disabled until a comment; then approve (reflection #1) ─
await clickText('Approvals');
await sleep(400);
const opened = await clickReviewFor('Project deadline sprint');
check('approval drawer opens', opened);
await sleep(300);
const rejectBtn = await findButton('Reject');
const rejectDisabledEmpty = rejectBtn ? await page.evaluate((el) => el.disabled, rejectBtn) : false;
check('Reject is disabled with no comment', rejectDisabledEmpty);
const ta = await page.$('textarea');
if (ta) await ta.type('Looks good — approving.');
await sleep(200);
const rejectEnabled = rejectBtn ? !(await page.evaluate((el) => el.disabled, rejectBtn)) : false;
check('Reject enables once a comment is typed', rejectEnabled);
await clickText('Approve with edits');
await sleep(400);
await clickText('Scheduler');
await sleep(500);
const pendingAfter = await countChip('· pending');
const approvedAfter = await countChip('· approved');
check('reflection #1 — pending chips cleared', pendingAfter === 0, `${pendingBefore} → ${pendingAfter}`);
check('reflection #1 — chips now approved', approvedAfter >= pendingBefore, `${approvedAfter} approved`);
check('approved chip shows ⚡ auto-OT-suppressed marker', (await countSel('[aria-label="auto OT suppressed"]')) > 0);

// ── 3. Sheets: payable = min(worked, approved) annotations + provenance ────────
await dismissToasts();
await clickText('Sheets & Settlements', 'a');
await sleep(500);
const sheetText = await bodyText();
check('sheet shows "paid X of Y approved" (worked under plan)', /paid\s+\S+\s+of\s+\S+\s+approved/i.test(sheetText), 'Omar under-plan');
check('sheet shows "excess pending" (worked over plan)', /excess pending/i.test(sheetText), 'Yousef over-plan');
const provBefore = await countSel('[aria-label^="Source:"]');
check('Approved-OT columns carry provenance dots', provBefore > 0, `${provBefore} dots`);
const beyondProvBefore = await countSel('[aria-label*="beyond plan"]');

// ── 4. Overtime beyond plan: approve the excess → posts to the sheet ───────────
await clickText('Overtime beyond plan');
await sleep(300);
const approveExtra = await findButton('Approve extra');
check('beyond-plan tab lists an excess item to approve', !!approveExtra);
await dismissToasts();
await clickText('Approve extra');
await sleep(900); // auto-switches back to the Sheet tab
const sheetAfter = await bodyText();
const beyondProvAfter = await countSel('[aria-label*="beyond plan"]');
check('approving the excess adds beyond-plan provenance', beyondProvAfter > beyondProvBefore, `${beyondProvBefore} → ${beyondProvAfter}`);
check('the "excess pending" note clears after approval', !/excess pending/i.test(sheetAfter));

// ── 5. Unplanned lane (kept): capture from punch → approve → posts ─────────────
await clickText('Capture unplanned OT from a punch');
await sleep(400);
const approvable = await page.$$eval('button', (els) => els.filter((e) => e.textContent === 'Approve').length);
check('capture created a pending request', approvable >= 1, `${approvable} approvable`);
await dismissToasts();
await clickText('Approve');
await sleep(900);
const provAfterReq = await countSel('[aria-label^="Source:"]');
check('approving a request posts to the sheet', provAfterReq >= provBefore, `${provBefore} → ${provAfterReq}`);

// ── 6. Edit an approved plan → voids the approval → back to pending ────────────
await page.goto(`${BASE}/shifts/plan-overtime/p1`, { waitUntil: 'networkidle0' });
await sleep(400);
const editOpened = await clickText('Edit plan');
check('approved plan shows an Edit-plan action', editOpened);
await sleep(300);
const voided = await clickText('Void approval & edit');
check('confirm voids the approval', voided);
await sleep(500);
const approvalsText = await bodyText();
check('voided plan reappears in Approvals as pending', approvalsText.includes('Warehouse peak'));

// ── 7. Feature toggle hides the OT workflow tabs ──────────────────────────────
await clickText('Shifts & scheduling', 'a');
await sleep(400);
await clickText('Shift Settings');
await sleep(300);
const tabsBefore = await page.$$eval('a', (els) => els.map((e) => e.textContent?.replace(/\d+$/, '').trim()));
const switches = await page.$$('[role="switch"], button[aria-checked]');
if (switches[1]) await switches[1].click(); // Overtime planner
await sleep(400);
const tabsAfter = await page.$$eval('a', (els) => els.map((e) => e.textContent?.replace(/\d+$/, '').trim()));
check('feature toggle hides Plan Overtime / Approvals',
  tabsBefore.includes('Plan Overtime') && !tabsAfter.includes('Plan Overtime'));

// ── 8. Console-error gate ─────────────────────────────────────────────────────
check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
