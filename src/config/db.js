const fs = require('fs');
const path = require('path');

// Butun ma'lumot xotirada saqlanadi va har o'zgarishdan keyin JSON faylga yoziladi.
// Fayl tuzilishi: { users: [...], tasks: [...] }
let filePath = null;
let data = null;
let writeChain = Promise.resolve();

function emptyData() {
  return { users: [], tasks: [] };
}

// Faylni o'qiydi (bo'lmasa — bo'sh baza yaratadi)
async function connectDB(file) {
  filePath = path.resolve(file);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  let raw = null;
  try {
    raw = await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      data = { ...emptyData(), ...parsed };
    } catch (err) {
      // Buzilgan faylni ustidan yozib yubormaslik uchun to'xtaymiz
      throw new Error(`${filePath} fayli buzilgan (JSON xato): ${err.message}`);
    }
  } else {
    data = emptyData();
    await persist();
  }

  console.log(`✅ Ma'lumotlar fayli: ${filePath}`);
}

function getData() {
  if (!data) throw new Error('Baza hali yuklanmagan: avval connectDB() chaqiring');
  return data;
}

// Faylga xavfsiz yozish: avval vaqtinchalik faylga, keyin rename.
// Yozuvlar navbat bilan bajariladi, bir vaqtda ikkita yozuv bo'lmaydi.
function persist() {
  const snapshot = JSON.stringify(getData(), null, 2);
  const tmp = `${filePath}.tmp`;
  writeChain = writeChain
    .catch(() => {})
    .then(async () => {
      await fs.promises.writeFile(tmp, snapshot, 'utf8');
      await fs.promises.rename(tmp, filePath);
    });
  return writeChain;
}

module.exports = connectDB;
module.exports.getData = getData;
module.exports.persist = persist;
