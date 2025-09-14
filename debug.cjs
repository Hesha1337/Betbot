// debug.cjs - Zeigt alle gefundenen Posts mit Stats
require('dotenv').config();
const { fetchFeedItems } = require('./fetch_oddsportal_feed.cjs');

async function debug() {
  console.log('🔍 Debug: Alle gefundenen Posts...\n');
  
  const items = await fetchFeedItems('https://www.oddsportal.com/community/feed/');
  console.log(`📊 Gefunden: ${items.length} Posts\n`);
  
  // Zeige alle Posts mit ihren Stats
  items.slice(0, 10).forEach((item, i) => {
    console.log(`${i+1}. ${item.author || 'Unbekannt'}`);
    console.log(`   Event: ${item.event || item.title || 'Kein Event'}`);
    console.log(`   Bets: ${item.bets || 'N/A'}, Winrate: ${item.winrate || 'N/A'}%`);
    console.log(`   Profil: ${item.profileUrl || 'Kein Profil'}`);
    console.log('');
  });
  
  // Filter-Statistiken
  const withStats = items.filter(x => Number.isFinite(x.bets) && Number.isFinite(x.winrate));
  const qualified = items.filter(x => {
    if (!Number.isFinite(x.bets) || !Number.isFinite(x.winrate)) return false;
    if (x.bets >= 2000) return x.winrate >= 6;
    if (x.bets >= 1500) return x.winrate >= 9;
    if (x.bets >= 1000) return x.winrate >= 12;
    return false;
  });
  
  console.log(`📈 Statistiken:`);
  console.log(`   Posts mit Stats: ${withStats.length}/${items.length}`);
  console.log(`   Qualifiziert: ${qualified.length}`);
  
  if (qualified.length > 0) {
    console.log(`\n🎯 Qualifizierte Posts:`);
    qualified.forEach((item, i) => {
      console.log(`${i+1}. ${item.author} - ${item.bets} Bets, ${item.winrate}% Winrate`);
    });
  }
}

debug().catch(console.error);
