const axios = require('axios');

async function getAuthToken() {
  const res = await axios.post('https://accept.paymob.com/api/auth/tokens', {
    api_key: process.env.PAYMOB_API_KEY
  });
  return res.data.token;
}

async function createOrder(token, amountCents) {
  const res = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
    auth_token: token,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: "EGP",
    items: []
  });
  return res.data.id;
}

async function getPaymentKey(token, orderId, amountCents, integrationId, phone) {
  const res = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
    auth_token: token,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: {
      apartment: "NA", email: "customer@tales.com", floor: "NA",
      first_name: "Customer", street: "NA", building: "NA",
      phone_number: phone, shipping_method: "NA", postal_code: "NA",
      city: "Cairo", country: "EG", last_name: "User", state: "Cairo"
    },
    currency: "EGP",
    integration_id: integrationId
  });
  return res.data.token;
}

module.exports = { getAuthToken, createOrder, getPaymentKey };
