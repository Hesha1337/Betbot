// test_with_fake_data.cjs - Teste den Bot mit simulierten Daten
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Simuliere fetchFeedItems mit Testdaten
function createFakeFeedItems() {
  return [
    {
      author: "TestUser1",
      profileUrl: "https://www.oddsportal.com/profile/TestUser1/",
      event: "Real Madrid vs Barcelona",
      title: "Real Madrid vs Barcelona - Over 2.5 Goals",
      price: 1.85,
      postUrl: "https://www.oddsportal.com/community/post/123",
      bets: 1500,  // Sollte qualifizieren (≥1500 → ≥9%)
      winrate: 12.5
    },
    {
      author: "TestUser2", 
      profileUrl: "https://www.oddsportal.com/profile/TestUser2/",
      event: "Bayern Munich vs Dortmund",
      title: "Bayern Munich vs Dortmund - Home Win",
      price: 2.10,
      postUrl: "https://www.oddsportal.com/community/post/124",
      bets: 2500,  // Sollte qualifizieren (≥2000 → ≥6%)
      winrate: 8.2
    },
    {
      author: "TestUser3",
      profileUrl: "https://www.oddsportal.com/profile/TestUser3/",
      event: "Liverpool vs Chelsea", 
      title: "Liverpool vs Chelsea - Both Teams to Score",
      price: 1.95,
      postUrl: "https://www.oddsportal.com/community/post/125",
      bets: 800,   // Sollte NICHT qualifizieren (<1000)
      winrate: 15.0
    },
    {
      author: "TestUser4",
      profileUrl: "https://www.oddsportal.com/profile/TestUser4/",
      event: "PSG vs Marseille",
      title: "PSG vs Marseille - Over 3.5 Goals", 
      price: 2.50,
      postUrl: "https://www.oddsportal.com/community/post/126",
      bets: 1200,  // Sollte qualifizieren (≥1000 → ≥12%)
      winrate: 13.8
    }
  ];
}

// Kopiere die Filter-Logik aus watch.cjs
function qualifies(bets, winrate) {
  if (!Number.isFinite(bets) || !Number.isFinite(winrate)) return false;
  // TEST: Ab 200 Wetten und 1% Winrate
  if (bets >= 200) return winrate >= 1;
  return false;
}

// Kopiere die CSV-Funktionen aus watch.cjs
function ensureCsvHeader(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, 'timestamp,event,title,author,bets,winrate,price,postUrl,profileUrl\n', 'utf8');
  }
}

function appendCsv(file, row) {
  const esc = v => {
    const s = (v ?? '').toString().replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const line = [
    new Date().toISOString(),
    esc(row.event),
    esc(row.title),
    esc(row.author),
    esc(row.bets),
    esc(row.winrate),
    esc(row.price),
    esc(row.postUrl),
    esc(row.profileUrl),
  ].join(',') + '\n';
  fs.appendFileSync(file, line, 'utf8');
}

async function testWithFakeData() {
  console.log('🧪 Teste Bot mit simulierten Daten...\n');
  
  const items = createFakeFeedItems();
  console.log(`📊 Simulierte Items: ${items.length}\n`);
  
  // Zeige alle Items
  items.forEach((item, i) => {
    console.log(`${i+1}. ${item.author}`);
    console.log(`   Event: ${item.event}`);
    console.log(`   Bets: ${item.bets}, Winrate: ${item.winrate}%`);
    console.log(`   Qualifiziert: ${qualifies(item.bets, item.winrate) ? '✅ JA' : '❌ NEIN'}`);
    console.log('');
  });
  
  // Filtere qualifizierte Items
  const qualified = items.filter(x => qualifies(x.bets, x.winrate));
  console.log(`🎯 Qualifizierte Items: ${qualified.length}/${items.length}\n`);
  
  if (qualified.length > 0) {
    // Speichere in CSV
    const csvFile = 'test_results.csv';
    ensureCsvHeader(csvFile);
    qualified.forEach(item => appendCsv(csvFile, item));
    console.log(`💾 Gespeichert in: ${csvFile}\n`);
    
    // Zeige Telegram-Nachricht
    const lines = qualified.map(x =>
      `• ${x.event || x.title}\n  ${x.author} — Bets ${x.bets}, Winrate ${x.winrate}% @ ${x.price}\n  ${x.postUrl || ''}`
    );
    
    console.log('📱 Telegram-Nachricht:');
    console.log(`🔥 Community-Feed Treffer (${qualified.length})\n${lines.join('\n\n')}`);
  }
}

testWithFakeData().catch(console.error);
