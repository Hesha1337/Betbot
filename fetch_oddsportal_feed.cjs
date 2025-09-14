// fetch_oddsportal_feed.cjs
const { chromium } = require('playwright');

/** Hilfsfunktionen **/
function toNum(s) {
  if (!s) return NaN;
  const m = String(s).match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : NaN;
}

/** Profilseite: Bets (#Wetten) + ROI (%) extrahieren */
async function fetchAuthorStats(ctx, profileUrl) {
  const p = await ctx.newPage();
  try {
    await p.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(1500); // mehr Zeit für Client-Rendering
    
    // Suche nach "Total" Zeile in der Statistik-Tabelle
    const totalRow = await p.$('text=Total');
    if (totalRow) {
      const totalText = await totalRow.textContent();
      console.log(`DEBUG: Found Total row: "${totalText}"`);
      
      // Extrahiere Total Predictions und ROI aus der Total-Zeile
      const totalMatch = totalText.match(/(\d+)\s+Total\s+Predictions.*?([+-]?\d+\.?\d*)\s*%/);
      if (totalMatch) {
        const bets = Number(totalMatch[1]);
        const winrate = Number(totalMatch[2]);
        console.log(`DEBUG: Extracted from Total row - Bets: ${bets}, ROI: ${winrate}%`);
        return { bets, winrate };
      }
    }
    
    // Alternative: Suche nach der gesamten Tabelle und extrahiere die Total-Zeile
    const tableRows = await p.$$('tr, div[class*="row"]');
    for (const row of tableRows) {
      const rowText = await row.textContent();
      if (rowText && rowText.includes('Total') && rowText.includes('Predictions')) {
        console.log(`DEBUG: Found Total row in table: "${rowText}"`);
        
        // Extrahiere Zahlen aus der Total-Zeile
        const numbers = rowText.match(/\d+/g);
        const roiMatch = rowText.match(/([+-]?\d+\.?\d*)\s*%/);
        
        if (numbers && numbers.length > 0 && roiMatch) {
          const bets = Number(numbers[numbers.length - 1]); // Letzte Zahl ist meist Total Predictions
          const winrate = Number(roiMatch[1]);
          console.log(`DEBUG: Extracted from table row - Bets: ${bets}, ROI: ${winrate}%`);
          return { bets, winrate };
        }
      }
    }
    
    // Fallback: Suche nach ROI direkt im HTML
    const html = (await p.content()).replace(/\s+/g, ' ');
    
    // Suche nach "ROI 1.80%" Pattern
    const roiMatch = html.match(/ROI\s*([+-]?\d+\.?\d*)\s*%/i);
    if (roiMatch) {
      const winrate = Number(roiMatch[1]);
      console.log(`DEBUG: Found ROI in HTML: ${winrate}%`);
      
      // Suche nach Total Predictions - verschiedene Patterns
      const totalMatch = html.match(/Total\s+Predictions[^>]*>(\d+)/i) || 
                        html.match(/(\d+)\s+Total\s+Predictions/i) ||
                        html.match(/Total[^>]*>(\d+)/i);
      const bets = totalMatch ? Number(totalMatch[1]) : NaN;
      
      if (bets) {
        console.log(`DEBUG: Found Total Predictions: ${bets}`);
      }
      
      return { bets, winrate };
    }

    return { bets: NaN, winrate: NaN };
  } catch (e) {
    console.log(`DEBUG: Error fetching profile ${profileUrl}: ${e.message}`);
    return { bets: NaN, winrate: NaN };
  } finally {
    await p.close();
  }
}

/** Feed: Karten auslesen, dann für jeden Autor Profil laden */
async function fetchFeedItems(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    viewport: { width: 1366, height: 900 }
  });
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);

    // Suche nach echten Community-Posts mit spezifischen Mustern
    console.log('Searching for community posts...');
    
    // Cards: Sammle ALLE <div>, <article>, <section> (maximal locker)
    const cards = [
      ...(await page.$$('div')),
      ...(await page.$$('article')),
      ...(await page.$$('section')),
    ];
    console.log(`DEBUG: Cards gefunden: ${cards.length}`);
    
    if (!cards.length) return [];

    // Zeige für jedes Card-Element die ersten 200 Zeichen als Vorschau
    for (const card of cards.slice(0, 20)) {
      const text = await card.textContent();
      console.log('DEBUG: Card Preview:', (text || '').slice(0, 200));
    }

    // Verarbeite die gefundenen Cards direkt - mit Deduplizierung
    const items = [];
    const seenAuthors = new Set();
    
    for (const card of cards.slice(0, 60)) {
      try {
        const item = await card.evaluate(e => {
      const get = s => e.querySelector(s);
      const text = e.innerText.replace(/\s+/g, ' ').trim();
      
      // Extrahiere nur den relevanten Teil des Posts (erste 200 Zeichen)
      const relevantText = text.slice(0, 200);
      const title = get('h3,h4,.title,[class*="title"]')?.textContent?.trim() || relevantText.slice(0, 80);
      
      // Debug: Zeige was im Titel steht
      if (title && title.includes('%')) {
        console.log(`DEBUG: Title contains %: "${title}"`);
      }

      // Winrate direkt aus dem Feed lesen (z.B. +1.8%, -2.2%, RUDI1955 +1.8%)
      let winrate = NaN;
      let authorFromWinrate = '';
      
      // Suche nach Mustern wie "RUDI1955 +1.8%" oder "SUNIL150187 -3.5%"
      // Erste Suche: Username gefolgt von Winrate
      const usernameWinrateMatch = relevantText.match(/(\w+)\s*([+-]?\d+\.?\d*)\s*%/);
      if (usernameWinrateMatch) {
        winrate = Number(usernameWinrateMatch[2]);
        authorFromWinrate = usernameWinrateMatch[1];
      } else {
        // Fallback: Suche nach einfachen Prozentangaben
        const simpleWinrateMatch = relevantText.match(/([+-]?\d+\.?\d*)\s*%/);
        if (simpleWinrateMatch) {
          winrate = Number(simpleWinrateMatch[1]);
        }
      }
      
      // Debug: Zeige was gefunden wurde
      if (relevantText.includes('+') || relevantText.includes('-')) {
        console.log(`DEBUG: RelevantText="${relevantText}", Winrate=${winrate}, Author=${authorFromWinrate}`);
        console.log(`DEBUG: Regex match result:`, usernameWinrateMatch);
      }

      // Username + Profil-Link
      const aUser = get('a[href*="/profile/"]') || get('a[href*="/community/"]') || get('[class*="user"] a');
      let author = aUser?.textContent?.trim() || '';
      let profileUrl = aUser?.getAttribute('href') || '';
      if (profileUrl && profileUrl.startsWith('/')) profileUrl = 'https://www.oddsportal.com' + profileUrl;
      
      // Falls kein Autor gefunden, verwende den aus dem Winrate-Pattern
      if (!author && authorFromWinrate) {
        author = authorFromWinrate;
      }

      // Event/Match (heuristisch) - extrahiere bessere Event-Info
      let event = title.replace(/\s+/g, ' ').trim();
      
      // Suche nach Team vs Team Pattern im Text
      const teamMatch = text.match(/([A-Za-z\s]{2,20})\s*[–-]\s*([A-Za-z\s]{2,20})/);
      if (teamMatch) {
        event = `${teamMatch[1].trim()} vs ${teamMatch[2].trim()}`;
      }
      
      // Suche nach Over/Under Info
      const overUnderMatch = text.match(/O\/U\s*([\d.]+)/);
      if (overUnderMatch) {
        event += ` O/U ${overUnderMatch[1]}`;
      }
      
      // Winrate aus dem Event-Feld extrahieren (falls nicht schon gefunden)
      if (!Number.isFinite(winrate) && event) {
        const eventWinrateMatch = event.match(/(\w+)\s*([+-]?\d+\.?\d*)\s*%/);
        if (eventWinrateMatch) {
          winrate = Number(eventWinrateMatch[2]);
          if (!authorFromWinrate) {
            authorFromWinrate = eventWinrateMatch[1];
          }
          console.log(`DEBUG: Found winrate from event: ${winrate} for ${authorFromWinrate}`);
        }
      }
      
      // Winrate aus dem Preview-Feld extrahieren (falls nicht schon gefunden)
      if (!Number.isFinite(winrate)) {
        const previewWinrateMatch = text.slice(0, 200).match(/(\w+)\s*([+-]?\d+\.?\d*)\s*%/);
        if (previewWinrateMatch) {
          winrate = Number(previewWinrateMatch[2]);
          if (!authorFromWinrate) {
            authorFromWinrate = previewWinrateMatch[1];
          }
          console.log(`DEBUG: Found winrate from preview: ${winrate} for ${authorFromWinrate}`);
        }
      }

      // Quoten grob aus Text (falls vorhanden)
      const mOdds = (text.match(/\b\d+(?:[.,]\d+)\b/g) || []).map(x => Number(x.replace(',', '.')));
      const odds = mOdds.filter(v => v >= 1.01 && v <= 100);

      // Post-Link (optional)
      let postUrl = get('a[href*="/community/"]')?.getAttribute('href') || '';
      if (postUrl && postUrl.startsWith('/')) postUrl = 'https://www.oddsportal.com' + postUrl;

      return {
        author, profileUrl, event, title,
        price: odds[0] ?? NaN, odds: odds.slice(0, 5),
        postUrl, preview: text.slice(0, 200),
          winrate: winrate, // Winrate direkt aus Feed
          bets: NaN // Wird später vom Profil geholt
        };
        });
        
        if (item && (item.author || item.winrate)) {
          // Dedupliziere nach Autor (nur wenn Autor vorhanden)
          const authorKey = item.author || `unknown_${items.length}`;
          if (!seenAuthors.has(authorKey)) {
            seenAuthors.add(authorKey);
            items.push(item);
            console.log(`DEBUG: Added item for author: ${item.author || 'unknown'}`);
          } else {
            console.log(`DEBUG: Skipped duplicate author: ${item.author || 'unknown'}`);
          }
        } else {
          console.log(`DEBUG: Skipped item - no author or winrate`);
        }
      } catch (e) {
        console.log('Error processing card:', e.message);
      }
    }

    console.log(`DEBUG: Items gebaut: ${items.length}`);
    items.forEach(item => {
      console.log(`DEBUG: Item: author=${item.author}, event=${item.event}, winrate=${item.winrate}, bets=${item.bets}`);
    });

    // Profil-Ladung - nur für das erste Item zum Testen
    const cache = new Map();
    const itemsToProcess = items.slice(0, 1); // Nur erstes Item für Sample Size
    
    for (const it of itemsToProcess) {
      if (!it.profileUrl) { it.bets = NaN; continue; }
      if (!cache.has(it.profileUrl)) {
        console.log(`DEBUG: [fetch_oddsportal_feed] Lade Profil von ${it.author} (${it.profileUrl}) ...`);
        try {
          const stats = await fetchAuthorStats(ctx, it.profileUrl);
          cache.set(it.profileUrl, stats);
          it.bets = stats.bets;
          if (Number.isFinite(stats.winrate)) {
            it.winrate = stats.winrate;
          }
          console.log(`DEBUG: [fetch_oddsportal_feed] Extrahiert für ${it.author}: bets=${it.bets}, winrate=${it.winrate}`);
        } catch (e) {
          console.log(`DEBUG: [fetch_oddsportal_feed] Fehler beim Laden von ${it.author}: ${e.message}`);
          it.bets = NaN;
        }
      } else {
        const { bets, winrate } = cache.get(it.profileUrl);
        it.bets = bets;
        if (Number.isFinite(winrate)) {
          it.winrate = winrate;
        }
        console.log(`DEBUG: [fetch_oddsportal_feed] (Cache) Für ${it.author}: bets=${it.bets}, winrate=${it.winrate}`);
      }
    }
    
    // Für die restlichen Items: verwende Cache oder setze NaN
    for (let i = 1; i < items.length; i++) {
      const it = items[i];
      if (!it.profileUrl) { it.bets = NaN; continue; }
      if (cache.has(it.profileUrl)) {
        const { bets, winrate } = cache.get(it.profileUrl);
        it.bets = bets;
        if (Number.isFinite(winrate)) {
          it.winrate = winrate;
        }
      } else {
        it.bets = NaN; // Keine Sample Size für diese Items
      }
    }

    return items;
  } finally {
    await browser.close();
  }
}

module.exports = { fetchFeedItems };
