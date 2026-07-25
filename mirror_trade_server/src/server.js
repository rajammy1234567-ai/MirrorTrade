require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimit");
const {
  assertEnvForProduction,
  isProduction,
} = require("./utils/validate");

// Prefer public DNS for MongoDB Atlas SRV on some Windows/network setups
try {
  const dns = require("dns");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // non-fatal
}

const app = express();
const PORT = process.env.PORT || 7000;

const envCheck = assertEnvForProduction();
if (!envCheck.ok) {
  console.error("Fatal production config errors:");
  envCheck.fatal.forEach((m) => console.error("  -", m));
  process.exit(1);
}
if (envCheck.warnings?.length) {
  envCheck.warnings.forEach((m) => console.warn("[config]", m));
}

// Shared backend for Expo client + Admin web
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
].filter(Boolean);

// Extra origins from comma-separated env (e.g. production frontend hosts)
if (process.env.CORS_ORIGINS) {
  process.env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => allowedOrigins.push(o));
}

app.use(
  helmet({
    // Razorpay / external checkout may need relaxed CSP on web clients
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Mobile apps / curl / server-to-server often send no Origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Dev: any localhost / loopback port
      if (
        !isProduction() &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Production: reject unknown browser origins
      if (isProduction()) {
        console.warn(`CORS blocked origin: ${origin}`);
        return callback(new Error(`CORS: origin not allowed: ${origin}`));
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(globalLimiter);

// Preserve raw body for Razorpay webhook HMAC verification
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan(isProduction() ? "combined" : "dev"));

// Trust proxy when behind Render / Nginx / Cloudflare
if (isProduction() || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    hint: "Open GET /api/routes for the full catalog.",
  });
});

app.use(errorHandler);

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set. Refusing to start.");
      process.exit(1);
    }

    await connectDB();
    app.listen(PORT, () => {
      console.log(`MirrorTrade server running on http://localhost:${PORT}`);
      console.log(`  env:     ${process.env.NODE_ENV || "development"}`);
      console.log(`  health:  http://localhost:${PORT}/api/health`);
      console.log(`  routes:  http://localhost:${PORT}/api/routes`);
      console.log(
        `  client:  EXPO_PUBLIC_API_URL=http://localhost:${PORT}/api`
      );
      console.log(`  admin:   VITE_API_URL=http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
