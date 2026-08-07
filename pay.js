const axios = require('axios');
const { getCheckoutPage } = require('./checkout');
const { getAuthToken, createOrder, getPaymentKey } = require('./paymob');

/**
 * إنشاء المعاملة وتجهيز رابط الدفع الخاص بـ Paymob بناءً على نوع الوسيلة (محافظ وبطاقات فقط)
 * @param {string} phone - رقم الهاتف أو المحفظة
 * @param {string|number} amount - المبلغ بالجنيه
 * @param {string} method - وسيلة الدفع (wallet, card)
 * @returns {Promise<{type: string, url?: string, content?: string}>}
 */
async function createPaymobPayment(phone, amount, method = 'wallet') {
  try {
    // 1. تحويل المبلغ إلى قروش (Cents) وتوحيد نص وسيلة الدفع
    const amountCents = Math.round(parseFloat(amount) * 100).toString();
    const cleanMethod = (method || 'wallet').toLowerCase();

    // 2. تحديد Integration ID المناسب من متغيرات البيئة أو القيم الافتراضية
    let integrationId;
    switch (cleanMethod) {
      case 'card':
        integrationId = process.env.CARD_INTEGRATION_ID || "5653701";
        break;
      case 'wallet':
      default:
        integrationId = process.env.WALLET_INTEGRATION_ID;
        break;
    }

    if (!integrationId) {
      throw new Error(`Missing Integration ID for method: ${cleanMethod}`);
    }

    // 3. الحصول على توكن المصادقة، رقم الطلب، ومفتاح الدفع
    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents);
    const paymentKey = await getPaymentKey(token, orderId, amountCents, integrationId, phone || '01000000000');

    // 4. معالجة وسيلة المحفظة الإلكترونية (Mobile Wallet)
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
    
    // 5. معالجة البطاقات البنكية (Card)
    else {
      const iframeId = process.env.CARD_IFRAME_ID || process.env.PAYMOB_IFRAME_ID;

      if (!iframeId) {
        throw new Error("Missing PAYMOB_IFRAME_ID in environment variables");
      }

      // إذا كانت دالة getCheckoutPage متاحة في دالة الجلب المخصصة
      if (typeof getCheckoutPage === 'function') {
        const htmlPage = getCheckoutPage(paymentKey, iframeId);
        return { type: 'html', content: htmlPage };
      }
      
      const cardUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

      // إرجاع صفحة HTML متجاوبة بالكامل لملء الشاشة مع كافة صلاحيات التفاعل
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>الدفع بالفيزا - حكايات</title>
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100vh; overflow: hidden; background-color: #ffffff; }
            iframe { width: 100%; height: 100%; border: 0; display: block; }
          </style>
        </head>
        <body>
          <iframe 
            src="${cardUrl}" 
            allow="payment *; credit-card-debugging *" 
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups">
          </iframe>
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
