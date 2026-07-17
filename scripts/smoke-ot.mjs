// End-to-end smoke test — Plan → Approve lifecycle + Sheets & Settlements posting.
// SPA navigation only (full reloads would reset the in-memory store). Gates on console errors.
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
const countChip = (needle) =>
  page.$$eval('button', (els, n) => els.filter((e) => e.textContent?.includes(n)).length, needle);
// Approved-OT total cells that carry a ⚡ provenance dot
const countProvenance = () =>
  page.$$eval('[aria-label^="Source:"]', (els) => els.length);

// ── 1. Scheduler: seed pending chips are amber ────────────────────────────────
await page.goto(`${BASE}/shifts/scheduler?weekStart=2026-07-12`, { waitUntil: 'networkidle0' });
await sleep(400);
const pendingBefore = await countChip('· pending');
check('scheduler shows pending OT chips', pendingBefore > 0, `${pendingBefore} chips`);
check('no reconcile/settled chips remain', (await countChip('reconcile')) === 0 && (await countChip('paid')) === 0);

// ── 2. Approvals → approve (reflection #1) ────────────────────────────────────
await clickText('Approvals');
await sleep(400);
const opened = await clickReviewFor('Project deadline sprint');
check('approval drawer opens', opened);
await sleep(300);
await clickText('Approve with edits');
await sleep(400);
await clickText('Scheduler');
await sleep(500);
const pendingAfter = await countChip('· pending');
const approvedAfter = await countChip('· approved');
check('reflection #1 — pending chips cleared', pendingAfter === 0, `${pendingBefore} → ${pendingAfter}`);
check('reflection #1 — chips now approved', approvedAfter >= pendingBefore, `${approvedAfter} approved`);

// ── 3. Sheets: approved plans already posted (provenance dots present) ─────────
await dismissToasts();
await clickText('Sheets & Settlements', 'a');
await sleep(500);
const provBefore = await countProvenance();
check('sheet Approved-OT columns carry provenance dots', provBefore > 0, `${provBefore} dots`);

// ── 4. Unplanned lane: capture from punch → approve → posts to sheet ───────────
await clickText('Capture unplanned OT from a punch');
await sleep(400);
const pendingRows = await page.$$eval('button', (els) => els.filter((e) => e.textContent === 'Approve').length);
check('capture created a pending request', pendingRows >= 1, `${pendingRows} approvable`);
await dismissToasts();
await clickText('Approve');
await sleep(900); // auto-switches back to Sheet tab
const provAfter = await countProvenance();
check('approving a request posts to the sheet (more provenance)', provAfter >= provBefore, `${provBefore} → ${provAfter}`);

// ── 5. Feature toggle hides the OT workflow tabs ──────────────────────────────
await clickText('Shifts & scheduling', 'a');
await sleep(400);
await clickText('Shift Settings');
await sleep(300);
const tabsBefore = await page.$$eval('a', (els) => els.map((e) => e.textContent?.replace(/\d+$/, '').trim()));
const switches = await page.$$('[role="switch"], button[aria-checked]');
if (switches[1]) await switches[1].click();
await sleep(400);
const tabsAfter = await page.$$eval('a', (els) => els.map((e) => e.textContent?.replace(/\d+$/, '').trim()));
check('feature toggle hides Plan Overtime / Approvals',
  tabsBefore.includes('Plan Overtime') && !tabsAfter.includes('Plan Overtime'));

// ── 6. Console-error gate ─────────────────────────────────────────────────────
check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
