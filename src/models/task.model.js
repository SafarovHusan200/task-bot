const { Schema, model } = require('mongoose');
const { todayKey } = require('../utils/time');

const taskSchema = new Schema(
  {
    chatId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    time: { type: String, default: null }, // "HH:mm" yoki null
    repeat: { type: String, enum: ['once', 'daily'], default: 'once' },
    date: { type: String, default: null }, // "YYYY-MM-DD", faqat once uchun
    doneDates: { type: [String], default: [] }, // bajarilgan sanalar
    notifiedOn: { type: String, default: '' }, // vaqtli eslatma oxirgi yuborilgan sana
  },
  { timestamps: true }
);

// Bugun bajarilganmi?
function isDoneToday(task, today = todayKey()) {
  return (task.doneDates || []).includes(today);
}

// Toza (DB'siz test qilinadigan) filtr: qaysi vazifalar bugungi ro'yxatga kiradi.
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

taskSchema.statics.forToday = async function (chatId) {
  const tasks = await this.find({ chatId });
  const today = todayKey();
  return sortForToday(filterForToday(tasks, today));
};

const Task = model('Task', taskSchema);

// Toza yordamchilarni ham tashqariga chiqaramiz (scheduler va testlar uchun)
Task.filterForToday = filterForToday;
Task.sortForToday = sortForToday;
Task.isDoneToday = isDoneToday;

module.exports = Task;
