const binanceService = require("./binanceService");
const bybitService = require("./bybitService");
const okxService = require("./okxService");
const bingxService = require("./bingxService");
const mexcService = require("./mexcService");
const bitmartService = require("./bitmartService");
const bitfinexService = require("./bitfinexService");
const krakenService = require("./krakenService");
const binanceUsService = require("./binanceUsService");

/**
 * Supported CEX integrations (API key + secret, optional passphrase/memo).
 * Keys match client `exchange` id and ExchangeCredential.exchange enum.
 */
const serviceMap = {
  binance: binanceService,
  bybit: bybitService,
  okx: okxService,
  bingx: bingxService,
  mexc: mexcService,
  bitmart: bitmartService,
  bitfinex: bitfinexService,
  kraken: krakenService,
  kraken_futures: krakenService, // same spot balance API for capital snapshot
  binance_us: binanceUsService,
};

/** Exchanges that need an extra passphrase / memo field */
const PASSPHRASE_EXCHANGES = new Set(["okx", "bitmart"]);

function needsPassphrase(exchange) {
  return PASSPHRASE_EXCHANGES.has(exchange);
}

function isSupported(exchange) {
  return Boolean(serviceMap[exchange]);
}

module.exports = {
  serviceMap,
  PASSPHRASE_EXCHANGES,
  needsPassphrase,
  isSupported,
};
