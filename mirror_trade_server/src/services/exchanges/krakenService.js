const crypto = require("crypto");
const axios = require("axios");
const qs = require("querystring");

const BASE_URL = "https://api.kraken.com";

/**
 * Kraken private API signing.
 * Docs: POST /0/private/Balance
 */
function sign(path, postData, nonce, apiSecret) {
  const secret = Buffer.from(apiSecret, "base64");
  const hash = crypto.createHash("sha256").update(nonce + postData).digest();
  const hmac = crypto
    .createHmac("sha512", secret)
    .update(Buffer.concat([Buffer.from(path), hash]))
    .digest("base64");
  return hmac;
}

async function privateRequest(path, apiKey, apiSecret, params = {}) {
  const nonce = Date.now() * 1000;
  const bodyObj = { nonce, ...params };
  const postData = qs.stringify(bodyObj);
  const signature = sign(path, postData, String(nonce), apiSecret);

  const { data } = await axios.post(`${BASE_URL}${path}`, postData, {
    headers: {
      "API-Key": apiKey,
      "API-Sign": signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 12000,
  });

  if (data.error && data.error.length) {
    throw new Error(data.error.join(", "));
  }
  return data.result;
}

async function checkApiRestrictions(apiKey, apiSecret) {
  const result = await privateRequest(
    "/0/private/Balance",
    apiKey,
    apiSecret
  );
  return {
    spotTrading: true,
    futuresTrading: false,
    withdrawals: false,
    raw: { assets: Object.keys(result || {}).length },
  };
}

async function getUsdtCapital(apiKey, apiSecret) {
  const result = await privateRequest(
    "/0/private/Balance",
    apiKey,
    apiSecret
  );
  // Kraken may use USDT or USDT.F etc.
  let total = 0;
  for (const [asset, bal] of Object.entries(result || {})) {
    if (asset.toUpperCase().includes("USDT")) {
      total += Number(bal || 0);
    }
  }
  return total;
}

module.exports = { checkApiRestrictions, getUsdtCapital };
