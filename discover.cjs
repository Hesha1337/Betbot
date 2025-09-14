// discover.cjs
require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const url = process.env.TARGET_URL || 'https://www.oddsportal.com/community/feed/';
  console.log('[DISCOVER] Öffne:', url);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Zeit geben, damit alles rendert
    await page.waitForTimeout(2000);

    // Kandidaten für Karten im Feed
    const CANDIDATES = [
      'article',
      '.feed-item', '.feed__item',
      '[class*="feed"] article',
      '[class*="feed"] [class*="item"]',
      '[class*="post"]',
      '[class*="prediction"]',
      '[class*="tip"]',
      '[class*="community"] article',
      '[class*="community"] [class*="item"]',
      'div[class*="card"]',
      'div[class*="post"]',
      'ul li[class], ol li[class]',
    ];

    let foundSel = null;
    for (const sel of CANDIDATES) {
      const count = await page.$$eval(sel, els => els.length).catch(() => 0);
      if (count >= 5) {
        foundSel = sel;
        console.log(`[DISCOVER] Kandidat: "${sel}" → Elemente: ${count}`);
        const samples = await page.$$eval(sel, els =>
          els.slice(0, 3).map(e => ({
            tag: e.tagName,
            cls: e.className,
            text: e.innerText.replace(/\s+/g,' ').trim().slice(0, 160)
          }))
        );
        console.log('[DISCOVER] Beispielkarten:', samples);
        break;
      }
    }

    if (!foundSel) console.warn('[DISCOVER] Kein offensichtlicher Karten-Selektor gefunden.');

    await page.screenshot({ path: 'discover.png', fullPage: true });
    console.log('[DISCOVER] Screenshot gespeichert: discover.png');

    // 👇 Browser 15 Sekunden offen lassen (zum Schauen)
    await page.waitForTimeout(15000);

  } catch (e) {
    console.error('[DISCOVER] Fehler:', e);
    await page.screenshot({ path: 'discover_error.png', fullPage: true }).catch(()=>{});
  } finally {
    await browser.close();
    console.log('[DISCOVER] Fertig, Browser geschlossen.');
  }
})();
