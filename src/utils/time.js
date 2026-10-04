// Vaqt bilan ishlash uchun yagona joy. Hamma yerda shu helperlar ishlatiladi,
// hech qayerda to'g'ridan-to'g'ri new Date() ishlatilmaydi. Server UTC bo'lsa ham
// eslatmalar Asia/Tashkent zonasida to'g'ri hisoblanadi.
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = process.env.TZ_NAME || 'Asia/Tashkent';

// Hozirgi payt, kerakli vaqt zonasida
const now = () => dayjs().tz(TZ);

// Bugungi kun kaliti: "YYYY-MM-DD"
const todayKey = () => now().format('YYYY-MM-DD');

// Hozirgi soat va daqiqa: "HH:mm"
const currentHHmm = () => now().format('HH:mm');

// "9:5", "24:00" kabi qiymatlarni "HH:mm" ko'rinishiga keltiradi yoki null qaytaradi
function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

const isValidTime = (value) => normalizeTime(value) !== null;

// Matn boshidagi "HH:mm" ni ajratib oladi: "14:30 Uchrashuv" -> { time: "14:30", text: "Uchrashuv" }
// Vaqt bo'lmasa yoki noto'g'ri bo'lsa: { time: null, text: <butun matn> }
function parseTimePrefix(input) {
  const trimmed = String(input == null ? '' : input).trim();
  const m = trimmed.match(/^(\d{1,2}:\d{2})\s+([\s\S]+)$/);
  if (m) {
    const time = normalizeTime(m[1]);
    if (time) return { time, text: m[2].trim() };
  }
  return { time: null, text: trimmed };
}

module.exports = {
  dayjs,
  TZ,
  now,
  todayKey,
  currentHHmm,
  normalizeTime,
  isValidTime,
  parseTimePrefix,
};
