const axios = require('axios');
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob');

/**
 * إنشاء المعاملة وتجهيز رابط الدفع الخاص بـ Paymob (توجيه مباشر وكامل)
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
    
    // 4. معالجة البطاقات البنكية (Card) - العرض بملء الشاشة بمرونة كاملة
    else {
      const iframeId = process.env.CARD_IFRAME_ID || process.env.PAYMOB_IFRAME_ID;
      if (!iframeId) {
        throw new Error("Missing PAYMOB_IFRAME_ID in environment variables");
      }

      const cardUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
      
      // إرجاع صفحة HTML تفاعلية تعرض واجهة الفيزا بملء الشاشة بدون تقييد
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>الدفع بالفيزا - حكايات</title>
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #f8f9fa; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${cardUrl}" allow="payment"></iframe>
        </body>
        </html>
      `;

      return { type: 'html', content: htmlContent };
    }

  } catch (err) {
    console.error('❌ Paymob Payment Integration Error:', err.response?.data || err.message);
    throw new Error(`Payment processing failed: ${err.message}`);
  }
}

module.exports = { createPaymobPayment, processPayment: createPaymobPayment };
