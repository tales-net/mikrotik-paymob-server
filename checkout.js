function getCheckoutPage(paymentKey, iframeId, amount, phone, method) {
  return `
  <!DOCTYPE html>
  <html lang="ar">
  <head>
    <meta charset="UTF-8">
    <title>💳 صفحة الدفع</title>
    <style>
      body { font-family: "Cairo", sans-serif; background: #f5f5f5; margin:0; padding:0; }
      .checkout-box { max-width: 500px; margin: 40px auto; background:#fff; padding:25px; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.15); }
      h2 { text-align:center; margin-bottom:20px; }
      .details { margin-bottom:20px; font-size:14px; color:#444; line-height:1.6; }
      iframe { border:none; width:100%; height:500px; border-radius:10px; }
    </style>
  </head>
  <body>
    <div class="checkout-box">
      <h2>💳 إتمام عملية الدفع</h2>
      <div class="details">
        <strong>📱 رقم العميل:</strong> ${phone || "غير محدد"}<br>
        <strong>💰 المبلغ:</strong> ${amount} جنيه<br>
        <strong>🔗 طريقة الدفع:</strong> ${method}
      </div>
      <iframe src="https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}" allowpaymentrequest></iframe>
    </div>
  </body>
  </html>
  `;
}

module.exports = { getCheckoutPage };
