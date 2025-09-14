// deep_discover.cjs - Findet die richtigen Selektoren
require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const url = process.env.TARGET_URL || 'https://www.oddsportal.com/community/feed/';
  console.log('[DEEP DISCOVER] Öffne:', url);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Alle möglichen Selektoren testen
    const ALL_SELECTORS = [
      'article',
      'div[class*="post"]',
      'div[class*="prediction"]',
      'div[class*="tip"]',
      'div[class*="feed"]',
      'div[class*="item"]',
      'div[class*="card"]',
      'div[class*="community"]',
      '[data-testid*="post"]',
      '[data-testid*="prediction"]',
      '[data-testid*="tip"]',
      '[data-testid*="feed"]',
      '[data-testid*="item"]',
      '[data-testid*="card"]',
      '[data-testid*="community"]',
      'section article',
      'main article',
      'main div[class*="post"]',
      'main div[class*="prediction"]',
      'main div[class*="tip"]',
      'main div[class*="feed"]',
      'main div[class*="item"]',
      'main div[class*="card"]',
      'main div[class*="community"]',
      'section div[class*="post"]',
      'section div[class*="prediction"]',
      'section div[class*="tip"]',
      'section div[class*="feed"]',
      'section div[class*="item"]',
      'section div[class*="card"]',
      'section div[class*="community"]',
      'ul li[class], ol li[class]',
    ];

    console.log('\n🔍 Teste alle Selektoren...\n');

    for (const sel of ALL_SELECTORS) {
      try {
        const count = await page.$$eval(sel, els => els.length);
        if (count > 0) {
          console.log(`✅ "${sel}" → ${count} Elemente`);
          
          // Zeige erste 3 Elemente als Beispiel
          if (count >= 3) {
            const samples = await page.$$eval(sel, els =>
              els.slice(0, 3).map(e => ({
                tag: e.tagName,
                cls: e.className,
                text: e.innerText.replace(/\s+/g,' ').trim().slice(0, 100)
              }))
            );
            console.log(`   Beispiele:`, samples);
          }
          console.log('');
        }
      } catch (e) {
        // Ignoriere Fehler
      }
    }

    // Screenshot für manuelle Inspektion
    await page.screenshot({ path: 'deep_discover.png', fullPage: true });
    console.log('📸 Screenshot gespeichert: deep_discover.png');

    // Browser 10 Sekunden offen lassen
    await page.waitForTimeout(10000);

  } catch (e) {
    console.error('[DEEP DISCOVER] Fehler:', e);
  } finally {
    await browser.close();
    console.log('[DEEP DISCOVER] Fertig.');
  }
})();
