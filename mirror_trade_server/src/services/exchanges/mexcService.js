const crypto = require("crypto");
const axios = require("axios");

const BASE_URL = "https://api.mexc.com";

function sign(queryString, apiSecret) {
  return crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

/**
 * MEXC spot account — validates key + read balances.
 * Docs: GET /api/v3/account
 */
async function checkApiRestrictions(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query, apiSecret);

  const { data } = await axios.get(
    `${BASE_URL}/api/v3/account?${query}&signature=${signature}`,
    {
      headers: { "X-MEXC-APIKEY": apiKey },
      timeout: 12000,
    }
  );

  const canTrade = data.canTrade !== false;
  return {
    spotTrading: canTrade,
    futuresTrading: false,
    withdrawals: data.canWithdraw === true,
    raw: { accountType: data.accountType, canTrade, canWithdraw: data.canWithdraw },
  };
}

async function getUsdtCapital(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query, apiSecret);

  const { data } = await axios.get(
    `${BASE_URL}/api/v3/account?${query}&signature=${signature}`,
    {
      headers: { "X-MEXC-APIKEY": apiKey },
      timeout: 12000,
    }
  );

  const balances = data.balances || [];
  const usdt = balances.find((b) => (b.asset || "").toUpperCase() === "USDT");
  if (!usdt) return 0;
  return Number(usdt.free || 0) + Number(usdt.locked || 0);
}

module.exports = { checkApiRestrictions, getUsdtCapital };
