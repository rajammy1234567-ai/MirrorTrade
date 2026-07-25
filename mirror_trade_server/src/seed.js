require("dotenv").config();

// Match server.js — help Atlas SRV resolve on some Windows/network setups
try {
  const dns = require("dns");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // non-fatal
}

const connectDB = require("./config/db");
const User = require("./models/User");
const { createUniqueReferralCode } = require("./services/referralService");

const ensureReferralCode = async (user) => {
  if (user.referralCode) return user;
  user.referralCode = await createUniqueReferralCode(user.name);
  await user.save();
  return user;
};

const seed = async () => {
  try {
    await connectDB();

    const adminEmail = "admin@mirrortrade.com";
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      await ensureReferralCode(admin);
      console.log("Admin already exists:", adminEmail);
    } else {
      admin = await User.create({
        name: "Super Admin",
        email: adminEmail,
        password: "Admin@123",
        role: "admin",
        referralCode: await createUniqueReferralCode("Super Admin"),
        isEmailVerified: true,
      });
      console.log("Admin created:");
      console.log("  Email   :", adminEmail);
      console.log("  Password: Admin@123");
    }

    const demoEmail = "user@mirrortrade.com";
    let user = await User.findOne({ email: demoEmail });

    if (user) {
      await ensureReferralCode(user);
      // Ensure demo account is usable for local demos
      let dirty = false;
      if (!user.isActive) {
        user.isActive = true;
        dirty = true;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        dirty = true;
      }
      if (Number(user.usdtBalance || 0) < 100) {
        user.usdtBalance = 500;
        dirty = true;
      }
      if (Number(user.totalDeposit || 0) < 100) {
        user.totalDeposit = 500;
        user.capitalSource = user.capitalSource || "admin";
        dirty = true;
      }
      if (Number(user.walletBalance || 0) < 10) {
        user.walletBalance = 100;
        dirty = true;
      }
      if (dirty) {
        await user.save();
        console.log("Demo user restored/topped up for local demos");
      } else {
        console.log("Demo user already exists:", demoEmail);
      }
    } else {
      user = await User.create({
        name: "Demo User",
        email: demoEmail,
        password: "User@123",
        role: "user",
        referralCode: await createUniqueReferralCode("Demo User"),
        isEmailVerified: true,
        usdtBalance: 500,
        totalDeposit: 500,
        walletBalance: 100,
        capitalSource: "admin",
      });
      console.log("Demo user created:");
      console.log("  Email   :", demoEmail);
      console.log("  Password: User@123");
      console.log("  Referral:", user.referralCode);
      console.log("  USDT    : 500 · VIP capital: 500 · Earnings: 100");
    }

    // Master traders for copy trading
    const { ensureSeedTraders, listTraders } = require("./services/copyTradeService");
    await ensureSeedTraders();
    const traders = await listTraders();
    console.log(`Copy traders ready: ${traders.length}`);
    traders.forEach((t) => console.log(`  - ${t.name} (${t.id})`));

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
