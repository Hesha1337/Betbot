// find_posts.cjs - Findet echte Community-Posts
require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const url = process.env.TARGET_URL || 'https://www.oddsportal.com/community/feed/';
  console.log('[FIND POSTS] Öffne:', url);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Suche nach Elementen, die wie echte Posts aussehen
    const postSelectors = [
      'div[class*="post"]',
      'div[class*="prediction"]',
      'div[class*="tip"]',
      'div[class*="feed"]',
      'div[class*="item"]',
      'div[class*="card"]',
      'div[class*="community"]',
      'article',
      'section div',
      'main div',
    ];

    console.log('\n🔍 Suche nach echten Posts...\n');

    for (const sel of postSelectors) {
      try {
        const elements = await page.$$(sel);
        console.log(`\n📋 "${sel}" → ${elements.length} Elemente`);
        
        // Analysiere die ersten 5 Elemente
        for (let i = 0; i < Math.min(5, elements.length); i++) {
          const element = elements[i];
          const text = await element.textContent();
          const className = await element.getAttribute('class');
          const tagName = await element.evaluate(el => el.tagName);
          
          // Filtere nur relevante Elemente (die wie Posts aussehen)
          if (text && text.length > 20 && text.length < 500) {
            // Suche nach typischen Post-Inhalten
            if (text.includes('vs') || text.includes('@') || text.includes('%') || 
                text.includes('Bets') || text.includes('Win') || text.includes('rate') ||
                text.includes('prediction') || text.includes('tip')) {
              
              console.log(`  ${i+1}. [${tagName}] ${className}`);
              console.log(`     Text: ${text.replace(/\s+/g, ' ').trim().slice(0, 150)}...`);
              
              // Suche nach Links
              const links = await element.$$('a');
              if (links.length > 0) {
                console.log(`     Links: ${links.length}`);
                for (let j = 0; j < Math.min(3, links.length); j++) {
                  const href = await links[j].getAttribute('href');
                  const linkText = await links[j].textContent();
                  if (href && linkText) {
                    console.log(`       - ${linkText}: ${href}`);
                  }
                }
              }
              console.log('');
            }
          }
        }
      } catch (e) {
        // Ignoriere Fehler
      }
    }

    // Screenshot für manuelle Inspektion
    await page.screenshot({ path: 'find_posts.png', fullPage: true });
    console.log('📸 Screenshot gespeichert: find_posts.png');

    // Browser 15 Sekunden offen lassen
    await page.waitForTimeout(15000);

  } catch (e) {
    console.error('[FIND POSTS] Fehler:', e);
  } finally {
    await browser.close();
    console.log('[FIND POSTS] Fertig.');
  }
})();
