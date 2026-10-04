// Tekshiruv: bir kunda ikkinchi marta eslatma yuborilmasligi (kod darajasida).
const assert = require('assert');
const { shouldNotifyTimed, shouldSendDailyList } = require('../src/scheduler');

const today = '2026-08-29';

// --- Vaqtli vazifa eslatmasi ---
const task = { repeat: 'once', doneDates: [], notifiedOn: '' };

// 1-chaqiruv: eslatma yuboriladi
assert.strictEqual(shouldNotifyTimed(task, today), true, 'birinchi marta yuborilishi kerak');

// Yuborilgach notifiedOn belgilanadi (scheduler shuni qiladi)
task.notifiedOn = today;

// 2-chaqiruv (o'sha kun, bot qayta ishga tushdi deb faraz qilamiz): yuborilmaydi
assert.strictEqual(shouldNotifyTimed(task, today), false, 'o‘sha kuni ikkinchi marta yuborilmasligi kerak');

// Ertasi kun: notifiedOn eski, yana yuboriladi
assert.strictEqual(shouldNotifyTimed(task, '2026-08-30'), true, 'ertasi kuni yana yuborilishi kerak');

// Bugun bajarilgan bo'lsa — eslatilmaydi
assert.strictEqual(
  shouldNotifyTimed({ repeat: 'daily', doneDates: [today], notifiedOn: '' }, today),
  false,
  'bugun bajarilgan vazifa eslatilmasligi kerak'
);

// --- Kunlik to'liq ro'yxat ---
const user = { active: true, dailyTime: '09:00', dailyNotifiedOn: '' };
assert.strictEqual(shouldSendDailyList(user, '09:00', today), true, 'vaqti kelganda ro‘yxat yuboriladi');
user.dailyNotifiedOn = today;
assert.strictEqual(shouldSendDailyList(user, '09:00', today), false, 'o‘sha kuni ikkinchi marta yuborilmaydi');
assert.strictEqual(shouldSendDailyList(user, '09:01', today), false, 'boshqa daqiqada yuborilmaydi');
assert.strictEqual(
  shouldSendDailyList({ active: false, dailyTime: '09:00', dailyNotifiedOn: '' }, '09:00', today),
  false,
  'to‘xtatilgan foydalanuvchiga yuborilmaydi'
);

console.log('✅ check-notify: bir kunda ikkinchi marta eslatma yuborilmaydi (vaqtli vazifa + kunlik ro‘yxat)');
