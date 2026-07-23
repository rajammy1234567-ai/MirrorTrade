const crypto = require("crypto");
const axios = require("axios");

const BASE_URL = "https://api-cloud.bitmart.com";

/**
 * BitMart: Message = timestamp + "#" + memo + "#" + body
 * Docs: GET /spot/v1/wallet
 */
function sign(timestamp, memo, body, apiSecret) {
  const message = `${timestamp}#${memo}#${body || ""}`;
  return crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
}

async function walletRequest(apiKey, apiSecret, memo) {
  if (!memo) {
    throw new Error("BitMart requires API memo (passphrase)");
  }
  const timestamp = Date.now().toString();
  const signature = sign(timestamp, memo, "", apiSecret);

  const { data } = await axios.get(`${BASE_URL}/spot/v1/wallet`, {
    headers: {
      "X-BM-KEY": apiKey,
      "X-BM-SIGN": signature,
      "X-BM-TIMESTAMP": timestamp,
    },
    timeout: 12000,
  });

  if (data.code != null && Number(data.code) !== 1000 && Number(data.code) !== 0) {
    throw new Error(data.message || data.msg || `BitMart error ${data.code}`);
  }
  return data;
}

async function checkApiRestrictions(apiKey, apiSecret, passphrase) {
  const data = await walletRequest(apiKey, apiSecret, passphrase);
  return {
    spotTrading: true,
    futuresTrading: false,
    withdrawals: false,
    raw: data,
  };
}

async function getUsdtCapital(apiKey, apiSecret, passphrase) {
  const data = await walletRequest(apiKey, apiSecret, passphrase);
  const wallet = data.data?.wallet || data.data || [];
  const list = Array.isArray(wallet) ? wallet : [];
  let total = 0;
  for (const w of list) {
    const id = (w.id || w.currency || w.coin || "").toUpperCase();
    if (id === "USDT") {
      total +=
        Number(w.available || w.available_balance || 0) +
        Number(w.frozen || w.frozen_balance || 0);
    }
  }
  return total;
}

module.exports = { checkApiRestrictions, getUsdtCapital };
