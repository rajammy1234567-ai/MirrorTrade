require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/User");

const seed = async () => {
  try {
    await connectDB();

    const adminEmail = "admin@mirrortrade.com";
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log("Admin already exists:", adminEmail);
    } else {
      admin = await User.create({
        name: "Super Admin",
        email: adminEmail,
        password: "Admin@123",
        role: "admin",
      });
      console.log("Admin created:");
      console.log("  Email   :", adminEmail);
      console.log("  Password: Admin@123");
    }

    const demoEmail = "user@mirrortrade.com";
    let user = await User.findOne({ email: demoEmail });

    if (user) {
      console.log("Demo user already exists:", demoEmail);
    } else {
      user = await User.create({
        name: "Demo User",
        email: demoEmail,
        password: "User@123",
        role: "user",
      });
      console.log("Demo user created:");
      console.log("  Email   :", demoEmail);
      console.log("  Password: User@123");
    }

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
