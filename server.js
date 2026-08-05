const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

const CONFIG = {
  PORT: process.env.PORT || 3000,
  PAYMOB: {
    API_KEY: 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T0RneU5ERTNMQ0p1WVcxbElqb2lNVGM0TlRZeE5ESXdPQzQzTmpNMU1Ua2lmUS50Sm10SFlkdkYzVzlOYXJOcUk2YTBHTThvWWszUmN1OURBdFU3Q0tFeTB4R0JONnhOWmlLSW93N2xiRHlEanJzOTd5UjVnVjJMaDItME85ODJIYThuQQ==',
    HMAC_SECRET: '3EB1A996C1BBAFF41BAC83E5EDC6A725',
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
  if (price === 50)  return "Platinum ( البلاتينيوم)";
  if (price === 100) return "Diamond (الماس)";
  return "Bronze (البرونزي)";
}

// اختبار السيرفر والبوت
app.get('/', (req, res) => {
  res.send('🚀 Mikrotik-Paymob Server is Live & Active!');
});

app.get('/test-voucher', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const profile = getProfile(15);
  
  try {
    await axios.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
      text: `🧪 *اختبار السيرفر والتليجرام*\n----------------------------\n💰 *المبلغ:* 15 جنيه\n📞 *المحفظة:* \`01000000000\`\n🎟️ *الكارت المولد:* \`${code}\`\n📦 *البروفايل:* ${profile}`,
      parse_mode: 'Markdown'
    });
    res.json({ success: true, message: "تم توليد الكارت وتجربة التليجرام بنجاح", code, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// استقبال إشعارات الدفع من Paymob
app.post('/paymob-webhook', async (req, res) => {
  try {
    const receivedHmac = req.query.hmac || req.headers['hmac'];
    const data = req.body;
    const obj = data.obj;

    if (!obj) return res.status(400).send("Bad Request");

    const concatString = 
      (obj.amount_cents || '') +
      (obj.created_at || '') +
      (obj.currency || '') +
      (obj.error_occured || '') +
      (obj.has_parent_transaction || '') +
      (obj.id || '') +
      (obj.integration_id || '') +
      (obj.is_3d_secure || '') +
      (obj.is_auth || '') +
      (obj.is_capture || '') +
      (obj.is_refunded || '') +
      (obj.is_standalone_payment || '') +
      (obj.is_voided || '') +
      (obj.order ? obj.order.id : '') +
      (obj.owner || '') +
      (obj.pending || '') +
      (obj.source_data ? obj.source_data.pan : '') +
      (obj.source_data ? obj.source_data.sub_type : '') +
      (obj.source_data ? obj.source_data.type : '') +
      (obj.success || '');

    const calculatedHmac = crypto
      .createHmac('sha512', CONFIG.PAYMOB.HMAC_SECRET)
      .update(concatString)
      .digest('hex');

    if (calculatedHmac.toLowerCase() !== (receivedHmac || '').toLowerCase()) {
      return res.status(403).send("Forbidden");
    }

    if (obj.success === true) {
      const amount = (obj.amount_cents / 100).toFixed(0);
      const phone = obj.order.billing_data.phone_number;
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
    res.status(500).send("Error");
  }
});
// مسار تجريبي عبر المتصفح لإنشاء طلب دفع فوري
app.get('/api/pay-test', async (req, res) => {
  try {
    // 1. طلب توكن مصادقة من Paymob
    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: CONFIG.PAYMOB.API_KEY
    });
    const token = authRes.data.token;

    // 2. تسجيل طلب (Order) بقيمة 5 جنيه (500 قرش)
    const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: false,
      amount_cents: "500",
      currency: "EGP",
      items: []
    });
    const orderId = orderRes.data.id;

    // 3. طلب مفتاح دفع (Payment Key) للمحفظة
    const keyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: "500",
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: "NA",
        email: "test@tales.com",
        floor: "NA",
        first_name: "Test",
        street: "NA",
        building: "NA",
        phone_number: "01012345678",
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

    // 4. طلب رابط الدفع بالمحفظة (Mobile Wallet Request)
    const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
      source: {
        identifier: "01010101010", // رقم محفظة تجريبي أو حقيقي
        subtype: "WALLET"
      },
      payment_token: paymentKey
    });

    res.json({
      success: true,
      redirect_url: walletRes.data.redirect_url || walletRes.data,
      message: "تم إنشاء طلب الدفع بنجاح"
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});
app.listen(CONFIG.PORT, () => console.log(`🚀 Server on port ${CONFIG.PORT}`));
