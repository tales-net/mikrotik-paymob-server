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
    const amountCents = Math.round(parseFloat(amount || 5) * 100).toString();
    const cleanMethod = (method || 'wallet').toLowerCase();

    // 1. إذا اختار العميل "البطاقة (Card)" -> توجيه مباشر لرابط PayMe النظيف تماماً بدون تمرير بيانات في الرابط
    if (cleanMethod === 'card') {
      const payMeBaseUrl = "https://accept.paymob.com/payme/tales_market";
      return { type: 'redirect', url: payMeBaseUrl };
    }

    // 2. تحديد Integration ID للمحفظة
    const integrationId = process.env.WALLET_INTEGRATION_ID;
    if (!integrationId) {
      throw new Error(`Missing Online Integration ID for method: ${cleanMethod}`);
    }

    // البيانات الثابتة للمحفظة
    const staticPhone = "1112345678";
    const staticEmail = "tales@gmail.com";
    const userPhone = phone || staticPhone;

    // 3. الحصول على التوكن ورقم الطلب ومفتاح الدفع للمحفظة
    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents);
    const paymentKey = await getPaymentKey(
      token, 
      orderId, 
      amountCents, 
      integrationId, 
      userPhone, 
      staticEmail
    );

    // 4. معالجة المحفظة الإلكترونية عبر طلب API مباشر لإرجاع الرابط
    const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
      source: {
        identifier: userPhone,
        subtype: "WALLET"
      },
      payment_token: paymentKey
    });

    const redirectUrl = walletRes.data.iframe_redirection_url || walletRes.data.redirection_url;
    if (!redirectUrl) {
      throw new Error("لم يتم استرجاع رابط إعادة توجيه المحفظة من Paymob");
    }
    
    return { type: 'redirect', url: redirectUrl };

  } catch (err) {
    console.error('❌ Paymob Payment Integration Error:', err.response?.data || err.message);
    throw new Error(`Payment processing failed: ${err.message}`);
  }
}

module.exports = { createPaymobPayment, processPayment: createPaymobPayment };
