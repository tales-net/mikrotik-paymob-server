function getCheckoutPage(paymentKey, iframeId) {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إتمام الدفع الآمن - حكايات</title>
        <style>
            body { font-family: Tahoma, sans-serif; background: #f8f9fa; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .checkout-box { width: 100%; max-width: 600px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; }
            h3 { color: #333; margin-bottom: 15px; }
            iframe { width: 100%; height: 550px; border: none; border-radius: 8px; }
        </style>
    </head>
    <body>
        <div class="checkout-box">
            <h3>🔒 بوابة الدفع الآمنة</h3>
            <iframe src="https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}"></iframe>
        </div>
    </body>
    </html>
  `;
}

module.exports = { getCheckoutPage };
