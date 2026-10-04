require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('./src/config/db');
const handlers = require('./src/handlers');
const scheduler = require('./src/scheduler');

const { BOT_TOKEN } = process.env;
const DATA_FILE = process.env.DATA_FILE || 'data/db.json';

if (!BOT_TOKEN) {
  console.error('❌ .env da BOT_TOKEN ko‘rsatilishi shart. .env.example dan nusxa oling.');
  process.exit(1);
}

// Global xatolar loglansin
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});

async function main() {
  await connectDB(DATA_FILE);

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.on('polling_error', (err) => {
    console.error('polling_error:', err.code || '', err.message);
  });

  handlers.register(bot);
  scheduler.start(bot);

  console.log('🤖 Bot ishga tushdi (polling rejimi)');
}

main().catch((err) => {
  console.error('Ishga tushirishda xato:', err);
  process.exit(1);
});
