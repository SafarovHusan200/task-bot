const User = require('./models/user.model');
const Task = require('./models/task.model');
const { todayKey, normalizeTime, isValidTime, parseTimePrefix } = require('./utils/time');

// Foydalanuvchi kiritgan matnni HTML uchun xavfsiz qiladi
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const HTML = { parse_mode: 'HTML' };

const WELCOME =
  'Assalomu alaykum! Men <b>vazifa-eslatma boti</b>man.\n\n' +
  'Har kuni belgilangan vaqtda bugungi ro‘yxatni yuboraman, vaqti ko‘rsatilgan ' +
  'vazifalar uchun alohida eslatma beraman.\n\n' +
  'Tez boshlash:\n' +
  '• <code>/add Hisobot yozish</code> — bugungi vazifa\n' +
  '• <code>/add 14:30 Uchrashuv</code> — vaqtli vazifa\n' +
  '• <code>/har 07:00 Ertalabki mashq</code> — har kuni takrorlanadi\n' +
  '• <code>/list</code> — bugungi ro‘yxat\n\n' +
  'To‘liq yordam: /help';

const HELP =
  '<b>Buyruqlar</b>\n\n' +
  '/start — ro‘yxatdan o‘tish va salomlashuv\n' +
  '/help — shu yordam\n' +
  '/add &lt;matn&gt; — bugungi bir martalik vazifa\n' +
  '/add HH:mm &lt;matn&gt; — vaqti ko‘rsatilgan vazifa\n' +
  '/har HH:mm &lt;matn&gt; — har kuni takrorlanadigan vazifa\n' +
  '/list — bugungi ro‘yxat, tugmalar bilan\n' +
  '/vaqt HH:mm — kunlik ro‘yxat keladigan vaqt\n' +
  '/tozala — o‘tgan kunlardagi bajarilgan bir martalik vazifalarni o‘chiradi\n' +
  '/stop — eslatmalarni to‘xtatadi\n' +
  '/davom — eslatmalarni qayta yoqadi\n\n' +
  'Buyruqsiz matn yuborsangiz ham bugungi vazifa sifatida qo‘shiladi. ' +
  'Matn boshida <code>HH:mm</code> bo‘lsa, u vaqt sifatida olinadi.';

// --- Ko'rinish yordamchilari ---------------------------------------------------

function isDoneToday(task) {
  return (task.doneDates || []).includes(todayKey());
}

// Bitta vazifa satri (HTML). Bugun bajarilgan bo'lsa — chizilgan.
function taskLine(task) {
  const today = todayKey();
  let prefix = '';
  if (task.repeat === 'daily') prefix += '🔁 ';
  if (task.time) prefix += `⏰ ${task.time} `;
  const overdue =
    task.repeat === 'once' &&
    task.date &&
    task.date < today &&
    (task.doneDates || []).length === 0;
  if (overdue) prefix += '⚠️ ';

  const body = `${prefix}${esc(task.text)}`;
  return isDoneToday(task) ? `✅ <s>${body}</s>` : body;
}

// Vazifa ostidagi inline tugmalar
function taskKeyboard(task) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Bajarildi', callback_data: `done:${task._id}` },
        { text: '🗑', callback_data: `del:${task._id}` },
      ],
    ],
  };
}

// Bugungi ro'yxatni yuboradi: har bir vazifa alohida xabar (tugmalar shu xabarga bog'lanadi)
async function sendTaskList(bot, chatId, { header } = {}) {
  const tasks = await Task.forToday(chatId);

  if (header) await bot.sendMessage(chatId, header, HTML);

  if (tasks.length === 0) {
    await bot.sendMessage(chatId, '📭 Bugun uchun vazifa yo‘q.', HTML);
    return;
  }

  for (const task of tasks) {
    const opts = { ...HTML };
    if (!isDoneToday(task)) opts.reply_markup = taskKeyboard(task);
    await bot.sendMessage(chatId, taskLine(task), opts);
  }
}

// --- Umumiy yordamchilar -----------------------------------------------------

async function ensureUser(msg) {
  const chatId = String(msg.chat.id);
  const from = msg.from || {};
  return User.findOneAndUpdate(
    { chatId },
    { $set: { firstName: from.first_name || '', username: from.username || '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function createTask(chatId, { time, text, repeat }) {
  return Task.create({
    chatId,
    text,
    time: time || null,
    repeat,
    date: repeat === 'once' ? todayKey() : null,
    doneDates: [],
    notifiedOn: '',
  });
}

function addedMessage(task) {
  const kind = task.repeat === 'daily' ? 'Har kunlik vazifa' : 'Bugungi vazifa';
  const when = task.time ? ` (⏰ ${task.time})` : '';
  return `➕ ${kind} qo‘shildi${when}:\n${esc(task.text)}`;
}

// --- Buyruqlar --------------------------------------------------------------

function register(bot) {
  // Telegram menyusidagi buyruqlar ro'yxati (xato bo'lsa ham bot ishlashda davom etadi)
  bot
    .setMyCommands([
      { command: 'start', description: 'Boshlash' },
      { command: 'help', description: 'Yordam' },
      { command: 'add', description: 'Vazifa qo‘shish' },
      { command: 'har', description: 'Har kunlik vazifa' },
      { command: 'list', description: 'Bugungi ro‘yxat' },
      { command: 'vaqt', description: 'Kunlik ro‘yxat vaqti' },
      { command: 'tozala', description: 'Eski bajarilganlarni o‘chirish' },
      { command: 'stop', description: 'Eslatmalarni to‘xtatish' },
      { command: 'davom', description: 'Eslatmalarni yoqish' },
    ])
    .catch((err) => console.error('setMyCommands xatosi:', err.message));

  bot.onText(/^\/start(?:@\w+)?\b/, async (msg) => {
    try {
      await ensureUser(msg);
      await bot.sendMessage(msg.chat.id, WELCOME, HTML);
    } catch (err) {
      console.error('/start xatosi:', err.message);
    }
  });

  bot.onText(/^\/help(?:@\w+)?\b/, async (msg) => {
    try {
      await bot.sendMessage(msg.chat.id, HELP, HTML);
    } catch (err) {
      console.error('/help xatosi:', err.message);
    }
  });

  bot.onText(/^\/add(?:@\w+)?(?:\s+([\s\S]+))?\s*$/, async (msg, match) => {
    try {
      const chatId = String(msg.chat.id);
      await ensureUser(msg);
      const raw = (match && match[1]) || '';
      if (!raw.trim()) {
        await bot.sendMessage(
          chatId,
          'Foydalanish: <code>/add [HH:mm] vazifa matni</code>',
          HTML
        );
        return;
      }
      const { time, text } = parseTimePrefix(raw);
      if (!text) {
        await bot.sendMessage(chatId, 'Vazifa matni bo‘sh bo‘lishi mumkin emas.', HTML);
        return;
      }
      const task = await createTask(chatId, { time, text, repeat: 'once' });
      await bot.sendMessage(chatId, addedMessage(task), HTML);
    } catch (err) {
      console.error('/add xatosi:', err.message);
    }
  });

  bot.onText(/^\/har(?:@\w+)?(?:\s+([\s\S]+))?\s*$/, async (msg, match) => {
    try {
      const chatId = String(msg.chat.id);
      await ensureUser(msg);
      const raw = (match && match[1]) || '';
      if (!raw.trim()) {
        await bot.sendMessage(
          chatId,
          'Foydalanish: <code>/har [HH:mm] vazifa matni</code>\nMasalan: <code>/har 07:00 Ertalabki mashq</code>',
          HTML
        );
        return;
      }
      const { time, text } = parseTimePrefix(raw);
      if (!text) {
        await bot.sendMessage(chatId, 'Vazifa matni bo‘sh bo‘lishi mumkin emas.', HTML);
        return;
      }
      const task = await createTask(chatId, { time, text, repeat: 'daily' });
      await bot.sendMessage(chatId, addedMessage(task), HTML);
    } catch (err) {
      console.error('/har xatosi:', err.message);
    }
  });

  bot.onText(/^\/list(?:@\w+)?\b/, async (msg) => {
    try {
      const chatId = String(msg.chat.id);
      await ensureUser(msg);
      await sendTaskList(bot, chatId, { header: '🗓 <b>Bugungi vazifalar</b>' });
    } catch (err) {
      console.error('/list xatosi:', err.message);
    }
  });

  bot.onText(/^\/vaqt(?:@\w+)?(?:\s+(.+))?\s*$/, async (msg, match) => {
    try {
      const chatId = String(msg.chat.id);
      const user = await ensureUser(msg);
      const arg = (match && match[1] ? match[1] : '').trim();
      if (!isValidTime(arg)) {
        await bot.sendMessage(
          chatId,
          `Foydalanish: <code>/vaqt HH:mm</code>\nHozirgi vaqt: <b>${esc(user.dailyTime)}</b>`,
          HTML
        );
        return;
      }
      user.dailyTime = normalizeTime(arg);
      user.dailyNotifiedOn = ''; // yangi vaqt uchun bugun qayta yuborilishi mumkin
      await user.save();
      await bot.sendMessage(
        chatId,
        `⏰ Kunlik ro‘yxat endi har kuni soat <b>${esc(user.dailyTime)}</b> da keladi.`,
        HTML
      );
    } catch (err) {
      console.error('/vaqt xatosi:', err.message);
    }
  });

  bot.onText(/^\/tozala(?:@\w+)?\b/, async (msg) => {
    try {
      const chatId = String(msg.chat.id);
      await ensureUser(msg);
      const today = todayKey();
      const res = await Task.deleteMany({
        chatId,
        repeat: 'once',
        date: { $lt: today },
        'doneDates.0': { $exists: true },
      });
      await bot.sendMessage(
        chatId,
        `🧹 Tozalandi. O‘chirilgan vazifalar: <b>${res.deletedCount || 0}</b>`,
        HTML
      );
    } catch (err) {
      console.error('/tozala xatosi:', err.message);
    }
  });

  bot.onText(/^\/stop(?:@\w+)?\b/, async (msg) => {
    try {
      const user = await ensureUser(msg);
      user.active = false;
      await user.save();
      await bot.sendMessage(
        msg.chat.id,
        '⏸ Eslatmalar to‘xtatildi. Qayta yoqish uchun /davom yuboring.',
        HTML
      );
    } catch (err) {
      console.error('/stop xatosi:', err.message);
    }
  });

  bot.onText(/^\/davom(?:@\w+)?\b/, async (msg) => {
    try {
      const user = await ensureUser(msg);
      user.active = true;
      await user.save();
      await bot.sendMessage(msg.chat.id, '▶️ Eslatmalar qayta yoqildi.', HTML);
    } catch (err) {
      console.error('/davom xatosi:', err.message);
    }
  });

  // Buyruqsiz oddiy matn -> bugungi vazifa
  bot.on('message', async (msg) => {
    try {
      if (!msg.text) return;
      if (msg.text.startsWith('/')) return; // buyruqlar yuqorida ishlangan
      const chatId = String(msg.chat.id);
      await ensureUser(msg);
      const { time, text } = parseTimePrefix(msg.text);
      if (!text) return;
      const task = await createTask(chatId, { time, text, repeat: 'once' });
      await bot.sendMessage(chatId, addedMessage(task), HTML);
    } catch (err) {
      console.error('matn xabari xatosi:', err.message);
    }
  });

  bot.on('callback_query', (query) => handleCallback(bot, query));
}

// --- callback_query --------------------------------------------------------

async function handleCallback(bot, query) {
  try {
    const message = query.message;
    if (!message) {
      await bot.answerCallbackQuery(query.id);
      return;
    }
    const chatId = String(message.chat.id);
    const messageId = message.message_id;
    const [action, taskId] = String(query.data || '').split(':');

    const task = await Task.findOne({ _id: taskId, chatId });
    if (!task) {
      await bot.answerCallbackQuery(query.id, { text: 'Vazifa topilmadi' });
      try {
        await bot.editMessageText('❌ Vazifa topilmadi (o‘chirilgan bo‘lishi mumkin).', {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
        });
      } catch (e) {
        /* xabar allaqachon o'zgargan bo'lishi mumkin */
      }
      return;
    }

    if (action === 'done') {
      const today = todayKey();
      if (!task.doneDates.includes(today)) {
        task.doneDates.push(today);
        await task.save();
      }
      await bot.answerCallbackQuery(query.id, { text: 'Bajarildi ✅' });
      // Eski xabarni yangilaymiz, tugmalar olib tashlanadi (reply_markup berilmadi)
      await bot.editMessageText(taskLine(task), {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
      });
      return;
    }

    if (action === 'del') {
      await Task.deleteOne({ _id: task._id });
      await bot.answerCallbackQuery(query.id, { text: 'O‘chirildi 🗑' });
      await bot.editMessageText(`🗑 <s>${esc(task.text)}</s>`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
      });
      return;
    }

    await bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error('callback_query xatosi:', err.message);
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi' });
    } catch (e) {
      /* e'tiborsiz */
    }
  }
}

module.exports = {
  register,
  sendTaskList,
  taskLine,
  taskKeyboard,
  isDoneToday,
  esc,
};
