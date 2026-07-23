const crypto = require("crypto");
const axios = require("axios");

const BASE_URL = "https://api.bitfinex.com";

/**
 * Bitfinex v2 auth: path + nonce + body, HMAC-SHA384 of /api + payload.
 * Docs: POST /v2/auth/r/wallets
 */
function sign(path, nonce, body, apiSecret) {
  const payload = `/api${path}${nonce}${body}`;
  return crypto
    .createHmac("sha384", apiSecret)
    .update(payload)
    .digest("hex");
}

async function authPost(path, apiKey, apiSecret) {
  const nonce = `${Date.now() * 1000}`;
  const body = "{}";
  const signature = sign(path, nonce, body, apiSecret);

  const { data } = await axios.post(`${BASE_URL}${path}`, body, {
    headers: {
      "Content-Type": "application/json",
      "bfx-nonce": nonce,
      "bfx-apikey": apiKey,
      "bfx-signature": signature,
    },
    timeout: 12000,
  });
  return data;
}

async function checkApiRestrictions(apiKey, apiSecret) {
  const data = await authPost("/v2/auth/r/wallets", apiKey, apiSecret);
  if (!Array.isArray(data)) {
    throw new Error("Bitfinex auth failed — check API key/secret");
  }
  return {
    spotTrading: true,
    futuresTrading: false,
    withdrawals: false,
    raw: { walletCount: data.length },
  };
}

async function getUsdtCapital(apiKey, apiSecret) {
  const data = await authPost("/v2/auth/r/wallets", apiKey, apiSecret);
  if (!Array.isArray(data)) return 0;

  // Wallet row: [TYPE, CURRENCY, BALANCE, UNSETTLED, AVAILABLE]
  let total = 0;
  for (const row of data) {
    const currency = String(row[1] || "").toUpperCase();
    if (currency === "UST" || currency === "USDT") {
      total += Number(row[2] || 0);
    }
  }
  return total;
}

module.exports = { checkApiRestrictions, getUsdtCapital };
