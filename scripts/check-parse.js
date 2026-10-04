// Tekshiruv: matn boshidagi HH:mm to'g'ri ajratilyaptimi?
const assert = require('assert');
const { parseTimePrefix, normalizeTime, isValidTime } = require('../src/utils/time');

const cases = [
  { in: '14:30 Test', time: '14:30', text: 'Test' },
  { in: 'Hisobot yozish', time: null, text: 'Hisobot yozish' },
  { in: '9:00 Yig‘ilish', time: '09:00', text: 'Yig‘ilish' }, // bir xonali soat normallashadi
  { in: '07:00 Ertalabki mashq', time: '07:00', text: 'Ertalabki mashq' },
  { in: '25:00 Notog‘ri soat', time: null, text: '25:00 Notog‘ri soat' }, // 25 -> soat yo'q
  { in: '7:5 Xato format', time: null, text: '7:5 Xato format' }, // daqiqa 2 xona emas
  { in: '   12:15    Bo‘sh joylar  ', time: '12:15', text: 'Bo‘sh joylar' },
];

let ok = 0;
for (const c of cases) {
  const res = parseTimePrefix(c.in);
  assert.strictEqual(res.time, c.time, `time mos emas: ${JSON.stringify(c)} -> ${JSON.stringify(res)}`);
  assert.strictEqual(res.text, c.text, `text mos emas: ${JSON.stringify(c)} -> ${JSON.stringify(res)}`);
  ok++;
}

// Talab qilingan asosiy holat
const r = parseTimePrefix('14:30 Test');
assert.strictEqual(r.time, '14:30');
assert.strictEqual(r.text, 'Test');

assert.strictEqual(isValidTime('08:30'), true);
assert.strictEqual(isValidTime('8:30'), true);
assert.strictEqual(isValidTime('24:00'), false);
assert.strictEqual(normalizeTime('9:5'), null);
assert.strictEqual(normalizeTime('9:05'), '09:05');

console.log(`✅ check-parse: ${ok}/${cases.length} holat + qo‘shimcha tekshiruvlar o‘tdi`);
