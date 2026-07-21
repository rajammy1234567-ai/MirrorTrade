const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://api.bybit.com';
const RECV_WINDOW = '5000';

function sign(paramString, apiSecret) {
  return crypto.createHmac('sha256', apiSecret).update(paramString).digest('hex');
}

/**
 * Bybit V5 signing: timestamp + apiKey + recvWindow + queryString
 * Docs: GET /v5/user/query-api  -> returns permissions for the key
 */
async function checkApiRestrictions(apiKey, apiSecret) {
  const timestamp = Date.now().toString();
  const queryString = ''; // no params for this endpoint
  const signPayload = timestamp + apiKey + RECV_WINDOW + queryString;
  const signature = sign(signPayload, apiSecret);

  const { data } = await axios.get(`${BASE_URL}/v5/user/query-api`, {
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW,
      'X-BAPI-SIGN': signature,
    },
    timeout: 10000,
  });

  const result = data.result || {};
  const perms = result.permissions || {};

  // Bybit returns permission groups like ContractTrade, Spot, Wallet, etc.
  // "Wallet" containing "AccountTransfer" / "SubMemberTransfer" implies transfer/withdrawal-like access.
  const hasWithdrawPerm = (perms.Wallet || []).some((p) =>
    ['Withdraw', 'AccountTransfer', 'SubMemberTransfer'].includes(p)
  );

  return {
    spotTrading: (perms.Spot || []).includes('SpotTrade'),
    futuresTrading: (perms.ContractTrade || []).length > 0,
    withdrawals: hasWithdrawPerm,
    raw: data,
  };
}

module.exports = { checkApiRestrictions };
