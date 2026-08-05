const axios = require("axios");

async function sendTelegramMessage(obj, success) {
  const amount = (obj.amount_cents / 100).toFixed(0);
  const phone = obj.order?.billing_data?.phone_number || "غير محدد";
  const method = obj.payment_method?.type || "غير معروف";
  const transactionId = obj.id || "غير متوفر";
  const orderId = obj.order?.merchant_order_id || `TALES-${obj.order?.id}`;
  const time = new Date().toLocaleString('ar-EG', { hour12: false });

  const message = `${success ? "✅ دفع ناجح" : "❌ دفع فاشل"}
━━━━━━━━━━━━━━
💳 رقم العملية: ${transactionId}
🆔 رقم الطلب: ${orderId}
💰 المبلغ: ${amount} جنيه
📱 العميل: ${phone}
💳 الوسيلة: ${method}
⏰ الوقت: ${time}
━━━━━━━━━━━━━━`;

  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });
}

module.exports = { sendTelegramMessage };
