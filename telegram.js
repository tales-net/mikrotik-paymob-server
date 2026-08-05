const axios = require('axios');
const { getProfile } = require('./profiles');
const { generateVoucher } = require('./voucher');
require('dotenv').config();

async function sendTelegramMessage(text) {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'Markdown'
  });
}

async function sendTestVoucher() {
  const code = generateVoucher();
  const message = `🔔 رسالة اختبار من السيرفر
━━━━━━━━━━━━━━
🎫 كود تجريبي: ${code}
🕒 الوقت: ${new Date().toLocaleString('ar-EG', { hour12: false })}
━━━━━━━━━━━━━━`;
  await sendTelegramMessage(message);
}

async function sendPaymentMessage(obj, methodName) {
  const amount = (obj.amount_cents / 100).toFixed(0);
  const phone = obj.order?.billing_data?.phone_number || "غير محدد";
  const code = generateVoucher();
  const profile = getProfile(parseInt(amount));

  const transactionId = obj.id || "غير متوفر";
  const orderId = obj.order?.merchant_order_id || `TALES-${obj.order?.id}`;
  const time = new Date().toLocaleString('ar-EG', { hour12: false });

  const message = `✅ تم الدفع بنجاح
━━━━━━━━━━━━━━
💳 رقم العملية
${transactionId}

📦 الباقة
${profile}

💰 المبلغ
${amount} جنيه

📱 المحفظة
${phone}

🆔 Order
${orderId}

🎫 الكارت
${code}

💳 وسيلة الدفع
${methodName}

🕒 الوقت
${time}
━━━━━━━━━━━━━━`;

  await sendTelegramMessage(message);
}

module.exports = { sendTelegramMessage, sendTestVoucher, sendPaymentMessage };
