const Razorpay = require("razorpay");

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

function isRazorpayConfigured() {
  return Boolean(getRazorpayCredentials());
}

let instance = null;

function getRazorpay() {
  const creds = getRazorpayCredentials();
  if (!creds) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
  }

  if (!instance) {
    instance = new Razorpay({
      key_id: creds.keyId,
      key_secret: creds.keySecret,
    });
  }

  return instance;
}

function getPublicKeyId() {
  const creds = getRazorpayCredentials();
  return creds ? creds.keyId : null;
}

function getCompanyName() {
  return process.env.RAZORPAY_COMPANY_NAME || "MirrorTrade";
}

module.exports = {
  getRazorpay,
  getPublicKeyId,
  getCompanyName,
  isRazorpayConfigured,
  getRazorpayCredentials,
};
