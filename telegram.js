// telegram.js
const axios = require("axios");
const { getProfile } = require("./profiles");

// دالة إرسال رسالة لتليجرام بعد الدفع
async function sendPaymentMessage({ amount, phone, transactionId, orderId, time, integrationId }) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // تحديد اسم البروفايل بناءً على المبلغ
    const profileName = getProfile(parseInt(amount));

    // تجهيز الرسالة
    const message = `
✅ دفع ناجح
📱 رقم العميل: ${phone}
💰 المبلغ: ${amount} جنيه
👤 البروفايل: ${profileName}
🆔 رقم العملية: ${transactionId}
📦 رقم الطلب: ${orderId}
⏰ الوقت: ${time}
🔗 Integration ID: ${integrationId}
    `;

    // إرسال الرسالة باستخدام Telegram API
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    });

    console.log("✅ رسالة الدفع اتبعت لتليجرام بنجاح");
  } catch (err) {
    console.error("❌ خطأ في إرسال رسالة لتليجرام:", err.message);
  }
}

module.exports = { sendPaymentMessage };
