// Quick screenshot helper: node scripts/shot.mjs <path> <outfile> [width] [height]
import puppeteer from 'puppeteer';

const path = process.argv[2] ?? '/shifts/scheduler';
const out = process.argv[3] ?? '/tmp/ot-shot.png';
const width = Number(process.argv[4] ?? 1360);
const height = Number(process.argv[5] ?? 900);

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
if (errors.length) {
  console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('OK ' + out);
}
