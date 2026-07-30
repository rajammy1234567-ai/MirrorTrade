const nodemailer = require("nodemailer");

/**
 * Creates an SMTP Transporter if environment variables are provided.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Generates modern dark-themed HTML email for OTP codes.
 */
function buildOtpHtml(title, otpCode, toEmail) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0A0D14;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #E2E8F0;
      }
      .container {
        max-width: 520px;
        margin: 40px auto;
        background: #121622;
        border: 1px solid #2A3142;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .logo-row {
        text-align: center;
        margin-bottom: 24px;
      }
      .logo-badge {
        display: inline-block;
        background: linear-gradient(135deg, #5B6CFF 0%, #7C5CFF 100%);
        color: #FFFFFF;
        font-weight: 800;
        font-size: 20px;
        padding: 10px 20px;
        border-radius: 14px;
        letter-spacing: 0.5px;
      }
      .title {
        font-size: 22px;
        font-weight: 800;
        text-align: center;
        color: #FFFFFF;
        margin: 0 0 10px 0;
      }
      .subtitle {
        font-size: 14px;
        color: #94A3B8;
        text-align: center;
        line-height: 1.5;
        margin: 0 0 28px 0;
      }
      .otp-box {
        background: rgba(91, 108, 255, 0.12);
        border: 2px dashed #5B6CFF;
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        margin-bottom: 28px;
      }
      .otp-code {
        font-family: 'Courier New', Courier, monospace;
        font-size: 38px;
        font-weight: 800;
        letter-spacing: 10px;
        color: #FFD143;
        margin: 0;
      }
      .expire-note {
        font-size: 12px;
        color: #94A3B8;
        margin-top: 8px;
      }
      .footer {
        border-top: 1px solid #2A3142;
        padding-top: 20px;
        margin-top: 28px;
        font-size: 12px;
        color: #64748B;
        text-align: center;
        line-height: 1.6;
      }
      .security-tip {
        background: rgba(255, 209, 67, 0.08);
        border-left: 3px solid #FFD143;
        padding: 12px 14px;
        border-radius: 8px;
        font-size: 12px;
        color: #CBD5E1;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo-row">
        <div class="logo-badge">MirrorTrade</div>
      </div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">Use the verification code below to complete your authentication for <strong>${toEmail}</strong>.</p>
      
      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
        <div class="expire-note">Code expires in 15 minutes</div>
      </div>

      <div class="security-tip">
        <strong>Security Tip:</strong> Never share your OTP code with anyone. MirrorTrade staff will never ask for your verification code.
      </div>

      <div class="footer">
        MirrorTrade Institutional Mirror & Copy Trading Engine<br>
        This email was sent automatically. Please do not reply directly.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends a 6-digit OTP code to the target email via SMTP.
 */
async function sendOtpEmail(toEmail, otpCode, subject = "Your Verification Code - MirrorTrade", title = "Verification Code") {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`[EmailService] ✉️ SMTP credentials not set in .env`);
    console.log(`[EmailService] Target Email: ${toEmail}`);
    console.log(`[EmailService] OTP Code    : ${otpCode}`);
    console.log(`[EmailService] Subject     : ${subject}`);
    console.log(`[EmailService] (To enable real email delivery, set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)`);
    console.log(`==================================================\n`);
    return {
      sent: false,
      reason: "SMTP not configured (Console logged for dev)",
    };
  }

  const from = process.env.SMTP_FROM || `"MirrorTrade Security" <${process.env.SMTP_USER}>`;
  const html = buildOtpHtml(title, otpCode, toEmail);

  try {
    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html,
    });

    console.log(`[EmailService] ✅ Email sent to ${toEmail} | MessageId: ${info.messageId}`);
    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[EmailService] ❌ Failed to send email to ${toEmail}:`, error.message);
    throw error;
  }
}

module.exports = {
  sendOtpEmail,
};
