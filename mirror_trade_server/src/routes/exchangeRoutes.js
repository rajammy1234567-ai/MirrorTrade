const express = require("express");
const {
  connectExchange,
  listExchanges,
  disconnectExchange,
  syncCapital,
} = require("../controllers/exchangeController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", listExchanges);
router.post("/connect", connectExchange);
router.post("/sync-capital", syncCapital);
router.delete("/:exchange", disconnectExchange);

module.exports = router;
