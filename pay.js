// pay.js
const axios = require('axios');
const { getCheckoutPage } = require('./checkout');
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob');

async function createPaymobPayment(phone, amount, method) {
  const amountCents = (parseFloat(amount) * 100).toString();

  // اختيار Integration ID حسب طريقة الدفع
  let integrationId = process.env.WALLET_INTEGRATION_ID;
  if (method === 'card') integrationId = process.env.CARD_INTEGRATION_ID;
  if (method === 'aman') integrationId = process.env.AMAN_INTEGRATION_ID;
  if (method === 'valu') integrationId = process.env.VALU_INTEGRATION_ID;
  if (method === 'seven') integrationId = process.env.SEVEN_INTEGRATION_ID;

  // 1️⃣ الحصول على Auth Token
  const token = await getAuthToken();

  // 2️⃣ إنشاء Order جديد
  const orderId = await createOrder(token, amountCents);

  // 3️⃣ إنشاء Payment Key
  const paymentKey = await getPaymentKey(token, orderId, amountCents, integrationId, phone);

  // 4️⃣ تحديد طريقة الدفع
  if (method === 'wallet') {
    // الدفع بمحفظة
    const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
      source: { identifier: phone, subtype: "WALLET" },
      payment_token: paymentKey
    });
    return { type: 'redirect', url: walletRes.data.redirect_url || walletRes.data.iframe_redirection_url };
  } else {
    // الدفع بكارت أو تقسيط → صفحة IFrame مع تفاصيل العملية
    const iframeId = process.env.PAYMOB_IFRAME_ID || "ضع_رقم_الفريم_هنا";
    const htmlPage = getCheckoutPage(paymentKey, iframeId, amount, phone, method);
    return { type: 'html', content: htmlPage };
  }
}

module.exports = { createPaymobPayment };
