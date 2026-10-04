const cron = require('node-cron');
const User = require('./models/user.model');
const Task = require('./models/task.model');
const { TZ, todayKey, currentHHmm } = require('./utils/time');
const { sendTaskList, taskLine, taskKeyboard } = require('./handlers');

// Vaqtli vazifa uchun eslatma yuborilsinmi?
// Bir kunda ikki marta yubormaslik uchun notifiedOn (oxirgi eslatma sanasi) tekshiriladi.
// Bot qayta ishga tushsa ham notifiedOn bazada saqlanib qolgani uchun takror ketmaydi.
function shouldNotifyTimed(task, today) {
  if (task.notifiedOn === today) return false;
  const doneDates = task.doneDates || [];
  if (doneDates.includes(today)) return false;
  // Bir martalik vazifa avval bajarilgan bo'lsa — boshqa eslatilmaydi
  if (task.repeat === 'once' && doneDates.length > 0) return false;
  return true;
}

// Kunlik to'liq ro'yxat yuborilsinmi?
function shouldSendDailyList(user, hhmm, today) {
  return user.active && user.dailyTime === hhmm && user.dailyNotifiedOn !== today;
}

async function tick(bot) {
  const today = todayKey();
  const hhmm = currentHHmm();

  const users = await User.find({ active: true });

  for (const user of users) {
    try {
      // 1) Kunlik to'liq ro'yxat
      if (shouldSendDailyList(user, hhmm, today)) {
        await sendTaskList(bot, user.chatId, { header: '🗓 <b>Bugungi vazifalar</b>' });
        user.dailyNotifiedOn = today;
        await user.save();
      }

      // 2) Vaqti ko'rsatilgan vazifalar — o'z vaqtida alohida eslatma
      const timed = await Task.find({ chatId: user.chatId, time: hhmm });
      for (const task of timed) {
        try {
          if (!shouldNotifyTimed(task, today)) continue;
          await bot.sendMessage(user.chatId, `⏰ <b>Eslatma</b>\n${taskLine(task)}`, {
            parse_mode: 'HTML',
            reply_markup: taskKeyboard(task),
          });
          task.notifiedOn = today;
          await task.save();
        } catch (err) {
          // Bitta vazifadagi xato boshqalarini to'xtatmasin
          console.error(`Eslatma xatosi (chatId=${user.chatId}, task=${task._id}):`, err.message);
        }
      }
    } catch (err) {
      // Bitta foydalanuvchidagi xato (masalan, botni bloklagan) butun siklni to'xtatmasin
      console.error(`Scheduler foydalanuvchi xatosi (chatId=${user.chatId}):`, err.message);
    }
  }
}

function start(bot) {
  // Yagona cron: har daqiqada, Asia/Tashkent zonasida. Har foydalanuvchi uchun alohida cron YO'Q.
  cron.schedule('* * * * *', () => {
    tick(bot).catch((err) => console.error('Scheduler tick xatosi:', err.message));
  }, { timezone: TZ });

  console.log(`⏰ Scheduler ishga tushdi (${TZ}, har daqiqada)`);
}

module.exports = { start, tick, shouldNotifyTimed, shouldSendDailyList };
