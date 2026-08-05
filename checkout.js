// checkout.js
function getCheckoutPage(paymentKey, iframeId) {
  return `
    <!DOCTYPE html>
    <html lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>💳 صفحة الدفع</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: "Cairo", sans-serif;
          background: linear-gradient(135deg, #74ebd5 0%, #ACB6E5 100%);
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          width: 100%;
          max-width: 420px;
          background: #fff;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          animation: fadeIn 0.8s ease-in-out;
        }
        h2 {
          text-align: center;
          margin-bottom: 25px;
          color: #2c3e50;
        }
        iframe {
          width: 100%;
          height: 600px;
          border: none;
          border-radius: 10px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>💳 إتمام الدفع</h2>
        <iframe src="https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}" allowpaymentrequest></iframe>
      </div>
    </body>
    </html>
  `;
}

module.exports = { getCheckoutPage };
