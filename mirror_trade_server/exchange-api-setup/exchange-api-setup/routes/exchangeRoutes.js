const express = require('express');
const router = express.Router();

const {
  connectExchange,
  listExchanges,
  disconnectExchange,
} = require('../controllers/exchangeController');

const requireAuth = require('../middleware/requireAuth');

// All routes require a logged-in user (req.userId set by requireAuth)
router.use(requireAuth);

router.post('/connect', connectExchange);
router.get('/', listExchanges);
router.delete('/:exchange', disconnectExchange);

module.exports = router;
