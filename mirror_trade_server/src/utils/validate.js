/**
 * Lightweight validators (no heavy schema lib required at call sites).
 */

function isEvmAddress(addr) {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

function isTxHash(hash) {
  return typeof hash === "string" && /^0x[a-fA-F0-9]{64}$/.test(hash.trim());
}

function isEmail(email) {
  if (typeof email !== "string") return false;
  // Practical email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isStrongPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Demo / free-credit modes must never run in production unless explicitly forced.
 */
function allowDemoFeatures() {
  if (!isProduction()) return true;
  return String(process.env.ALLOW_DEMO_FEATURES || "false").toLowerCase() === "true";
}

function assertEnvForProduction() {
  if (!isProduction()) return { ok: true, warnings: [] };

  const warnings = [];
  const fatal = [];

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.includes("change") ||
    process.env.JWT_SECRET.includes("dev_secret") ||
    process.env.JWT_SECRET.length < 32
  ) {
    fatal.push("JWT_SECRET must be a strong random string (32+ chars) in production");
  }

  if (!process.env.MONGODB_URI) {
    fatal.push("MONGODB_URI is required");
  }

  if (String(process.env.AUTO_CREDIT_DEPOSITS || "").toLowerCase() === "true") {
    warnings.push(
      "AUTO_CREDIT_DEPOSITS=true in production — deposits auto-credit without chain proof"
    );
  }

  const addr = process.env.BNB_DEPOSIT_ADDRESS || "";
  if (!addr || addr.includes("YourCompany") || addr.includes("0000000000000000")) {
    warnings.push("BNB_DEPOSIT_ADDRESS looks like a placeholder — set a real company wallet");
  }

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    warnings.push("ENCRYPTION_KEY missing/weak — exchange API keys cannot be stored safely");
  }

  return { ok: fatal.length === 0, fatal, warnings };
}

module.exports = {
  isEvmAddress,
  isTxHash,
  isEmail,
  isStrongPassword,
  isProduction,
  allowDemoFeatures,
  assertEnvForProduction,
};
