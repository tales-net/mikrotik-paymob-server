const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { createPaymobPayment } = require("./pay");
const webhookRouter = require("./webhook");

const app = express();
const PORT = process.env.PORT || 3333;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// صفحة الهوتسبوت
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// API الدفع
app.post("/api/pay", async (req, res) => {
  try {
    const { phone, amount, method } = req.body;
    const result = await createPaymobPayment(phone, amount, method);

    if (result.type === "redirect") {
      res.json({ payment_url: result.url });
    } else {
      res.send(result.content);
    }
  } catch (err) {
    console.error("❌ خطأ في الدفع:", err.message);
    res.status(500).send("Error in payment");
  }
});

// صفحات نجاح وفشل
app.get("/success", (req, res) => {
  res.send(`
    <html lang="ar">
      <head><meta charset="UTF-8"><title>تم الدفع</title></head>
      <body style="font-family:Cairo; text-align:center; padding:50px;">
        <h1 style="color:#27ae60;">✅ تم الدفع بنجاح</h1>
        <p>شكراً لاستخدامك خدمة الدفع عبر Paymob</p>
      </body>
    </html>
  `);
});

app.get("/fail", (req, res) => {
  res.send(`
    <html lang="ar">
      <head><meta charset="UTF-8"><title>فشل الدفع</title></head>
      <body style="font-family:Cairo; text-align:center; padding:50px;">
        <h1 style="color:#e74c3c;">❌ فشل الدفع</h1>
        <p>حدثت مشكلة أثناء عملية الدفع، حاول مرة أخرى.</p>
      </body>
    </html>
  `);
});

// Webhook من Paymob
app.use("/", webhookRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
