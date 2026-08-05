// checkout.js
function getCheckoutPage(paymentKey, iframeId, amount, phone, method) {
  return `
  <!DOCTYPE html>
  <html lang="ar">
  <head>
    <meta charset="UTF-8">
    <title>💳 صفحة الدفع</title>
    <style>
      body {
        font-family: "Cairo", sans-serif;
        background: linear-gradient(135deg, #74ebd5 0%, #ACB6E5 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .checkout-box {
        background: #fff;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0px 8px 25px rgba(0,0,0,0.2);
        text-align: center;
        width: 450px;
        animation: fadeIn 1s ease-in-out;
      }
      .checkout-box h2 {
        color: #2c3e50;
        margin-bottom: 15px;
      }
      .details {
        text-align: right;
        margin-bottom: 20px;
        font-size: 14px;
        color: #444;
        line-height: 1.6;
      }
      iframe {
        border: none;
        width: 100%;
        height: 500px;
        border-radius: 10px;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
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
