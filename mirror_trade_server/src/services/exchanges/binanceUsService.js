const crypto = require("crypto");
const axios = require("axios");

/** Binance.US — same signing as Binance, different base URL */
const BASE_URL = "https://api.binance.us";

function sign(queryString, apiSecret) {
  return crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

async function checkApiRestrictions(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query, apiSecret);

  try {
    const { data } = await axios.get(
      `${BASE_URL}/sapi/v1/account/apiRestrictions?${query}&signature=${signature}`,
      {
        headers: { "X-MBX-APIKEY": apiKey },
        timeout: 12000,
      }
    );
    return {
      spotTrading: !!data.enableSpotAndMarginTrading,
      futuresTrading: !!data.enableFutures,
      withdrawals: !!data.enableWithdrawals,
      raw: data,
    };
  } catch {
    // Fall back to account snapshot if restrictions endpoint unavailable
    const account = await getAccountSnapshot(apiKey, apiSecret);
    return {
      spotTrading: account.canTrade !== false,
      futuresTrading: false,
      withdrawals: account.canWithdraw === true,
      raw: account,
    };
  }
}

async function getAccountSnapshot(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query, apiSecret);

  const { data } = await axios.get(
    `${BASE_URL}/api/v3/account?${query}&signature=${signature}`,
    {
      headers: { "X-MBX-APIKEY": apiKey },
      timeout: 12000,
    }
  );
  return data;
}

async function getUsdtCapital(apiKey, apiSecret) {
  const data = await getAccountSnapshot(apiKey, apiSecret);
  const balances = data.balances || [];
  const usdt = balances.find((b) => b.asset === "USDT");
  if (!usdt) return 0;
  return Number(usdt.free || 0) + Number(usdt.locked || 0);
}

module.exports = { checkApiRestrictions, getUsdtCapital };
