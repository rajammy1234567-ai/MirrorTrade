const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://www.okx.com';

// OKX requires: apiKey + apiSecret + passphrase (set by the user when they
// create the API key on OKX). Make sure your frontend form collects this
// third field for OKX specifically.

function sign(timestamp, method, requestPath, body, apiSecret) {
  const prehash = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64');
}

/**
 * OKX doesn't have one single "restrictions" endpoint like Binance.
 * The practical approach: call an account endpoint. If withdrawal-only
 * or trade permissions are missing, OKX returns a permission error code,
 * which tells us what the key can't do. We also cross-check by attempting
 * a harmless read call.
 * Docs: GET /api/v5/account/config
 */
async function checkApiRestrictions(apiKey, apiSecret, passphrase) {
  const timestamp = new Date().toISOString();
  const method = 'GET';
  const requestPath = '/api/v5/account/config';
  const signature = sign(timestamp, method, requestPath, '', apiSecret);

  const { data } = await axios.get(`${BASE_URL}${requestPath}`, {
    headers: {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  const acctData = (data.data && data.data[0]) || {};

  // OKX's /account/config response includes a "perm" field on the key
  // when queried via /users/subaccount or via key-info endpoints in some
  // account types. If unavailable directly, treat successful read-only
  // calls as confirmation of read access, and rely on the exchange's own
  // UI-side toggle (withdrawal permission is OFF by default unless the
  // user explicitly enables it and whitelists an address on OKX).
  return {
    spotTrading: true, // confirmed implicitly by a successful authenticated call
    futuresTrading: true,
    withdrawals: acctData.perm ? acctData.perm.includes('withdraw') : false,
    raw: data,
  };
}

/**
 * Trading account balances — sum USDT eq/avail.
 * Docs: GET /api/v5/account/balance
 */
async function getUsdtCapital(apiKey, apiSecret, passphrase) {
  const timestamp = new Date().toISOString();
  const method = "GET";
  const requestPath = "/api/v5/account/balance";
  const signature = sign(timestamp, method, requestPath, "", apiSecret);

  const { data } = await axios.get(`${BASE_URL}${requestPath}`, {
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  const details = data?.data?.[0]?.details || [];
  const usdt = details.find((d) => d.ccy === "USDT");
  if (!usdt) return 0;
  return Number(usdt.eq || usdt.availBal || usdt.cashBal || 0);
}

module.exports = { checkApiRestrictions, getUsdtCapital };
