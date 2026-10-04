const { getData, persist } = require('../config/db');

// Foydalanuvchi maydonlari:
//  chatId, firstName, username, dailyTime ("HH:mm"), active,
//  dailyNotifiedOn — kunlik to'liq ro'yxat oxirgi marta yuborilgan sana ("YYYY-MM-DD").
//  Bot bir daqiqa ichida qayta ishga tushsa ham ro'yxat ikki marta ketmasligi uchun.
function defaults(chatId) {
  const now = new Date().toISOString();
  return {
    chatId,
    firstName: '',
    username: '',
    dailyTime: '09:00',
    active: true,
    dailyNotifiedOn: '',
    createdAt: now,
    updatedAt: now,
  };
}

function findByChatId(chatId) {
  return getData().users.find((u) => u.chatId === chatId) || null;
}

// Bor bo'lsa yangilaydi, bo'lmasa yaratadi
async function upsert(chatId, fields) {
  let user = findByChatId(chatId);
  if (!user) {
    user = defaults(chatId);
    getData().users.push(user);
  }
  Object.assign(user, fields, { updatedAt: new Date().toISOString() });
  await persist();
  return user;
}

function findActive() {
  return getData().users.filter((u) => u.active);
}

// Obyekt o'zgartirilgandan keyin faylga saqlash
async function save(user) {
  user.updatedAt = new Date().toISOString();
  await persist();
  return user;
}

module.exports = { findByChatId, upsert, findActive, save };
