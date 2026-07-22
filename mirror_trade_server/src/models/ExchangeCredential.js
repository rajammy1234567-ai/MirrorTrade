const mongoose = require('mongoose');

const encryptedFieldSchema = new mongoose.Schema(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false }
);

const exchangeCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exchange: {
      type: String,
      enum: ['binance', 'bybit', 'okx'],
      required: true,
    },
    apiKeyEnc: { type: encryptedFieldSchema, required: true },
    apiSecretEnc: { type: encryptedFieldSchema, required: true },
    // OKX also needs a passphrase in addition to key+secret
    passphraseEnc: { type: encryptedFieldSchema, required: false },

    // Filled in after we verify the key against the exchange
    permissions: {
      spotTrading: { type: Boolean, default: false },
      futuresTrading: { type: Boolean, default: false },
      withdrawals: { type: Boolean, default: false }, // must be false to pass our check
    },

    status: {
      type: String,
      enum: ['pending', 'connected', 'failed', 'revoked'],
      default: 'pending',
    },
    lastVerifiedAt: { type: Date },
    lastError: { type: String },
    /** Last USDT capital read from exchange (VIP levels) */
    lastCapital: { type: Number, default: null },
    capitalSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One connection per user per exchange
exchangeCredentialSchema.index({ userId: 1, exchange: 1 }, { unique: true });

module.exports = mongoose.model('ExchangeCredential', exchangeCredentialSchema);
