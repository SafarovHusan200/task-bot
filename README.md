# Telegram vazifa-eslatma boti

Foydalanuvchining kunlik vazifalarini saqlaydi va belgilangan vaqtda eslatib turadi.

- **Stack:** Node.js (CommonJS), `node-telegram-bot-api` (polling), MongoDB + Mongoose,
  `node-cron`, `dayjs` (utc/timezone), `dotenv`
- **Vaqt zonasi:** barcha hisob-kitoblar `Asia/Tashkent` (yoki `.env` dagi `TZ_NAME`) bo‘yicha,
  server UTC bo‘lsa ham eslatmalar to‘g‘ri vaqtda keladi.

## O‘rnatish

```bash
# 1. Paketlar
npm install

# 2. Sozlamalar
cp .env.example .env
#   .env ni to‘ldiring:
#   BOT_TOKEN  — @BotFather dan
#   MONGO_URI  — masalan mongodb://127.0.0.1:27017/vazifa_bot
#   TZ_NAME    — Asia/Tashkent

# 3. Ishga tushirish
npm start
```

MongoDB local yoki MongoDB Atlas bo‘lishi mumkin. Bot ishga tushganda konsolda
`✅ MongoDB ulandi` va `🤖 Bot ishga tushdi (polling rejimi)` ko‘rinadi.

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `/start` | Foydalanuvchini bazaga yozadi, salomlashadi, qisqa yo‘riqnoma beradi |
| `/help` | Buyruqlar ro‘yxati |
| `/add Hisobot yozish` | Bugungi bir martalik vazifa |
| `/add 14:30 Uchrashuv` | Vaqti ko‘rsatilgan vazifa — o‘sha vaqtda alohida eslatma keladi |
| `/har 07:00 Ertalabki mashq` | Har kuni takrorlanadigan vazifa |
| `/list` | Bugungi ro‘yxat, har bir bajarilmagan vazifa yonida inline tugmalar |
| `/vaqt 08:30` | Kunlik ro‘yxat keladigan vaqtni o‘zgartiradi (default `09:00`) |
| `/tozala` | Oldingi kunlarda bajarilgan bir martalik vazifalarni o‘chiradi |
| `/stop` | Eslatmalarni to‘xtatadi |
| `/davom` | Eslatmalarni qayta yoqadi |

Buyruqsiz oddiy matn yuborilsa ham bugungi vazifa sifatida qo‘shiladi. Matn boshida
`HH:mm` bo‘lsa, u vaqt sifatida ajratib olinadi (`9:00` ham `09:00` ga keltiriladi).

### Inline tugmalar

`/list` va eslatma xabarlarida har bir bajarilmagan vazifada **✅ Bajarildi** va **🗑** tugmalari bo‘ladi:

- tugma bosilganda `answerCallbackQuery` bilan qisqa javob beriladi;
- eski xabar `editMessageText` orqali yangilanadi (yangi xabar yuborilmaydi);
- bajarilgan vazifa `<s>chizilgan</s>` holatda qoladi.

## Ishlash mantig‘i

- **Yagona cron**, `* * * * *` (har daqiqada), zona `Asia/Tashkent`. Har foydalanuvchi
  uchun alohida cron yaratilmaydi.
- Har daqiqada:
  1. Foydalanuvchining `dailyTime` qiymati hozirgi `HH:mm` ga teng bo‘lsa — unga bugungi
     to‘liq ro‘yxat yuboriladi (`User.dailyNotifiedOn` orqali kuniga bir marta).
  2. `time` maydoni to‘ldirilgan vazifalar o‘z vaqtida alohida eslatma oladi
     (`Task.notifiedOn` orqali kuniga bir marta; bot qayta ishga tushsa ham takror bo‘lmaydi).
- **Har kunlik vazifa hech qachon o‘chirilmaydi va `done` qilinmaydi.** Bajarilgan sana
  `doneDates` massiviga qo‘shiladi, shuning uchun ertasi kuni vazifa avtomatik yana faol
  bo‘ladi. Statistika ham shu maydondan hisoblanadi.
- `Task.forToday(chatId)` bugungi ro‘yxatni qaytaradi: barcha `daily` vazifalar +
  bugungi `once` vazifalar + sanasi o‘tib ketgan, lekin hali bajarilmagan `once` vazifalar
  (ro‘yxatda ⚠️ bilan). Oldingi kunlarda bajarilgan `once` vazifalar ro‘yxatga tushmaydi,
  lekin bugun bajarilgani chizilgan holda qoladi.
- Bitta foydalanuvchiga xabar yuborishdagi xato (masalan, botni bloklagan) butun cron
  siklini to‘xtatmaydi — har biri `try/catch` ichida.

## Ma’lumotlar modeli

**User:** `chatId` (unique), `firstName`, `username`, `dailyTime` (default `"09:00"`),
`active` (default `true`), `dailyNotifiedOn`, timestamps.

**Task:** `chatId`, `text`, `time` (`"HH:mm"` yoki `null`), `repeat` (`"once"` | `"daily"`),
`date` (`"YYYY-MM-DD"`, faqat `once`), `doneDates` (string massiv), `notifiedOn` (string), timestamps.

## Fayl tuzilishi

```
index.js                 # kirish nuqtasi: bot + DB + scheduler ulanadi
src/config/db.js         # mongoose ulanishi
src/models/user.model.js
src/models/task.model.js  # forToday statik metodi shu yerda
src/utils/time.js        # dayjs helperlari (Asia/Tashkent)
src/handlers.js          # barcha buyruqlar va callback_query
src/scheduler.js         # cron logikasi
scripts/                 # tekshiruv skriptlari
```

## Tekshiruv

```bash
npm test          # node --check + parse + forToday + notify testlari
# yoki alohida:
npm run check
npm run test:parse
npm run test:fortoday
npm run test:notify
```

## Serverga joylash (PM2)

```bash
npm install -g pm2
pm2 start index.js --name vazifa-bot
pm2 save
pm2 startup        # server qayta yuklanganda avtomatik ishga tushishi uchun
pm2 logs vazifa-bot
```

> ⚠️ **Ogohlantirish:** `polling: true` rejimida bot faqat **bitta nusxada** ishlashi kerak.
> PM2 cluster mode (`pm2 start index.js -i 2`) ishlatilsa, Telegram bir vaqtning o‘zida
> ikki nusxa `getUpdates` chaqirgani uchun **`409 Conflict`** xatosini qaytaradi.
> Har doim oddiy (fork) rejimda, bitta instansiyada ishga tushiring.
