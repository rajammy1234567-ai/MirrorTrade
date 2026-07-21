const ExchangeCredential = require('../models/ExchangeCredential');
const { encrypt, decrypt } = require('../utils/encryption');

const binanceService = require('../services/binanceService');
const bybitService = require('../services/bybitService');
const okxService = require('../services/okxService');

const serviceMap = {
  binance: binanceService,
  bybit: bybitService,
  okx: okxService,
};

/**
 * POST /api/exchanges/connect
 * body: { exchange, apiKey, apiSecret, passphrase? }
 * Auth middleware should have already set req.userId
 */
async function connectExchange(req, res) {
  try {
    const { exchange, apiKey, apiSecret, passphrase } = req.body;
    const userId = req.userId;

    if (!exchange || !apiKey || !apiSecret) {
      return res.status(400).json({ error: 'exchange, apiKey and apiSecret are required.' });
    }
    if (!serviceMap[exchange]) {
      return res.status(400).json({ error: `Unsupported exchange: ${exchange}` });
    }
    if (exchange === 'okx' && !passphrase) {
      return res.status(400).json({ error: 'OKX requires a passphrase as well.' });
    }

    // 1. Verify the key against the real exchange BEFORE saving anything.
    //    This confirms the key is valid AND checks withdrawal permission.
    const service = serviceMap[exchange];
    let permissions;
    try {
      permissions =
        exchange === 'okx'
          ? await service.checkApiRestrictions(apiKey, apiSecret, passphrase)
          : await service.checkApiRestrictions(apiKey, apiSecret);
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      return res.status(400).json({ error: `Could not verify API key with ${exchange}: ${msg}` });
    }

    // 2. Reject if withdrawals are enabled on this key — this is the
    //    "Trade-Only Access Guaranteed" promise from your UI.
    if (permissions.withdrawals) {
      return res.status(400).json({
        error:
          'This API key has withdrawal permission enabled. Please disable withdrawals on the exchange and try again.',
      });
    }

    // 3. Encrypt and upsert (one credential doc per user+exchange).
    const apiKeyEnc = encrypt(apiKey);
    const apiSecretEnc = encrypt(apiSecret);
    const passphraseEnc = passphrase ? encrypt(passphrase) : undefined;

    const doc = await ExchangeCredential.findOneAndUpdate(
      { userId, exchange },
      {
        userId,
        exchange,
        apiKeyEnc,
        apiSecretEnc,
        ...(passphraseEnc ? { passphraseEnc } : {}),
        permissions,
        status: 'connected',
        lastVerifiedAt: new Date(),
        lastError: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'Exchange connected successfully.',
      exchange: doc.exchange,
      permissions: doc.permissions,
      status: doc.status,
    });
  } catch (err) {
    console.error('connectExchange error:', err);
    return res.status(500).json({ error: 'Something went wrong while connecting the exchange.' });
  }
}

/**
 * GET /api/exchanges
 * Lists the user's connected exchanges (never returns decrypted secrets).
 */
async function listExchanges(req, res) {
  try {
    const docs = await ExchangeCredential.find({ userId: req.userId }).select(
      'exchange permissions status lastVerifiedAt lastError createdAt'
    );
    return res.json(docs);
  } catch (err) {
    console.error('listExchanges error:', err);
    return res.status(500).json({ error: 'Could not fetch connected exchanges.' });
  }
}

/**
 * DELETE /api/exchanges/:exchange
 */
async function disconnectExchange(req, res) {
  try {
    const { exchange } = req.params;
    await ExchangeCredential.findOneAndDelete({ userId: req.userId, exchange });
    return res.json({ message: `${exchange} disconnected.` });
  } catch (err) {
    console.error('disconnectExchange error:', err);
    return res.status(500).json({ error: 'Could not disconnect exchange.' });
  }
}

/**
 * Internal helper (used by other services, e.g. your sync job) to get
 * decrypted credentials for making live API calls. Never expose this
 * via an HTTP route.
 */
async function getDecryptedCredentials(userId, exchange) {
  const doc = await ExchangeCredential.findOne({ userId, exchange });
  if (!doc) return null;

  return {
    apiKey: decrypt(doc.apiKeyEnc),
    apiSecret: decrypt(doc.apiSecretEnc),
    passphrase: doc.passphraseEnc ? decrypt(doc.passphraseEnc) : undefined,
  };
}

module.exports = {
  connectExchange,
  listExchanges,
  disconnectExchange,
  getDecryptedCredentials,
};
