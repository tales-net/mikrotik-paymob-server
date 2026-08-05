const express = require("express");
const router = express.Router();
const { sendTelegramMessage } = require("./telegram");
const { getProfile } = require("./profiles");
const { generateVoucherCode } = require("./voucher");

router.post("/webhook", async (req, res) => {
  try {
    // التحقق من مكان الكائن (Paymob قد يرسل obj أو الجسم مباشرة)
    const data = req.body;
    const obj = data.obj || data;

    if (!obj) {
      console.error("⚠️ Webhook Received empty payload");
      return res.status(400).send("Invalid payload");
    }

    // التحقق من حالة نجاح المعاملة
    const isSuccess = obj.success === true || obj.success === "true";

    if (isSuccess) {
      // 1. استخراج المبلغ وتوليد كارت الإنترنت للعمليات الناجحة
      const amountCents = obj.amount_cents || (obj.order && obj.order.amount_cents) || 0;
      const amount = (amountCents / 100).toFixed(2);
      
      const profileInfo = getProfile(amount);
      const voucherCode = generateVoucherCode();

      // إرفاق الكارت والباقة مع كائن البيانات لإرسالها في تليجرام
      obj.voucher_code = voucherCode;
      obj.package_info = profileInfo;

      await sendTelegramMessage(obj, true);
      console.log(`✅ دفع ناجح برقم عملية: ${obj.id} | كارت: ${voucherCode}`);
    } else {
      await sendTelegramMessage(obj, false);
      console.log(`❌ دفع فاشل برقم عملية: ${obj.id || 'غير معروف'}`);
    }

    // إرجاع استجابة 200 لـ Paymob ليتوقف عن إعادة الإرسال
    res.status(200).send("Webhook received successfully");
  } catch (err) {
    console.error("❌ خطأ في معالجة الـ Webhook:", err.message);
    res.status(500).send("Error processing webhook");
  }
});

module.exports = router;
