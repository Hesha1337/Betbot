require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TG_TOKEN || '8109126881:AAFnsVSxUvyg3k7nEQLVYEHBimcRE995LyE';
if (!token) { console.error('TG_TOKEN fehlt in .env'); process.exit(1); }
const bot = new TelegramBot(token, { polling: true });

console.log('Schick jetzt eine Nachricht in der ZIEL-GRUPPE …');
bot.on('message', (msg) => {
  console.log('chat id:', msg.chat.id, '| title:', msg.chat.title, '| type:', msg.chat.type);
});
