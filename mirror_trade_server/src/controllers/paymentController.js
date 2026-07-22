const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/User");
const {
  getRazorpay,
  getPublicKeyId,
  getCompanyName,
  isRazorpayConfigured,
} = require("../config/razorpay");
const { creditDeposit } = require("../services/capitalService");

const MIN_DEPOSIT_INR = 1;
const MAX_DEPOSIT_INR = 500000;

function rupeesToPaise(amountInr) {
  return Math.round(Number(amountInr) * 100);
}

function validateAmount(amount) {
  const n = Number(amount);
  if (!n || Number.isNaN(n) || n < MIN_DEPOSIT_INR) {
    return { ok: false, message: `Minimum deposit is ₹${MIN_DEPOSIT_INR}` };
  }
  if (n > MAX_DEPOSIT_INR) {
    return { ok: false, message: `Maximum deposit is ₹${MAX_DEPOSIT_INR}` };
  }
  // Max 2 decimal places
  if (Math.round(n * 100) !== Math.round(n * 10000) / 100) {
    // allow normal floats like 100.5
  }
  return { ok: true, amount: Math.round(n * 100) / 100 };
}

/**
 * Mark payment paid + credit deposit (idempotent).
 */
async function finalizePaidPayment(paymentDoc, {
  razorpayPaymentId,
  razorpaySignature = null,
  method = null,
}) {
  if (paymentDoc.status === "paid") {
    // Already processed — return current user snapshot
    const user = await User.findById(paymentDoc.user);
    return {
      alreadyPaid: true,
      payment: paymentDoc,
      deposit: user
        ? {
            totalDeposit: user.totalDeposit,
            walletBalance: user.walletBalance,
            tVipRank: user.tVipRank,
            cVipRank: user.cVipRank,
          }
        : null,
    };
  }

  // If this payment id already credited under another record, block
  if (razorpayPaymentId) {
    const existing = await Payment.findOne({
      razorpayPaymentId,
      status: "paid",
      _id: { $ne: paymentDoc._id },
    });
    if (existing) {
      throw new Error("This Razorpay payment was already processed");
    }
  }

  paymentDoc.status = "paid";
  paymentDoc.razorpayPaymentId = razorpayPaymentId || paymentDoc.razorpayPaymentId;
  paymentDoc.razorpaySignature = razorpaySignature || paymentDoc.razorpaySignature;
  paymentDoc.method = method || paymentDoc.method;
  paymentDoc.paidAt = new Date();
  await paymentDoc.save();

  // Optional legacy path — product model uses exchange capital, not in-app pay
  const deposit = await creditDeposit({
    userId: paymentDoc.user,
    amount: paymentDoc.amount,
    note: `Razorpay deposit ₹${paymentDoc.amount} · ${paymentDoc.razorpayPaymentId || paymentDoc.razorpayOrderId}`,
  });

  return { alreadyPaid: false, payment: paymentDoc, deposit };
}

// @desc    Public config for checkout (key id only — never secret)
// @route   GET /api/payments/config
// @access  Public
const getPaymentConfig = async (_req, res) => {
  const configured = isRazorpayConfigured();
  res.json({
    success: true,
    data: {
      configured,
      keyId: configured ? getPublicKeyId() : null,
      companyName: getCompanyName(),
      currency: "INR",
      minDeposit: MIN_DEPOSIT_INR,
      maxDeposit: MAX_DEPOSIT_INR,
    },
  });
};

// @desc    Create Razorpay order for VIP deposit
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          "Payment gateway is not configured. Please contact support.",
      });
    }

    const check = validateAmount(req.body.amount);
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const amount = check.amount;
    const amountPaise = rupeesToPaise(amount);
    const user = req.user;

    const receipt = `mt_${String(user._id).slice(-6)}_${Date.now().toString(36)}`.slice(
      0,
      40
    );

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: String(user._id),
        purpose: "deposit",
        email: user.email || "",
        name: user.name || "",
      },
    });

    const payment = await Payment.create({
      user: user._id,
      amount,
      amountPaise,
      currency: "INR",
      purpose: "deposit",
      status: "created",
      razorpayOrderId: order.id,
      receipt,
      notes: {
        email: user.email,
        name: user.name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Order created",
      data: {
        orderId: order.id,
        amount: order.amount, // paise
        amountInr: amount,
        currency: order.currency,
        keyId: getPublicKeyId(),
        companyName: getCompanyName(),
        paymentId: payment._id,
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: "",
        },
        description: `MirrorTrade VIP deposit · ₹${amount}`,
      },
    });
  } catch (err) {
    console.error("[payments/create-order]", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create payment order",
    });
  }
};

// @desc    Verify client-side checkout success + credit deposit
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Payment gateway is not configured",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment details",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, user: req.user._id },
        {
          status: "failed",
          failureReason: "Invalid payment signature",
          razorpayPaymentId: razorpay_payment_id,
        }
      );
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Signature mismatch.",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found for this account",
      });
    }

    const result = await finalizePaidPayment(payment, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    res.json({
      success: true,
      message: result.alreadyPaid
        ? "Payment already processed"
        : "Payment successful. Deposit credited and ranks updated.",
      data: {
        payment: {
          id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          paidAt: payment.paidAt,
        },
        deposit: result.deposit,
      },
    });
  } catch (err) {
    console.error("[payments/verify]", err);
    res.status(500).json({
      success: false,
      message: err.message || "Payment verification failed",
    });
  }
};

// @desc    Mark order failed from client (user dismissed checkout)
// @route   POST /api/payments/cancel
// @access  Private
const cancelPayment = async (req, res) => {
  const { orderId, reason } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, message: "orderId is required" });
  }

  const payment = await Payment.findOne({
    razorpayOrderId: orderId,
    user: req.user._id,
  });

  if (!payment) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  if (payment.status === "created") {
    payment.status = "failed";
    payment.failureReason = reason || "User cancelled checkout";
    await payment.save();
  }

  res.json({ success: true, message: "Order updated", data: { status: payment.status } });
};

// @desc    Razorpay webhook (payment.captured etc.)
// @route   POST /api/payments/webhook
// @access  Public (signature verified)
const webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (webhookSecret) {
      const raw =
        req.rawBody ||
        (Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(JSON.stringify(req.body)));
      const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(raw)
        .digest("hex");

      if (signature !== expected) {
        return res.status(400).json({ success: false, message: "Invalid webhook signature" });
      }
    }

    const event =
      typeof req.body === "string" || Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString())
        : req.body;

    const eventName = event?.event;
    const payload = event?.payload?.payment?.entity;

    if (
      (eventName === "payment.captured" || eventName === "payment.authorized") &&
      payload?.order_id
    ) {
      const payment = await Payment.findOne({ razorpayOrderId: payload.order_id });
      if (payment && payment.status !== "paid") {
        await finalizePaidPayment(payment, {
          razorpayPaymentId: payload.id,
          method: payload.method || null,
        });
      }
    }

    if (eventName === "payment.failed" && payload?.order_id) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: payload.order_id, status: "created" },
        {
          status: "failed",
          failureReason: payload.error_description || "Payment failed",
          razorpayPaymentId: payload.id,
        }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[payments/webhook]", err);
    // Always 200 to avoid Razorpay retry storms on app bugs — log for ops
    res.status(200).json({ success: false, message: err.message });
  }
};

// @desc    User payment history
// @route   GET /api/payments/mine
// @access  Private
const getMyPayments = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    count: payments.length,
    data: payments.map((p) => ({
      id: p._id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      method: p.method,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      failureReason: p.failureReason,
    })),
  });
};

module.exports = {
  getPaymentConfig,
  createOrder,
  verifyPayment,
  cancelPayment,
  webhook,
  getMyPayments,
  finalizePaidPayment,
};
