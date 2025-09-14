require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  try {
    const url = process.env.TARGET_URL || 'https://example.com';
    console.log('[SMOKE] Öffne:', url);
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const title = await page.title();
    console.log('[SMOKE] Seitentitel:', title);
    await browser.close();
    console.log('[SMOKE] OK ✅');
  } catch (e) {
    console.error('[SMOKE] Fehler:', e);
  }
})();
