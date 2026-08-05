const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { createPaymobPayment } = require('./pay');
const webhookRoutes = require('./webhook');
const { sendTestVoucher } = require('./telegram');

const app = express();
app.use(express.json());
app.use(cors());

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('🚀 Mikrotik-Paymob Server is Live & Active!');
});

// اختبار التليجرام
app.get('/test-voucher', async (req, res) => {
  try {
    await sendTestVoucher();
    res.json({ success: true, message: "تم إرسال رسالة الاختبار للتليجرام بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الدفع
app.get('/api/pay', async (req, res) => {
  const { phone, amount, method } = req.query;
  if (!phone || !amount) {
    return res.json({ success: false, error: "الرجاء إدخال رقم المحفظة والمبلغ، مثال: /api/pay?phone=01012345678&amount=30&method=wallet" });
  }

  try {
    const result = await createPaymobPayment(phone, amount, method);
    if (result.type === 'redirect') {
      res.redirect(result.url);
    } else {
      res.send(result.content);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook
app.use('/', webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
