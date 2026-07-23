const express = require("express");
const {
  connectExchange,
  listExchanges,
  listCatalog,
  disconnectExchange,
  syncCapital,
} = require("../controllers/exchangeController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Catalog is public (no secrets) — helps client render supported CEX list
router.get("/catalog", listCatalog);

router.use(protect);

router.get("/", listExchanges);
router.post("/connect", connectExchange);
router.post("/sync-capital", syncCapital);
router.delete("/:exchange", disconnectExchange);

module.exports = router;
