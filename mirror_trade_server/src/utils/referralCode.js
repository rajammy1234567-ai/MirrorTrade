/**
 * Generate a short unique referral code (e.g. MT-A7K2X9).
 */
function generateReferralCode(prefix = "MT") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 6; i += 1) {
    body += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${body}`;
}

module.exports = generateReferralCode;
