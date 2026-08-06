const axios = require('axios');
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob');

/**
 * إنشاء المعاملة وتجهيز رابط الدفع الخاص بـ Paymob
 * @param {string} phone - رقم الهاتف أو المحفظة
 * @param {string|number} amount - المبلغ بالجنيه
 * @param {string} method - وسيلة الدفع
 * @returns {Promise<{type: string, url?: string}>}
 */
async function createPaymobPayment(phone, amount, method = 'wallet') {
  try {
    const amountCents = Math.round(parseFloat(amount) * 100).toString();
    const cleanMethod = (method || 'wallet').toLowerCase();

    // 1. تحديد Integration ID
    let integrationId;
    switch (cleanMethod) {
      case 'card': integrationId = process.env.CARD_INTEGRATION_ID; break;
      case 'aman': integrationId = process.env.AMAN_INTEGRATION_ID; break;
      case 'valu': integrationId = process.env.VALU_INTEGRATION_ID; break;
      case 'seven': integrationId = process.env.SEVEN_INTEGRATION_ID; break;
      case 'wallet':
      default: integrationId = process.env.WALLET_INTEGRATION_ID; break;
    }

    if (!integrationId) throw new Error(`Missing Integration ID for: ${cleanMethod}`);

    // 2. الحصول على التوكن ورقم الطلب ومفتاح الدفع
    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents);
    const paymentKey = await getPaymentKey(token, orderId, amountCents, integrationId, phone || '1112345678');

    // 3. المحفظة وحدها هي التي تستخدم طريقة الـ POST لطلب رابط الدفع الفوري
    if (cleanMethod === 'wallet') {
      const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: {
          identifier: phone || '1112345678',
          subtype: "WALLET"
        },
        payment_token: paymentKey
      });

      const redirectUrl = walletRes.data.iframe_redirection_url || walletRes.data.redirection_url;
      if (!redirectUrl) throw new Error("لم يتم استرجاع رابط إعادة توجيه المحفظة");
      return { type: 'redirect', url: redirectUrl };
    } 
    
    // 4. البطاقات، فاليو، سفن، وأمان تستخدم رابط الـ Standalone الصحيح لتظهر صفحة الخدمة بداخلها بكامل خطواتها
    else {
      const directRedirectUrl = `https://accept.paymob.com/standalone/payments/redirect_url?payment_token=${paymentKey}`;
      return { type: 'redirect', url: directRedirectUrl };
    }

  } catch (err) {
    console.error('❌ Paymob Payment Integration Error:', err.response?.data || err.message);
    throw new Error(`Payment processing failed: ${err.message}`);
  }
}

module.exports = { createPaymobPayment, processPayment: createPaymobPayment };
