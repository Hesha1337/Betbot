// simple_debug.cjs - Einfaches Debug ohne Browser
require('dotenv').config();
const { fetchFeedItems } = require('./fetch_oddsportal_feed.cjs');

async function debug() {
  console.log('🔍 Debug: Was findet der Bot wirklich?\n');
  
  try {
    const items = await fetchFeedItems('https://www.oddsportal.com/community/feed/');
    console.log(`📊 Gefunden: ${items.length} Items\n`);
    
    // Zeige alle Items mit Details
    items.forEach((item, i) => {
      console.log(`${i+1}. ${item.author || 'Unbekannt'}`);
      console.log(`   Event: ${item.event || item.title || 'Kein Event'}`);
      console.log(`   Bets: ${item.bets || 'N/A'}, Winrate: ${item.winrate || 'N/A'}%`);
      console.log(`   Profil: ${item.profileUrl || 'Kein Profil'}`);
      console.log(`   Preview: ${item.preview || 'Kein Preview'}`);
      console.log('');
    });
    
    // Filter-Statistiken
    const withStats = items.filter(x => Number.isFinite(x.bets) && Number.isFinite(x.winrate));
    const withWinrate = items.filter(x => Number.isFinite(x.winrate));
    const qualified = items.filter(x => {
      if (!Number.isFinite(x.winrate)) return false;
      return x.winrate >= 0; // Alle positiven
    });
    
    console.log(`📈 Statistiken:`);
    console.log(`   Items mit Bets+Winrate: ${withStats.length}/${items.length}`);
    console.log(`   Items mit Winrate: ${withWinrate.length}/${items.length}`);
    console.log(`   Qualifiziert (≥0%): ${qualified.length}`);
    
    if (qualified.length > 0) {
      console.log(`\n🎯 Qualifizierte Items:`);
      qualified.forEach((item, i) => {
        console.log(`${i+1}. ${item.author} - ${item.winrate}% Winrate`);
      });
    }
    
  } catch (e) {
    console.error('❌ Fehler:', e.message);
  }
}

debug();
