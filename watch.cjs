// watch.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { fetchFeedItems } = require('./fetch_oddsportal_feed.cjs');

// 🔧 Config aus .env
const TARGET_URL = process.env.TARGET_URL || 'https://www.oddsportal.com/community/feed/';
const OUTPUT_CSV = process.env.OUTPUT_CSV || 'good_picks.csv';
const TG_TOKEN = process.env.TG_TOKEN || '8109126881:AAFnsVSxUvyg3k7nEQLVYEHBimcRE995LyE';
const TG_CHAT_IDS = (process.env.TG_CHAT_IDS || '-1003003431679').split(',').map(s => s.trim()).filter(Boolean);
const CHECK_INTERVAL = Number(process.env.CHECK_INTERVAL || '20');
const MIN_PRICE = Number(process.env.MIN_PRICE || '0');

const bot = TG_TOKEN ? new TelegramBot(TG_TOKEN, { polling: false }) : null;

// ✅ Funktion: Telegram-Message an alle IDs schicken oder in Konsole loggen
async function notifyAll(text) {
  if (!bot || TG_CHAT_IDS.length === 0) {
    console.log('[WATCH] (kein Telegram):\n' + text);
    return;
  }
  for (const id of TG_CHAT_IDS) {
    try {
      await bot.sendMessage(id, text);
    } catch (e) {
      console.warn('[WATCH] Telegram-Fehler an', id, e.message);
    }
  }
}

// ✅ Filter-Regeln (TEST-MODUS: Alle Wetten posten)
function qualifies(bets, winrate) {
  // Poste ALLES - keine Filter
  return true;
}

// CSV-Helper
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

// Duplikate vermeiden (nur neue Posts)
const seenFile = '.seen_ids.json';
let seen = new Set();
try {
  if (fs.existsSync(seenFile)) {
    seen = new Set(JSON.parse(fs.readFileSync(seenFile, 'utf8')));
  }
} catch {}
function persistSeen() {
  fs.writeFileSync(seenFile, JSON.stringify([...seen]), 'utf8');
}

function makeId(item) {
  return (item.postUrl || (item.author + '|' + item.title)).slice(0, 200);
}

// Einmaliger Run
async function runOnce() {
  console.log('[WATCH]', new Date().toLocaleString(), '→', TARGET_URL);
  const items = await fetchFeedItems(TARGET_URL);
  console.log(`[WATCH] Gelesen: ${items.length}`);

  if (items.length === 0) {
    console.log('[WATCH] Keine Items gefunden!');
  }

  // DEBUG: Zeige erste 5 Items
  console.log('[WATCH] DEBUG - Erste 5 Items:');
  items.slice(0, 5).forEach((item, i) => {
    console.log(`  ${i+1}. ${item.author || 'Unbekannt'} - Bets: ${item.bets}, Winrate: ${item.winrate}%`);
  });

  const filtered = items
    .filter(x => qualifies(x.bets, x.winrate))
    .filter(x => !MIN_PRICE || (Number.isFinite(x.price) && x.price >= MIN_PRICE));

  const newOnes = filtered.filter(x => !seen.has(makeId(x)));

  console.log(`[WATCH] Qualifiziert: ${filtered.length}, neu: ${newOnes.length}`);

  if (newOnes.length) {
    ensureCsvHeader(OUTPUT_CSV);
    for (const x of newOnes) {
      appendCsv(OUTPUT_CSV, x);
      seen.add(makeId(x));
    }
    persistSeen();

    const lines = newOnes.map(x => {
      // Extrahiere Team vs Team aus dem Event
      const eventText = x.event || x.title || '';
      const teamMatch = eventText.match(/([A-Za-z\s]+)\s*[–-]\s*([A-Za-z\s]+)/);
      const teams = teamMatch ? `${teamMatch[1].trim()} vs ${teamMatch[2].trim()}` : eventText.slice(0, 50);
      
      // Extrahiere Wette-Details (Over/Under, Quoten)
      const odds = x.odds || [];
      const price = Number.isFinite(x.price) ? x.price : (odds[0] || NaN);
      const secondOdds = odds[1] || NaN;
      
      // Bestimme welche Wette gepickt wurde (niedrigere Quote = wahrscheinlicher)
      const pickedOdds = price;
      const otherOdds = secondOdds;
      const pickedType = price < secondOdds ? 'over' : 'under';
      const otherType = price < secondOdds ? 'under' : 'over';
      
      // Formatiere die Nachricht - ALLE DATEN anzeigen
      let message = `• ${teams}\n`;
      if (Number.isFinite(pickedOdds) && Number.isFinite(otherOdds)) {
        message += `  ${pickedOdds} ${pickedType} (Picked) : ${otherOdds} ${otherType}`;
      } else if (Number.isFinite(price)) {
        message += `  ${price} (Picked)`;
      }
      
      // Zeige Winrate (positiv/negativ)
      const winrateSign = x.winrate >= 0 ? '+' : '';
      message += `   ${winrateSign}${x.winrate}%`;
      
      // Zeige Sample Size und ROI IMMER explizit
      message += `\n  Bets: ${x.bets}, ROI: ${x.winrate}%`;
      
      message += `\n  ${x.author}`;
      if (x.postUrl) {
        message += ` — ${x.postUrl}`;
      }
      
      return message;
    });

    await notifyAll(`🔥 Community-Feed Treffer (${newOnes.length})\n${lines.join('\n\n')}`);
  }
}

module.exports = {
  runOnce,
  CHECK_INTERVAL,
};