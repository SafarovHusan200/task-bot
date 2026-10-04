// Tekshiruv: forToday filtri uchta holatni ham to'g'ri qaytaradimi?
const assert = require('assert');
const Task = require('../src/models/task.model');

const today = '2026-08-29';
const yesterday = '2026-08-28';

const sample = [
  { _id: 'a', repeat: 'daily', text: 'Ertalabki mashq', time: '07:00', date: null, doneDates: [] },
  { _id: 'b', repeat: 'once', text: 'Bugungi once', time: null, date: today, doneDates: [] },
  { _id: 'c', repeat: 'once', text: 'Kechagi bajarilmagan once', time: null, date: yesterday, doneDates: [] },
  { _id: 'd', repeat: 'once', text: 'Kechagi bajarilgan once', time: null, date: yesterday, doneDates: [yesterday] },
  { _id: 'e', repeat: 'once', text: 'Kecha qo‘shilib, bugun bajarilgan', time: null, date: yesterday, doneDates: [today] },
  { _id: 'f', repeat: 'daily', text: 'Bugun bajarilgan daily', time: null, date: null, doneDates: [today] },
];

const got = Task.filterForToday(sample, today).map((t) => t._id).sort();

// Kutilgan: daily lar (a, f), bugungi once (b), kechagi bajarilmagan once (c),
// kecha qo‘shilib bugun bajarilgan (e). "d" (kecha bajarilgan) ro‘yxatga TUSHMAYDI.
assert.deepStrictEqual(got, ['a', 'b', 'c', 'e', 'f']);

// Uchta asosiy holat alohida
const byId = (id) => sample.find((t) => t._id === id);
assert.ok(Task.filterForToday([byId('a')], today).length === 1, 'daily kirishi kerak');
assert.ok(Task.filterForToday([byId('b')], today).length === 1, 'bugungi once kirishi kerak');
assert.ok(Task.filterForToday([byId('c')], today).length === 1, 'kechagi bajarilmagan once kirishi kerak (⚠️)');
assert.ok(Task.filterForToday([byId('d')], today).length === 0, 'kechagi bajarilgan once kirmasligi kerak');

// Tartiblash: vaqtlilar oldinda
const sorted = Task.sortForToday(Task.filterForToday(sample, today));
assert.strictEqual(sorted[0]._id, 'a', 'vaqti bor vazifa birinchi bo‘lishi kerak');

console.log('✅ check-fortoday: daily / bugungi once / kechagi bajarilmagan once — hammasi to‘g‘ri, tartib ham to‘g‘ri');
