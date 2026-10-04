const crypto = require('crypto');
const { getData, persist } = require('../config/db');
const { todayKey } = require('../utils/time');

// Vazifa maydonlari:
//  _id, chatId, text,
//  time — "HH:mm" yoki null,
//  repeat — 'once' | 'daily',
//  date — "YYYY-MM-DD", faqat once uchun,
//  doneDates — bajarilgan sanalar,
//  notifiedOn — vaqtli eslatma oxirgi yuborilgan sana

// Qisqa id: callback_data 64 baytdan oshmasligi kerak
function newId() {
  return crypto.randomBytes(8).toString('hex');
}

// Bugun bajarilganmi?
function isDoneToday(task, today = todayKey()) {
  return (task.doneDates || []).includes(today);
}

// Toza (bazasiz test qilinadigan) filtr: qaysi vazifalar bugungi ro'yxatga kiradi.
//  - barcha daily vazifalar
//  - sanasi bugungi bo'lgan once vazifalar
//  - sanasi o'tib ketgan, lekin umuman bajarilmagan once vazifalar (ro'yxatda ⚠️)
//  - kechagi (o'tgan kungi) once vazifa bugun bajarilgan bo'lsa — chizilgan holda qoladi
// Oldingi kunlarda bajarilib, bugun tegilmagan once vazifalar ro'yxatga tushmaydi.
function filterForToday(tasks, today = todayKey()) {
  return tasks.filter((t) => {
    if (t.repeat === 'daily') return true;
    if (t.date === today) return true;
    if (t.date && t.date < today) {
      if (isDoneToday(t, today)) return true;
      if ((t.doneDates || []).length === 0) return true;
      return false;
    }
    return false;
  });
}

// Ro'yxatni tartiblash: avval vaqtli vazifalar (soat bo'yicha), keyin vaqtsizlar.
function sortForToday(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

// --- Fayl bazasi bilan ishlash ------------------------------------------------

async function create(fields) {
  const now = new Date().toISOString();
  const task = {
    _id: newId(),
    chatId: fields.chatId,
    text: fields.text,
    time: fields.time || null,
    repeat: fields.repeat === 'daily' ? 'daily' : 'once',
    date: fields.date || null,
    doneDates: fields.doneDates || [],
    notifiedOn: fields.notifiedOn || '',
    createdAt: now,
    updatedAt: now,
  };
  getData().tasks.push(task);
  await persist();
  return task;
}

function findByChatId(chatId) {
  return getData().tasks.filter((t) => t.chatId === chatId);
}

function findOne(id, chatId) {
  return getData().tasks.find((t) => t._id === id && t.chatId === chatId) || null;
}

// Berilgan daqiqadagi vaqtli vazifalar
function findTimed(chatId, time) {
  return getData().tasks.filter((t) => t.chatId === chatId && t.time === time);
}

function forToday(chatId) {
  return sortForToday(filterForToday(findByChatId(chatId), todayKey()));
}

async function save(task) {
  task.updatedAt = new Date().toISOString();
  await persist();
  return task;
}

async function deleteById(id) {
  const data = getData();
  const before = data.tasks.length;
  data.tasks = data.tasks.filter((t) => t._id !== id);
  const deleted = before - data.tasks.length;
  if (deleted) await persist();
  return deleted;
}

// O'tgan kunlardagi bajarilgan bir martalik vazifalarni o'chiradi, o'chirilganlar sonini qaytaradi
async function deleteOldDone(chatId, today = todayKey()) {
  const data = getData();
  const before = data.tasks.length;
  data.tasks = data.tasks.filter(
    (t) =>
      !(
        t.chatId === chatId &&
        t.repeat === 'once' &&
        t.date &&
        t.date < today &&
        (t.doneDates || []).length > 0
      )
  );
  const deleted = before - data.tasks.length;
  if (deleted) await persist();
  return deleted;
}

module.exports = {
  create,
  findByChatId,
  findOne,
  findTimed,
  forToday,
  save,
  deleteById,
  deleteOldDone,
  // Toza yordamchilar (scheduler va testlar uchun)
  filterForToday,
  sortForToday,
  isDoneToday,
};
