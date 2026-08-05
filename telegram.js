// telegram.js
const axios = require("axios");
const { getProfile } = require("./profiles");

// خريطة معرفات التكامل إلى أسماء الخدمات
const integrationNames = {
  [process.env.WALLET_INTEGRATION_ID]: "محفظة",
  [process.env.CARD_INTEGRATION_ID]: "كارت",
  [process.env.AMAN_INTEGRATION_ID]: "أمان",
  [process.env.VALU_INTEGRATION_ID]: "فاليو",
  [process.env.SEVEN_INTEGRATION_ID]: "سفين"
};

async function sendPaymentMessage({ amount, phone, transactionId, orderId, time, integrationId }) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const profileName = getProfile(parseInt(amount));

    // تحديد اسم الخدمة من معرف التكامل
    const serviceName = integrationNames[integrationId] || `Integration ${integrationId}`;

    // لو فيه رقم محفظة أو بيانات بطاقة
    let clientInfo = phone && phone !== "غير محدد" ? phone : "لم يتم تحديد";
    
    // تجهيز الرسالة
    const message = `
✅ دفع ناجح
📱 بيانات العميل: ${clientInfo}
💰 المبلغ: ${amount} جنيه
👤 البروفايل: ${profileName}
🆔 رقم العملية: ${transactionId}
🎫 رقم الكارت/الطلب: ${orderId}
⏰ الوقت: ${time}
🔗 طريقة الدفع: ${serviceName}
    `;

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
