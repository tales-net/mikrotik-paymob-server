// استدعاء المكتبات والملفات المساعدة
const axios = require('axios');
const { getCheckoutPage } = require('./checkout'); // صفحة الدفع الموحدة (HTML)
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob'); // دوال التعامل مع Paymob API

// الدالة الرئيسية لإنشاء عملية دفع
async function createPaymobPayment(phone, amount, method) {
  // تحويل المبلغ إلى قروش (cents) لأن Paymob بيشتغل بالقروش
  const amountCents = (parseFloat(amount) * 100).toString();

  // اختيار الـ Integration ID المناسب حسب طريقة الدفع
  let integrationId = process.env.WALLET_INTEGRATION_ID;
  if (method === 'card') integrationId = process.env.CARD_INTEGRATION_ID;
  if (method === 'aman') integrationId = process.env.AMAN_INTEGRATION_ID;
  if (method === 'valu') integrationId = process.env.VALU_INTEGRATION_ID;
  if (method === 'seven') integrationId = process.env.SEVEN_INTEGRATION_ID;

  // 1️⃣ الحصول على Auth Token من Paymob
  const token = await getAuthToken();

  // 2️⃣ إنشاء Order جديد بالمبلغ
  const orderId = await createOrder(token, amountCents);

  // 3️⃣ إنشاء Payment Key باستخدام الـ Integration ID المناسب
  const paymentKey = await getPaymentKey(token, orderId, amountCents, integrationId, phone);

  // 4️⃣ تحديد طريقة الدفع
  if (method === 'wallet') {
    // لو الدفع بمحفظة موبايل → استدعاء API خاص بالمحافظ
    const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
      source: { identifier: phone, subtype: "WALLET" },
      payment_token: paymentKey
    });

    // النتيجة: رابط Redirect للعميل
    return { type: 'redirect', url: walletRes.data.redirect_url || walletRes.data.iframe_redirection_url };
  } else {
    // لو الدفع ببطاقة أو تقسيط → استخدام IFrame
    const iframeId = process.env.PAYMOB_IFRAME_ID || "ضع_رقم_الفريم_هنا";
    const htmlPage = getCheckoutPage(paymentKey, iframeId);

    // النتيجة: صفحة HTML جاهزة للعرض
    return { type: 'html', content: htmlPage };
  }
}

// تصدير الدالة علشان تستخدم في باقي الملفات
module.exports = { createPaymobPayment };
