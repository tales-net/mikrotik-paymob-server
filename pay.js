const axios = require('axios');
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob');

/**
 * إنشاء المعاملة وتجهيز رابط الدفع الخاص بـ Paymob (محافظ وبطاقات أونلاين فقط)
 * @param {string} phone - رقم الهاتف أو المحفظة
 * @param {string|number} amount - المبلغ بالجنيه
 * @param {string} method - وسيلة الدفع (wallet أو card)
 * @returns {Promise<{type: string, url?: string}>}
 */
async function createPaymobPayment(phone, amount, method = 'wallet') {
  try {
    const amountCents = Math.round(parseFloat(amount) * 100).toString();
    const cleanMethod = (method || 'wallet').toLowerCase();

    // 1. تحديد Integration ID المخصص للأونلاين فقط
    let integrationId;
    if (cleanMethod === 'card') {
      integrationId = process.env.CARD_INTEGRATION_ID;
    } else {
      // الافتراضي هو المحفظة الإلكترونية أونلاين
      integrationId = process.env.WALLET_INTEGRATION_ID;
    }

    if (!integrationId) {
      throw new Error(`Missing Online Integration ID for method: ${cleanMethod}`);
    }

    // 2. الحصول على التوكن ورقم الطلب ومفتاح الدفع بالبيانات الثابتة أو المدخلة
    const staticPhone = "1112345678";
    const staticEmail = "tales@gmail.com";

    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents);
    const paymentKey = await getPaymentKey(
      token, 
      orderId, 
      amountCents, 
      integrationId, 
      phone || staticPhone, 
      staticEmail
    );

    // 3. معالجة المحفظة الإلكترونية عبر طلب API مباشر لإرجاع الرابط
    if (cleanMethod === 'wallet') {
      const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: {
          identifier: phone || staticPhone,
          subtype: "WALLET"
        },
        payment_token: paymentKey
      });

      const redirectUrl = walletRes.data.iframe_redirection_url || walletRes.data.redirection_url;
      if (!redirectUrl) {
        throw new Error("لم يتم استرجاع رابط إعادة توجيه المحفظة من Paymob");
      }
      return { type: 'redirect', url: redirectUrl };
    } 
    
    // 4. معالجة البطاقات البنكية عبر رابط الـ Standalone Checkout المباشر
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
