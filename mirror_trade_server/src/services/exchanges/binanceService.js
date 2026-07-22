const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://api.binance.com';

function sign(queryString, apiSecret) {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

/**
 * Calls Binance's dedicated endpoint that tells you exactly what an
 * API key is allowed to do. This is the safest way to confirm
 * "trade-only, no withdrawal" before you trust the key.
 * Docs: GET /sapi/v1/account/apiRestrictions
 */
async function checkApiRestrictions(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query, apiSecret);

  const url = `${BASE_URL}/sapi/v1/account/apiRestrictions?${query}&signature=${signature}`;

  const { data } = await axios.get(url, {
    headers: { 'X-MBX-APIKEY': apiKey },
    timeout: 10000,
  });

  // data looks like:
  // {
  //   ipRestrict: false,
  //   enableWithdrawals: false,
  //   enableInternalTransfer: true,
  //   enableSpotAndMarginTrading: true,
  //   enableFutures: true,
  //   ...
  // }
  return {
    spotTrading: !!data.enableSpotAndMarginTrading,
    futuresTrading: !!data.enableFutures,
    withdrawals: !!data.enableWithdrawals,
    raw: data,
  };
}

/**
 * Simple connectivity + validity check (account balances).
 * Useful right after connecting, to pull the first snapshot.
 */
async function getAccountSnapshot(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query, apiSecret);

  const url = `${BASE_URL}/api/v3/account?${query}&signature=${signature}`;

  const { data } = await axios.get(url, {
    headers: { 'X-MBX-APIKEY': apiKey },
    timeout: 10000,
  });

  return data; // balances, permissions, etc.
}

/**
 * Sum USDT free + locked on spot wallet (used as VIP capital).
 */
async function getUsdtCapital(apiKey, apiSecret) {
  const data = await getAccountSnapshot(apiKey, apiSecret);
  const balances = data.balances || [];
  const usdt = balances.find((b) => b.asset === "USDT");
  if (!usdt) return 0;
  return Number(usdt.free || 0) + Number(usdt.locked || 0);
}

module.exports = { checkApiRestrictions, getAccountSnapshot, getUsdtCapital };
