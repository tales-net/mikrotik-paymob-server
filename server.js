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

function getProfile(amount) {
  const price = parseFloat(amount);
  if (price === 5)   return "Bronze (البرونزي)";
  if (price === 15)  return "Silver (الفضي)";
  if (price === 30)  return "Gold (الذهبي)";
  if (price === 50)  return "Platinum (البلاتينيوم)";
  if (price === 100) return "Diamond (الماس)";
  return "Bronze (البرونزي)";
}

// 1️⃣ الصفحة الرئيسية للتأكد أن السيرفر يعمل
app.get('/', (req, res) => {
  res.send('🚀 Mikrotik-Paymob Server is Live & Active!');
});

// 2️⃣ مسار الاختبار السريع (توليد كارت وهمي وتجربة التليجرام)
app.get('/test-voucher', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const profile = getProfile(15);
  
  try {
    await axios.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
      text: `🧪 *اختبار السيرفر والتليجرام*\n----------------------------\n💰 *المبلغ:* 15 جنيه\n🎟️ *الكارت المولد:* \`${code}\`\n📦 *البروفايل:* ${profile}`,
      parse_mode: 'Markdown'
    });
    res.json({ success: true, message: "تم توليد الكارت وتجربة التليجرام بنجاح", code, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3️⃣ مسار الدفع الديناميكي (يستقبل رقم المحفظة والمبلغ من الرابط ويحول لصفحة الدفع)
app.get('/api/pay', async (req, res) => {
  const phone = req.query.phone; // مثال: ?phone=01221695951
  const amount = req.query.amount || '5'; // افتراضي 5 جنيه لو لم يتم تحديده

  if (!phone) {
    return res.status(400).json({ success: false, error: "الرجاء إدخال رقم المحفظة، مثال: /api/pay?phone=01012345678&amount=5" });
  }

  try {
    const amountCents = (parseFloat(amount) * 100).toString();

    // أ. طلب توكن مصادقة من Paymob
    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: CONFIG.PAYMOB.API_KEY
    });
    const token = authRes.data.token;

    // ب. تسجيل طلب (Order)
    const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      items: []
    });
    const orderId = orderRes.data.id;

    // ج. طلب مفتاح دفع (Payment Key)
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

    // د. طلب الدفع بالمحفظة للرقم المدخل
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

// 4️⃣ استقبال إشعارات الدفع من Paymob (Webhook) وتوليد الكارت وإرساله للتليجرام فوراً
app.post('/paymob-webhook', async (req, res) => {
  try {
    const data = req.body;
    const obj = data.obj;

    if (!obj) return res.status(400).send("Bad Request");

    // التحقق المباشر من إتمام الدفع بنجاح
    if (obj.success === true) {
      const amount = (obj.amount_cents / 100).toFixed(0);
      const phone = obj.order && obj.order.billing_data && obj.order.billing_data.phone_number 
                    ? obj.order.billing_data.phone_number 
                    : "غير محدد";
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const profile = getProfile(amount);

      const message = `✅ *تم الدفع وتوليد الكارت بنجاح*\n----------------------------\n💰 *المبلغ:* ${amount} جنيه\n📞 *المحفظة:* \`${phone}\` \n🎟️ *الكارت المولد:* \`${code}\`\n📦 *البروفايل:* ${profile}`;

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
