const express = require("express");
const { getStats, getUsers, updateUserStatus } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

module.exports = router;
