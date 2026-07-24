const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const tradeRoutes = require("./tradeRoutes");
const planRoutes = require("./planRoutes");
const exchangeRoutes = require("./exchangeRoutes");
const referralRoutes = require("./referralRoutes");
const paymentRoutes = require("./paymentRoutes");
const walletRoutes = require("./walletRoutes");

const router = express.Router();

/** Catalog of public API paths (for client / deploy checks) */
const ROUTE_CATALOG = [
  { method: "GET", path: "/api/health", access: "public" },
  { method: "GET", path: "/api/routes", access: "public" },
  { method: "POST", path: "/api/auth/register", access: "public" },
  { method: "POST", path: "/api/auth/signup", access: "public" },
  { method: "POST", path: "/api/auth/login", access: "public" },
  { method: "GET", path: "/api/auth/me", access: "private" },
  { method: "POST", path: "/api/auth/verify", access: "private" },
  { method: "GET", path: "/api/referrals/my-code", access: "private" },
  { method: "GET", path: "/api/referrals/stats", access: "private" },
  { method: "GET", path: "/api/plans", access: "public" },
  { method: "GET", path: "/api/plans/me", access: "private" },
  { method: "GET", path: "/api/plans/transactions", access: "private" },
  { method: "POST", path: "/api/plans/purchase", access: "private" },
  { method: "POST", path: "/api/plans/deposit", access: "private" },
  { method: "GET", path: "/api/wallet", access: "private" },
  { method: "GET", path: "/api/wallet/deposit-info", access: "private" },
  { method: "POST", path: "/api/wallet/deposit", access: "private" },
  { method: "POST", path: "/api/wallet/purchase-level", access: "private" },
  { method: "POST", path: "/api/wallet/withdraw", access: "private" },
  { method: "GET", path: "/api/exchanges/catalog", access: "public" },
  { method: "GET", path: "/api/exchanges", access: "private" },
  { method: "POST", path: "/api/exchanges/connect", access: "private" },
  { method: "POST", path: "/api/exchanges/sync-capital", access: "private" },
  { method: "DELETE", path: "/api/exchanges/:exchange", access: "private" },
  { method: "GET", path: "/api/payments/config", access: "public" },
  { method: "POST", path: "/api/payments/create-order", access: "private" },
  { method: "POST", path: "/api/payments/verify", access: "private" },
  { method: "GET", path: "/api/admin/stats", access: "admin" },
  { method: "GET", path: "/api/admin/users", access: "admin" },
  { method: "POST", path: "/api/admin/users/:id/deposit", access: "admin" },
  { method: "GET", path: "/api/trade/traders", access: "public" },
  { method: "GET", path: "/api/trade/traders/:id", access: "public" },
  { method: "POST", path: "/api/trade/copy", access: "private" },
  { method: "POST", path: "/api/trade/copy/:id/stop", access: "private" },
  { method: "GET", path: "/api/trade/my-copies", access: "private" },
  { method: "GET", path: "/api/trade/positions", access: "private" },
  { method: "POST", path: "/api/trade/positions/:id/close", access: "private" },
  { method: "GET", path: "/api/trade/portfolio", access: "private" },
];

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "MirrorTrade API is running",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// Helps debug "Route not found" — open this in browser after deploy
router.get("/routes", (_req, res) => {
  res.json({
    success: true,
    count: ROUTE_CATALOG.length,
    data: ROUTE_CATALOG,
  });
});

router.use("/auth", authRoutes);
router.use("/referrals", referralRoutes);
router.use("/admin", adminRoutes);
router.use("/trade", tradeRoutes);
router.use("/plans", planRoutes);
router.use("/wallet", walletRoutes);
router.use("/exchanges", exchangeRoutes);
router.use("/payments", paymentRoutes);

module.exports = router;
