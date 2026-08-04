const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const { RouterOSClient } = require('routeros-client');

// ======================================================
// ⚙️ جميع البيانات الخاصة بك مدمجة وجاهزة
// ======================================================
const CONFIG = {
  PORT: process.env.PORT || 3000, // دعم البورت الديناميكي في Render
  
  // 1. بيانات الميكروتك
  MIKROTIK: {
    HOST: '172.16.0.5',
    USER: 'tales',
    PASS: '0121695951.*mB',
    PORT: 3333
  },

  // 2. بيانات بوابة Paymob
  PAYMOB: {
    API_KEY: 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T0RneU5ERTNMQ0p1WVcxbElqb2lNVGM0TlRZeE5ESXdPQzQzTmpNMU1Ua2lmUS50Sm10SFlkdkYzVzlOYXJOcUk2YTBHTThvWWszUmN1OURBdFU3Q0tFeTB4R0JONnhOWmlLSW93N2xiRHlEanJzOTd5UjVnVjJMaDItME85ODJIYThuQQ==',
    HMAC_SECRET: '3EB1A996C1BBAFF41BAC83E5EDC6A725',
    WALLET_INTEGRATION_ID: '5406863', 
    VALU_INTEGRATION_ID: '5407062',   
    SEVEN_INTEGRATION_ID: '5407052'    
  },

  // 3. بيانات بوت تليجرام
  TELEGRAM: {
    BOT_TOKEN: '8415838863:AAEopSGXgg4SlX4oYh3RHpXhL6prGSrOpiY',
    CHAT_ID: '5359443583'
  }
};

const app = express();
app.use(express.json());
app.use(cors());

// 🔄 دالة اختيار البروفايل المطابق للوحة User Manager
function getProfile(amount) {
  const price = parseFloat(amount);
  if (price === 5)   return "Bronze (البرونزي)";
  if (price === 15)  return "Silver (الفضي)";
  if (price === 30)  return "Gold (الذهبي)";
  if (price === 50)  return "Platinum ( البلاتينيوم)";
  if (price === 100) return "Diamond (الماس)";
  return "Bronze (البرونزي)";
}

// 🔄 دالة الاتصال بالميكروتك وتوليد الكارت داخل User Manager
async function createMikrotikVoucher(amount, phone) {
  const client = new RouterOSClient({
    host: CONFIG.MIKROTIK.HOST,
    user: CONFIG.MIKROTIK.USER,
    password: CONFIG.MIKROTIK.PASS,
    port: parseInt(CONFIG.MIKROTIK.PORT),
    timeout: 10
  });

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // كارت عشوائي من 6 أرقام
  const profile = getProfile(amount);

  try {
    const api = await client.connect();

    // 1️⃣ إنشاء المستخدم في User Manager
    await api.menu('/user-manager/user').add({
      name: code,
      password: code,
      comment: `Paymob: ${phone}`
    });

    // 2️⃣ تفعيل البروفايل (الباقة) للمستخدم
    await api.menu('/user-manager/user-profile').add({
      user: code,
      profile: profile
    });

    await client.close();
    return { success: true, code, profile };
  } catch (err) {
    console.error("❌ خطأ اليوزر مانجر:", err.message);
    return { success: false, error: err.message };
  }
}

// 🧪 مسار للاختبار الفوري عبر المتصفح
app.get('/test-voucher', async (req, res) => {
  console.log("⏳ جاري تجربة توليد كارت في User Manager...");
  const voucher = await createMikrotikVoucher(15, "01000000000");

  if (voucher.success) {
    await axios.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
      text: `🧪 *اختبار توليد كارت تجريبي*\n----------------------------\n💰 *المبلغ:* 15 جنيه\n📞 *المحفظة:* \`01000000000\`\n🎟️ *الكارت المولد:* \`${voucher.code}\`\n📦 *البروفايل:* ${voucher.profile}`,
      parse_mode: 'Markdown'
    });
  }

  res.json(voucher);
});

// 1️⃣ مسار بدء عملية الدفع بالمحفظة (تستدعيه صفحة الهوتسبوت)
app.post('/api/pay', async (req, res) => {
  try {
    const { walletNumber, amount } = req.body;
    if (!walletNumber || !amount) {
      return res.status(400).json({ success: false, message: "بيانات غير مكتملة" });
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    // أ- طلب Authentication Token
    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', { 
      api_key: CONFIG.PAYMOB.API_KEY 
    });
    const token = authRes.data.token;

    // ب- إنشاء order
    const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token, 
      delivery_needed: "false", 
      amount_cents: amountCents, 
      currency: "EGP", 
      items: []
    });

    // ج- إنشاء Payment Key
    const keyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderRes.data.id,
      billing_data: {
        first_name: "Hotspot", 
        last_name: "Customer", 
        email: "user@hotspot.local",
        phone_number: walletNumber, 
        floor: "NA", building: "NA", street: "NA", apartment: "NA", city: "Cairo", country: "EG", state: "Cairo"
      },
      currency: "EGP",
      integration_id: parseInt(CONFIG.PAYMOB.WALLET_INTEGRATION_ID)
    });

    // د- طلب الخصم واستخراج رابط الـ OTP
    const payRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
      source: { identifier: walletNumber, subtype: "WALLET" },
      payment_token: keyRes.data.token
    });

    res.json({ 
      success: true, 
      redirectUrl: payRes.data.redirect_url || payRes.data.iframe_redirection_url 
    });
  } catch (err) {
    console.error("❌ خطأ الدفع:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "فشل بدء عملية الدفع" });
  }
});

// 2️⃣ مسار الـ Webhook استقبال إشعار نجاح الدفع من Paymob
app.post('/paymob-webhook', async (req, res) => {
  try {
    const receivedHmac = req.query.hmac || req.headers['hmac'];
    const data = req.body;
    const obj = data.obj;

    if (!obj) return res.status(400).send("Bad Request");

    // التحقق الأمني HMAC
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
      console.warn("⚠️ رفض الطلب: HMAC غير مطابق");
      return res.status(403).send("Forbidden");
    }

    if (obj.success === true) {
      const amount = (obj.amount_cents / 100).toFixed(0);
      const phone = obj.order.billing_data.phone_number;

      // 1. إنشاء الكارت في User Manager
      const voucher = await createMikrotikVoucher(amount, phone);

      // 2. إرسال الإشعار لجروب تليجرام
      let message = voucher.success 
        ? `✅ *تم الدفع وتوليد الكارت بنجاح*\n----------------------------\n💰 *المبلغ:* ${amount} جنيه\n📞 *المحفظة:* \`${phone}\` \n🎟️ *الكارت المولد:* \`${voucher.code}\`\n📦 *البروفايل:* ${voucher.profile}`
        : `⚠️ *تم الدفع وفشل إنشاء الكارت بالميكروتك*\n----------------------------\n💰 *المبلغ:* ${amount} جنيه\n📞 *المحفظة:* \`${phone}\` \n❌ *السبب:* ${voucher.error}`;

      await axios.post(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
        chat_id: CONFIG.TELEGRAM.CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      });
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ خطأ الـ Webhook:", err.message);
    res.status(500).send("Error");
  }
});

// تشغيل السيرفر
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 السيرفر يعمل الآن بنجاح على البورت ${CONFIG.PORT}`);
});
