// server.js
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { createPaymobPayment } = require("./pay"); // دالة الدفع
const webhookRouter = require("./webhook");       // استقبال إشعارات Paymob

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ صفحة الهوتسبوت (واجهة دفع أنيقة)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html"); // صفحة الدفع اللي كتبناها
});

// ✅ API لبدء الدفع
app.post("/api/pay", async (req, res) => {
  try {
    const { phone, amount, method, account, expiry, cvv } = req.body;

    // استدعاء دالة الدفع
    const result = await createPaymobPayment(phone || account, amount, method);

    if (result.type === "redirect") {
      res.json({ payment_url: result.url });
    } else {
      res.send(result.content); // صفحة HTML فيها IFrame
    }
  } catch (err) {
    console.error("❌ خطأ في الدفع:", err.message);
    res.status(500).send("Error in payment");
  }
});

// ✅ Webhook من Paymob
app.use("/", webhookRouter);

// ✅ تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
