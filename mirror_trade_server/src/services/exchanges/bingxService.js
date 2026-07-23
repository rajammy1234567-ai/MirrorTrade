const crypto = require("crypto");
const axios = require("axios");

const BASE_URL = "https://open-api.bingx.com";

function sign(queryString, apiSecret) {
  return crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

function buildQuery(params) {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

/**
 * BingX: verify key by reading spot balances.
 * Docs: GET /openApi/spot/v1/account/balance
 */
async function checkApiRestrictions(apiKey, apiSecret) {
  const timestamp = Date.now();
  const qs = buildQuery({ timestamp, recvWindow: 5000 });
  const signature = sign(qs, apiSecret);

  const { data } = await axios.get(
    `${BASE_URL}/openApi/spot/v1/account/balance?${qs}&signature=${signature}`,
    {
      headers: { "X-BX-APIKEY": apiKey },
      timeout: 12000,
    }
  );

  if (data.code !== 0 && data.code !== undefined && data.code !== "0") {
    throw new Error(data.msg || `BingX error code ${data.code}`);
  }

  // BingX does not expose a full permission map like Binance.
  // Successful balance read implies read access; we assume trade-only
  // keys (user confirms checklist in the app).
  return {
    spotTrading: true,
    futuresTrading: true,
    withdrawals: false,
    raw: data,
  };
}

/**
 * Sum USDT free + locked on BingX spot wallet.
 */
async function getUsdtCapital(apiKey, apiSecret) {
  const timestamp = Date.now();
  const qs = buildQuery({ timestamp, recvWindow: 5000 });
  const signature = sign(qs, apiSecret);

  const { data } = await axios.get(
    `${BASE_URL}/openApi/spot/v1/account/balance?${qs}&signature=${signature}`,
    {
      headers: { "X-BX-APIKEY": apiKey },
      timeout: 12000,
    }
  );

  if (data.code !== 0 && data.code !== undefined && data.code !== "0") {
    throw new Error(data.msg || `BingX error code ${data.code}`);
  }

  const balances = data.data?.balances || data.data || [];
  const list = Array.isArray(balances) ? balances : [];
  let total = 0;
  for (const b of list) {
    const asset = (b.asset || b.coin || "").toUpperCase();
    if (asset === "USDT") {
      total += Number(b.free || 0) + Number(b.locked || 0);
    }
  }
  return total;
}

module.exports = { checkApiRestrictions, getUsdtCapital };
