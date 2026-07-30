require("dotenv").config();
const { sendOtpEmail } = require("../src/services/emailService");

async function main() {
  console.log("Testing SMTP Email sending...");
  console.log("User:", process.env.SMTP_USER);
  try {
    const result = await sendOtpEmail(process.env.SMTP_USER, "889900", "Test OTP Code", "Test Verification");
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("ERROR SENDING EMAIL:", err.message);
  }
}

main();
