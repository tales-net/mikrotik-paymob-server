const express = require('express');
const axios = require('axios');
const cors = require('cors');

const CONFIG = {
  PORT: process.env.PORT || 3000,
  PAYMOB: {
    API_KEY: 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T0RneU5ERTNMQ0p1WVcxbElqb2lNVGM0TlRZeE5ESXdPQzQzTmpNMU1Ua2lmUS50Sm10SFlkdkYzVzlOYXJOcUk2YTBHTThvWWszUmN1OURBdFU3Q0tFeTB4R0JONnhOWmlLSW93N2xiRHlEanJzOTd5UjVnVjJMaDItME85ODJIYThuQQ==',
    WALLET_INTEGRATION_ID: '5406863'
  },
  TELEGRAM: {
    BOT_TOKEN: '8415838863:AAEopSGXgg4SlX4oYh3RHpXhL6prGSrOpiY',
    CHAT_ID: '5359443583'
  }
};

const app = express();
app.use(express.json());
app.use(cors());

// دالة ذكية لتحديد الباقة أو اعتبارها هدية/مبلغ إضافي
function getProfile(amount) {
  const price = parseFloat(amount);
  
  // أقل باقة هي 5 جنيه. إذا كان أقل من 5، نعتبرها هدية أو مبلغ إضافي بدون كارت
  if (price < 5) {
    return { isVoucher: false, name: "هدية / مبلغ إضافي (بدون كارت)" };
  }

  if (price >= 100) return { isVoucher: true, name: "Diamond (الماس)" };
  if (price >= 50)  return { isVoucher: true, name: "Platinum (البلاتينيوم)" };
  if (price >= 30)  return { isVoucher: true, name: "Gold (الذهبي)" };
  if (price >= 15)  return { isVoucher: true, name: "Silver (الفضي)" };
  if (price >= 5)   return { isVoucher: true, name: "Bronze (البرونزي)" };

  return { isVoucher: false, name: "هدية / مبلغ إضافي (بدون كارت)" };
}

// 1️⃣ الصفحة الرئيسية للتأكد أن السيرفر يعمل
app.get('/', (req, res) => {
  res.send('🚀 Mikrotik-Paymob Server is Live & Active!');
});

// 2️⃣ مسار الاختبار السريع
app.get('/test-voucher', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const profileInfo = getProfile(15);
  
  try {
    await axios.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
      text: `🧪 *اختبار السيرفر والتليجرام*\n----------------------------\n💰 *المبلغ المدفوع:* 15 جنيه\n📞 *المحفظة:* \`01221695951\`\n🎟️ *الكارت المولد:* \`${code}\`\n📦 *الباقة:* ${profileInfo.name}`,
      parse_mode: 'Markdown'
    });
    res.json({ success: true, message: "تم توليد الكارت وتجربة التليجرام بنجاح", code, profile: profileInfo.name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3️⃣ مسار الدفع الديناميكي
app.get('/api/pay', async (req, res) => {
  const phone = req.query.phone;
  const amount = req.query.amount || '5';

  if (!phone) {
    return res.status(400).json({ success: false, error: "الرجاء إدخال رقم المحفظة، مثال: /api/pay?phone=01012345678&amount=5" });
  }

  try {
    const amountCents = (parseFloat(amount) * 100).toString();

    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: CONFIG.PAYMOB.API_KEY
    });
    const token = authRes.data.token;

    const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      items: []
    });
    const orderId = orderRes.data.id;

    const keyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: "NA",
        email: "customer@tales.com",
        floor: "NA",
        first_name: "Customer",
        street: "NA",
        building: "NA",
        phone_number: phone,
        shipping_method: "NA",
        postal_code: "NA",
        city: "Cairo",
        country: "EG",
        last_name: "User",
        state: "Cairo"
      },
      currency: "EGP",
      integration_id: CONFIG.PAYMOB.WALLET_INTEGRATION_ID
    });
    const paymentKey = keyRes.data.token;

    const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
      source: {
        identifier: phone,
        subtype: "WALLET"
      },
      payment_token: paymentKey
    });

    const payUrl = walletRes.data.redirect_url || walletRes.data.iframe_redirection_url;
    if (payUrl) {
      return res.redirect(payUrl);
    } else {
      res.json({ success: true, data: walletRes.data });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// 4️⃣ استقبال إشعارات الدفع من Paymob (Webhook) مع التحقق من الهدايا أو الباقات
app.post('/paymob-webhook', async (req, res) => {
  try {
    const data = req.body;
    const obj = data.obj || data;

    if (obj.success === true || obj.success === "true") {
      const amountCents = obj.amount_cents || (obj.order && obj.order.amount_cents) || 500;
      const amount = (amountCents / 100).toFixed(2);
      
      // استخراج رقم محفظة العميل الفعلي بدقة تامة
      let phone = "غير محدد";
      if (obj.order && obj.order.billing_data && obj.order.billing_data.phone_number) {
        phone = obj.order.billing_data.phone_number;
      } else if (obj.source_data && obj.source_data.pan) {
        phone = obj.source_data.pan;
      } else if (obj.data && obj.data.pan) {
        phone = obj.data.pan;
      }

      const profileInfo = getProfile(amount);
      let message = "";

      if (profileInfo.isVoucher) {
        // إذا كان المبلغ يغطي باقة، يتم توليد الكارت بشكل طبيعي
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        message = `✅ *تم الدفع وتوليد الكارت بنجاح*\n----------------------------\n💵 *المبلغ المدفوع:* \`${amount}\` جنيه\n📞 *رقم محفظة العميل:* \`${phone}\` \n🎟️ *الكارت المولد:* \`${code}\`\n📦 *الباقة المفعلة:* ${profileInfo.name}`;
      } else {
        // إذا كان المبلغ أقل من 5 جنيه (يعتبر هدية أو تحويل إضافي بدون كارت)
        message = `🎁 *تم استلام مبلغ (هدية / بدون كارت)*\n----------------------------\n💵 *المبلغ المدفوع:* \`${amount}\` جنيه\n📞 *رقم محفظة العميل:* \`${phone}\` \n⚠️ *ملاحظة:* المبلغ أقل من الحد الأدنى للباقات، لذا لم يتم توليد كارت وتم اعتباره هدية.`;
      }

      await axios.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
        chat_id: CONFIG.TELEGRAM.CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      });
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.status(500).send("Error");
  }
});

app.listen(CONFIG.PORT, () => console.log(`🚀 Server on port ${CONFIG.PORT}`));
