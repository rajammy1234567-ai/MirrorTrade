/**
 * Generate a unique referral code from a display name.
 * Format: 2-letter initials + 4-digit number (e.g. "Alex Morgan" → "AM4729").
 * Falls back to a short alphanumeric string when no usable name is provided.
 */
function generateReferralCode(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let initials = "";
  if (parts.length >= 2) {
    initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  // Strip non-letters and pad so we always have 2 chars
  initials = initials.replace(/[^A-Z]/g, "");
  if (initials.length === 0) {
    // Short unique-style fallback (e.g. KX7M2P)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let body = "";
    for (let i = 0; i < 6; i += 1) {
      body += chars[Math.floor(Math.random() * chars.length)];
    }
    return body;
  }
  if (initials.length === 1) {
    initials = `${initials}X`;
  }

  const digits = String(Math.floor(1000 + Math.random() * 9000)); // 1000–9999
  return `${initials}${digits}`;
}

/**
 * Normalize user-entered codes for lookups (trim + upper-case).
 */
function normalizeReferralCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

module.exports = generateReferralCode;
module.exports.generateReferralCode = generateReferralCode;
module.exports.normalizeReferralCode = normalizeReferralCode;
