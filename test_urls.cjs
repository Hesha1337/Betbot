// test_urls.cjs - Teste verschiedene OddsPortal URLs
require('dotenv').config();
const { fetchFeedItems } = require('./fetch_oddsportal_feed.cjs');

const urls = [
  'https://www.oddsportal.com/community/feed/',
  'https://www.oddsportal.com/community/',
  'https://www.oddsportal.com/community/predictions/',
  'https://www.oddsportal.com/community/tips/',
  'https://www.oddsportal.com/community/users/',
  'https://www.oddsportal.com/community/top-predictions/',
];

async function testUrls() {
  console.log('🔍 Teste verschiedene OddsPortal URLs...\n');
  
  for (const url of urls) {
    console.log(`📡 Teste: ${url}`);
    try {
      const items = await fetchFeedItems(url);
      console.log(`   Gefunden: ${items.length} Items`);
      
      // Zeige erste 3 Items
      if (items.length > 0) {
        items.slice(0, 3).forEach((item, i) => {
          console.log(`   ${i+1}. ${item.author || 'Unbekannt'} - ${item.event || item.title || 'Kein Event'}`);
          if (item.bets && item.winrate) {
            console.log(`      Bets: ${item.bets}, Winrate: ${item.winrate}%`);
          }
        });
      }
      console.log('');
    } catch (e) {
      console.log(`   ❌ Fehler: ${e.message}`);
      console.log('');
    }
  }
}

testUrls().catch(console.error);
