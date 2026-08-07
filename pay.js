// استبدل الجزء الخاص بالبطاقات البنكية في pay.js بهذا الكود:
else {
  const iframeId = process.env.CARD_IFRAME_ID || process.env.PAYMOB_IFRAME_ID;
  if (!iframeId) {
    throw new Error("Missing PAYMOB_IFRAME_ID in environment variables");
  }

  const cardUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
  
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
