const express = require("express");
const router = express.Router();
const { sendTelegramMessage } = require("./telegram");
const { getProfile } = require("./profiles");
const { generateVoucherCode } = require("./voucher");

router.post("/paymob-webhook", async (req, res) => {
  try {
    // استقبال البيانات من Paymob سواء كانت مباشرة أو داخل obj
    const data = req.body;
    const obj = data.obj || data;

    if (!obj || !obj.id) {
      console.error("⚠️ Webhook Received empty or invalid payload");
      return res.status(200).send("Invalid payload but acknowledged");
    }

    // التحقق من النجاح (Paymob يرسل success كـ boolean)
    const isSuccess = obj.success === true || obj.success === "true";

    if (isSuccess) {
      const amountCents = obj.amount_cents || obj.order?.amount_cents || 0;
      const amount = (amountCents / 100).toFixed(2);
      
      let profileInfo = "باقة إنترنت";
      let voucherCode = "غير متوفر";

      if (typeof getProfile === 'function') profileInfo = getProfile(amount);
      if (typeof generateVoucherCode === 'function') voucherCode = generateVoucherCode();

      // إرفاق بيانات الكارت المولد مع كائن العملية
      obj.voucher_code = voucherCode;
      obj.package_info = profileInfo;

      // إرسال الإشعار الثاني لتليجرام (تأكيد الدفع الفعلي)
      await sendTelegramMessage(obj, true);
      console.log(`✅ [Webhook] دفع ناجح برقم عملية: ${obj.id} | الكارت: ${voucherCode}`);
    } else {
      await sendTelegramMessage(obj, false);
      console.log(`❌ [Webhook] دفع فاشل برقم عملية: ${obj.id}`);
    }

    // إرجاع استجابة 200 فورية لـ Paymob
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ خطأ في معالجة الـ Webhook:", err.message);
    res.status(200).send("Error handled");
  }
});

module.exports = router;
