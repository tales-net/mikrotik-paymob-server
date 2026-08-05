const express = require('express');
const { sendPaymentMessage } = require('./telegram');
require('dotenv').config();

const router = express.Router();

router.post('/paymob-webhook', async (req, res) => {
  try {
    const obj = req.body.obj;
    if (!obj) return res.status(400).send("Bad Request
