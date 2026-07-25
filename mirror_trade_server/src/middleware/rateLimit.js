const rateLimit = require("express-rate-limit");

const isProd = () => process.env.NODE_ENV === "production";

/** Global API shield — generous for mobile polling */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd() ? 600 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/** Auth endpoints — brute-force protection */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd() ? 30 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth attempts. Wait 15 minutes and try again.",
  },
});

/** Money-moving endpoints */
const moneyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd() ? 40 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many wallet operations. Please slow down.",
  },
});

/** Verification / OTP */
const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd() ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Try again later.",
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  moneyLimiter,
  verifyLimiter,
};
