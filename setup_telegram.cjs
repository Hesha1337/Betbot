// setup_telegram.cjs - Hilft beim Telegram Bot Setup
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

console.log('🤖 Telegram Bot Setup\n');

// Prüfe ob Token in .env steht
const token = process.env.TG_TOKEN;
if (!token || token === 'DEIN_TELEGRAM_BOT_TOKEN' || token === 'DEINE_CHAT_ID') {
  console.log('❌ Kein gültiger Bot Token gefunden!');
  console.log('\n📋 So bekommst du einen Bot Token:');
  console.log('1. Gehe zu @BotFather auf Telegram');
  console.log('2. Schreibe /newbot');
  console.log('3. Folge den Anweisungen');
  console.log('4. Kopiere den Token (z.B. 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)');
  console.log('\n💡 Dann ersetze in der .env Datei:');
  console.log('TG_TOKEN=dein_echter_token_hier');
  process.exit(1);
}

console.log('✅ Bot Token gefunden!');
console.log('🔍 Teste Verbindung...\n');

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  console.log('📱 Nachricht empfangen:');
  console.log(`   Chat ID: ${msg.chat.id}`);
  console.log(`   Chat Typ: ${msg.chat.type}`);
  console.log(`   Chat Titel: ${msg.chat.title || 'Privat'}`);
  console.log(`   Von: ${msg.from.first_name} ${msg.from.last_name || ''}`);
  console.log(`   Text: ${msg.text}`);
  console.log('');
  
  // Antworte mit der Chat-ID
  bot.sendMessage(msg.chat.id, `✅ Chat-ID gefunden: ${msg.chat.id}`);
});

console.log('🎯 Bot ist bereit!');
console.log('📱 Schick jetzt eine Nachricht an deinen Bot oder in deine Gruppe...');
console.log('⏹️  Drücke Ctrl+C zum Beenden\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Bot gestoppt.');
  bot.stopPolling();
  process.exit(0);
});
