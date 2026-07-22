const ExchangeCredential = require("../models/ExchangeCredential");
const { encrypt, decrypt } = require("../utils/encryption");
const { setExchangeCapital } = require("../services/capitalService");

const binanceService = require("../services/exchanges/binanceService");
const bybitService = require("../services/exchanges/bybitService");
const okxService = require("../services/exchanges/okxService");

const serviceMap = {
  binance: binanceService,
  bybit: bybitService,
  okx: okxService,
};

function formatConnection(doc) {
  return {
    id: doc._id,
    exchange: doc.exchange,
    permissions: doc.permissions,
    status: doc.status,
    lastVerifiedAt: doc.lastVerifiedAt,
    lastError: doc.lastError || null,
    lastCapital: doc.lastCapital ?? null,
    capitalSyncedAt: doc.capitalSyncedAt || null,
    createdAt: doc.createdAt,
  };
}

async function getDecryptedCredentials(userId, exchange) {
  const doc = await ExchangeCredential.findOne({ userId, exchange });
  if (!doc) return null;
  return {
    apiKey: decrypt(doc.apiKeyEnc),
    apiSecret: decrypt(doc.apiSecretEnc),
    passphrase: doc.passphraseEnc ? decrypt(doc.passphraseEnc) : undefined,
  };
}

async function fetchCapitalFromExchange(exchange, creds) {
  const service = serviceMap[exchange];
  if (!service?.getUsdtCapital) {
    throw new Error(`Balance sync not supported for ${exchange}`);
  }
  if (exchange === "okx") {
    return service.getUsdtCapital(creds.apiKey, creds.apiSecret, creds.passphrase);
  }
  return service.getUsdtCapital(creds.apiKey, creds.apiSecret);
}

/**
 * POST /api/exchanges/connect
 * body: { exchange, apiKey, apiSecret, passphrase? }
 * Verifies trade-only key, stores encrypted credentials, syncs capital for VIP levels.
 */
const connectExchange = async (req, res) => {
  try {
    const { exchange, apiKey, apiSecret, passphrase } = req.body;
    const userId = req.user._id;

    if (!exchange || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        message: "exchange, apiKey and apiSecret are required",
      });
    }
    if (!serviceMap[exchange]) {
      return res.status(400).json({
        success: false,
        message: `Unsupported exchange: ${exchange}`,
      });
    }
    if (exchange === "okx" && !passphrase) {
      return res.status(400).json({
        success: false,
        message: "OKX requires a passphrase",
      });
    }

    if (!process.env.ENCRYPTION_KEY) {
      return res.status(503).json({
        success: false,
        message:
          "Server encryption is not configured (ENCRYPTION_KEY). Contact support.",
      });
    }

    const service = serviceMap[exchange];
    let permissions;
    try {
      permissions =
        exchange === "okx"
          ? await service.checkApiRestrictions(apiKey, apiSecret, passphrase)
          : await service.checkApiRestrictions(apiKey, apiSecret);
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      return res.status(400).json({
        success: false,
        message: `Could not verify API key with ${exchange}: ${msg}`,
      });
    }

    // Trade-only guarantee — reject withdrawal-enabled keys
    if (permissions.withdrawals) {
      return res.status(400).json({
        success: false,
        message:
          "This API key has withdrawal permission. Disable withdrawals on the exchange and try again. Funds must stay on your exchange.",
      });
    }

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
        permissions: {
          spotTrading: !!permissions.spotTrading,
          futuresTrading: !!permissions.futuresTrading,
          withdrawals: false,
        },
        status: "connected",
        lastVerifiedAt: new Date(),
        lastError: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync exchange USDT capital → VIP levels (no in-app payment)
    let capitalResult = null;
    let capitalError = null;
    try {
      const capital = await fetchCapitalFromExchange(exchange, {
        apiKey,
        apiSecret,
        passphrase,
      });
      capitalResult = await setExchangeCapital({
        userId,
        amount: capital,
        source: "exchange",
        exchange,
        note: `${exchange} capital sync on connect · ${capital} USDT`,
      });
      doc.lastCapital = capital;
      doc.capitalSyncedAt = new Date();
      await doc.save();
    } catch (err) {
      capitalError = err.message;
      doc.lastError = `Capital sync: ${err.message}`;
      await doc.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "Exchange connected. Funds stay on your exchange. VIP levels use your exchange capital.",
      data: {
        connection: formatConnection(doc),
        capital: capitalResult,
        capitalError,
      },
    });
  } catch (err) {
    console.error("connectExchange error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to connect exchange",
    });
  }
};

/**
 * GET /api/exchanges
 */
const listExchanges = async (req, res) => {
  try {
    const docs = await ExchangeCredential.find({ userId: req.user._id }).select(
      "exchange permissions status lastVerifiedAt lastError lastCapital capitalSyncedAt createdAt"
    );
    return res.json({
      success: true,
      data: docs.map(formatConnection),
    });
  } catch (err) {
    console.error("listExchanges error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch connected exchanges",
    });
  }
};

/**
 * POST /api/exchanges/sync-capital
 * Re-read balances from all (or one) connected exchange(s) and update VIP capital.
 * body: { exchange? }
 */
const syncCapital = async (req, res) => {
  try {
    const userId = req.user._id;
    const filter = { userId, status: "connected" };
    if (req.body?.exchange) filter.exchange = req.body.exchange;

    const docs = await ExchangeCredential.find(filter);
    if (!docs.length) {
      return res.status(400).json({
        success: false,
        message: "No connected exchange. Connect an exchange API first.",
      });
    }

    let totalCapital = 0;
    const perExchange = [];

    for (const doc of docs) {
      try {
        const creds = await getDecryptedCredentials(userId, doc.exchange);
        if (!creds) continue;
        const capital = await fetchCapitalFromExchange(doc.exchange, creds);
        totalCapital += capital;
        doc.lastCapital = capital;
        doc.capitalSyncedAt = new Date();
        doc.lastError = undefined;
        await doc.save();
        perExchange.push({ exchange: doc.exchange, capital, ok: true });
      } catch (err) {
        doc.lastError = err.message;
        await doc.save();
        perExchange.push({
          exchange: doc.exchange,
          capital: 0,
          ok: false,
          error: err.message,
        });
      }
    }

    const primary =
      (req.body?.exchange &&
        perExchange.find((p) => p.exchange === req.body.exchange && p.ok)) ||
      perExchange.find((p) => p.ok);

    // If single exchange requested, use that capital; else sum all
    const amount =
      req.body?.exchange && primary
        ? primary.capital
        : totalCapital;

    const capitalResult = await setExchangeCapital({
      userId,
      amount,
      source: "exchange",
      exchange: primary?.exchange || null,
      note: `Exchange capital sync · ${amount} USDT`,
    });

    return res.json({
      success: true,
      message: "Exchange capital synced. VIP levels updated.",
      data: {
        exchanges: perExchange,
        capital: capitalResult,
      },
    });
  } catch (err) {
    console.error("syncCapital error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Capital sync failed",
    });
  }
};

/**
 * DELETE /api/exchanges/:exchange
 */
const disconnectExchange = async (req, res) => {
  try {
    const { exchange } = req.params;
    await ExchangeCredential.findOneAndDelete({
      userId: req.user._id,
      exchange,
    });

    // Recalc capital from remaining connections
    const remaining = await ExchangeCredential.find({
      userId: req.user._id,
      status: "connected",
    });

    if (!remaining.length) {
      await setExchangeCapital({
        userId: req.user._id,
        amount: 0,
        source: "none",
        note: "All exchanges disconnected — capital reset",
      });
    } else {
      // Best-effort re-sync remaining
      try {
        req.body = {};
        // inline light resync
        let total = 0;
        let primaryEx = null;
        for (const doc of remaining) {
          const creds = await getDecryptedCredentials(req.user._id, doc.exchange);
          if (!creds) continue;
          const c = await fetchCapitalFromExchange(doc.exchange, creds);
          total += c;
          primaryEx = primaryEx || doc.exchange;
        }
        await setExchangeCapital({
          userId: req.user._id,
          amount: total,
          source: "exchange",
          exchange: primaryEx,
          note: `Capital after disconnecting ${exchange}`,
        });
      } catch {
        // leave previous capital if re-sync fails
      }
    }

    return res.json({
      success: true,
      message: `${exchange} disconnected`,
    });
  } catch (err) {
    console.error("disconnectExchange error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not disconnect exchange",
    });
  }
};

module.exports = {
  connectExchange,
  listExchanges,
  disconnectExchange,
  syncCapital,
  getDecryptedCredentials,
};
