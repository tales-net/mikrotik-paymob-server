const express = require('express');
const { sendPaymentMessage } = require('./telegram');
require('dotenv').config();

const router = express.Router();

router.post('/paymob-webhook', async (req, res) => {
  try {
    const obj = req.body.obj;

    // لو مفيش بيانات في الطلب
    if (!obj) {
      return res.status(400).send("Bad Request");
    }

    // التحقق من نجاح الدفع
    if (obj.success === true) {
      const amount = (obj.amount_cents / 100).toFixed(0);
      const phone = obj.order?.billing_data?.phone_number || "غير محدد";
      const transactionId = obj.id || "غير متوفر";
      const orderId = obj.order?.merchant_order_id || `TALES-${obj.order?.id}`;
      const time = new Date().toLocaleString('ar-EG', { hour12: false });

      // استدعاء دالة إرسال رسالة لتليجرام
      await sendPaymentMessage({
        amount,
        phone,
        transactionId,
        orderId,
        time,
        integrationId: obj.integration_id
      });
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.status(500).send("Error");
  }
});

module.exports = router;
