# Telegram vazifa-eslatma boti

Foydalanuvchining kunlik vazifalarini saqlaydi va belgilangan vaqtda eslatib turadi.

- **Stack:** Node.js (CommonJS), `node-telegram-bot-api` (polling), JSON fayl (bazasiz),
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
#   DATA_FILE  — ixtiyoriy, standart data/db.json
#   TZ_NAME    — Asia/Tashkent

# 3. Ishga tushirish
npm start
```

Alohida baza kerak emas: barcha ma’lumotlar `data/db.json` faylida saqlanadi (fayl
birinchi ishga tushishda o‘zi yaratiladi). Bot ishga tushganda konsolda
`✅ Ma'lumotlar fayli: ...` va `🤖 Bot ishga tushdi (polling rejimi)` ko‘rinadi.

Ma’lumotlar xotirada turadi va har o‘zgarishdan keyin faylga yoziladi (avval `.tmp`
faylga, keyin `rename` — yozish paytida bot to‘xtasa ham fayl buzilmaydi). Zaxira
nusxa olish uchun shu faylni nusxalash kifoya.

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

`data/db.json` tuzilishi: `{ "users": [...], "tasks": [...] }`.

**User:** `chatId` (yagona), `firstName`, `username`, `dailyTime` (default `"09:00"`),
`active` (default `true`), `dailyNotifiedOn`, timestamps.

**Task:** `_id` (16 belgili hex), `chatId`, `text`, `time` (`"HH:mm"` yoki `null`), `repeat` (`"once"` | `"daily"`),
`date` (`"YYYY-MM-DD"`, faqat `once`), `doneDates` (string massiv), `notifiedOn` (string), timestamps.

## Fayl tuzilishi

```
index.js                 # kirish nuqtasi: bot + fayl bazasi + scheduler ulanadi
src/config/db.js         # JSON fayl bazasi (yuklash va xavfsiz yozish)
src/models/user.model.js
src/models/task.model.js  # forToday shu yerda
data/db.json             # ma'lumotlar (git'ga qo'shilmaydi)
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
