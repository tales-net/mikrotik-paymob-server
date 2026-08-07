const axios = require('axios');
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob');

/**
 * إنشاء المعاملة وتجهيز رابط الدفع الخاص بـ Paymob (توجيه مباشر للفيزا والمحفظة)
 */
async function createPaymobPayment(phone, amount, method = 'wallet') {
  try {
    const amountCents = Math.round(parseFloat(amount) * 100).toString();
    const cleanMethod = (method || 'wallet').toLowerCase();

    // 1. تحديد Integration ID المناسب
    let integrationId;
    if (cleanMethod === 'card') {
      integrationId = process.env.CARD_INTEGRATION_ID || "5653701";
    } else {
      integrationId = process.env.WALLET_INTEGRATION_ID;
    }

    if (!integrationId) {
      throw new Error(`Missing Integration ID for method: ${cleanMethod}`);
    }

    // 2. طلب توكن المصادقة، رقم الطلب، ومفتاح الدفع
    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents);
    const paymentKey = await getPaymentKey(
      token, 
      orderId, 
      amountCents, 
      integrationId, 
      phone || '01000000000'
    );

    // 3. معالجة المحفظة الإلكترونية (Mobile Wallet)
    if (cleanMethod === 'wallet') {
      const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: {
          identifier: phone,
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
    
    // 4. معالجة البطاقات البنكية (Card) - توجيه مباشر لصفحة الدفع الرسمية
    else {
      const directCardUrl = `https://accept.paymob.com/api/acceptance/payments/pay_token?payment_token=${paymentKey}`;
      return { type: 'redirect', url: directCardUrl };
    }

  } catch (err) {
    console.error('❌ Paymob Payment Integration Error:', err.response?.data || err.message);
    throw new Error(`Payment processing failed: ${err.message}`);
  }
}

module.exports = { createPaymobPayment, processPayment: createPaymobPayment };
