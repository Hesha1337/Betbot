// find_real_posts.cjs - Findet die echten Community-Posts
require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const url = 'https://www.oddsportal.com/community/feed/';
  console.log('[FIND REAL POSTS] Öffne:', url);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    console.log('\n🔍 Suche nach echten Community-Posts...\n');

    // Suche nach Elementen, die Benutzernamen enthalten
    const allDivs = await page.$$('div');
    console.log(`📊 Gefunden: ${allDivs.length} div-Elemente`);

    let foundPosts = 0;
    for (let i = 0; i < Math.min(50, allDivs.length); i++) {
      const div = allDivs[i];
      const text = await div.textContent();
      
      // Suche nach typischen Post-Inhalten
      if (text && text.length > 50 && text.length < 1000) {
        // Suche nach Benutzernamen + Winrate Pattern
        if (text.match(/[A-Z]{2,}\d+/) && text.match(/[+-]?\d+\.?\d*%/)) {
          console.log(`\n✅ POST GEFUNDEN ${++foundPosts}:`);
          console.log(`   Text: ${text.replace(/\s+/g, ' ').trim().slice(0, 200)}...`);
          
          // Suche nach Links
          const links = await div.$$('a');
          if (links.length > 0) {
            console.log(`   Links: ${links.length}`);
            for (let j = 0; j < Math.min(3, links.length); j++) {
              const href = await links[j].getAttribute('href');
              const linkText = await links[j].textContent();
              if (href && linkText) {
                console.log(`     - ${linkText}: ${href}`);
              }
            }
          }
          
          // Suche nach Klassen
          const className = await div.getAttribute('class');
          if (className) {
            console.log(`   Klasse: ${className}`);
          }
        }
      }
    }

    if (foundPosts === 0) {
      console.log('❌ Keine echten Posts gefunden. Suche nach anderen Mustern...');
      
      // Alternative Suche nach Over/Under Pattern
      for (let i = 0; i < Math.min(100, allDivs.length); i++) {
        const div = allDivs[i];
        const text = await div.textContent();
        
        if (text && text.includes('Over') && text.includes('Under')) {
          console.log(`\n🎯 OVER/UNDER GEFUNDEN:`);
          console.log(`   Text: ${text.replace(/\s+/g, ' ').trim().slice(0, 150)}...`);
          
          const className = await div.getAttribute('class');
          if (className) {
            console.log(`   Klasse: ${className}`);
          }
        }
      }
    }

    // Screenshot für manuelle Inspektion
    await page.screenshot({ path: 'real_posts.png', fullPage: true });
    console.log('\n📸 Screenshot gespeichert: real_posts.png');

    // Browser 10 Sekunden offen lassen
    await page.waitForTimeout(10000);

  } catch (e) {
    console.error('[FIND REAL POSTS] Fehler:', e);
  } finally {
    await browser.close();
    console.log('[FIND REAL POSTS] Fertig.');
  }
})();
