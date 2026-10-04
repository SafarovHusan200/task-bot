const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    chatId: { type: String, required: true, unique: true },
    firstName: { type: String, default: '' },
    username: { type: String, default: '' },
    dailyTime: { type: String, default: '09:00' },
    active: { type: Boolean, default: true },
    // Kunlik to'liq ro'yxat oxirgi marta yuborilgan sana ("YYYY-MM-DD").
    // Bot bir daqiqa ichida qayta ishga tushsa ham ro'yxat ikki marta ketmasligi uchun.
    dailyNotifiedOn: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);
