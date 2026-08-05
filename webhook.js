const express = require("express");
const router = express.Router();
const { sendTelegramMessage } = require("./telegram");

router.post("/webhook", async (req, res) => {
  try {
    const obj = req.body.obj;

    if (obj.success) {
      await sendTelegramMessage(obj, true);
      console.log("✅ دفع ناجح:", obj.id);
    } else {
      await sendTelegramMessage(obj, false);
      console.log("❌ دفع فاشل:", obj.id);
    }

    res.status(200).send("Webhook received");
  } catch (err) {
    console.error("❌ خطأ في Webhook:", err.message);
    res.status(500).send("Error in webhook");
  }
});

module.exports = router;
