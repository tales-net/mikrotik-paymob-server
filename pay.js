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
    const paymentKey = await getPaymentKey(token, orderId, amountCents, integrationId, phone || '01000000000');

    // 3. معالجة وسائل الدفع التي تعمل كـ POST Request (محفظة، فاليو، سفن، أمان)
    if (['wallet', 'valu', 'seven', 'aman'].includes(cleanMethod)) {
      const subtypeMap = {
        'wallet': 'WALLET',
        'valu': 'VALU',
        'seven': 'SEVEN',
        'aman': 'AMAN'
      };

      const res = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: {
          identifier: phone || '01000000000',
          subtype: subtypeMap[cleanMethod]
        },
        payment_token: paymentKey
      });

      const redirectUrl = res.data.iframe_redirection_url || res.data.redirection_url;
      if (!redirectUrl) throw new Error(`Failed to get redirect URL for ${cleanMethod}`);
      return { type: 'redirect', url: redirectUrl };
    } 
    
    // 4. معالجة البطاقات البنكية فقط عبر الرابط المباشر
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
