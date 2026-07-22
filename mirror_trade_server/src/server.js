require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const dns = require('dns');
dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
])


const app = express();
const PORT = process.env.PORT || 5000;

// Shared backend for Expo client + Admin web
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8081",
].filter(Boolean);

app.use(helmet({
  // Allow Razorpay checkout assets when admin/client load gateway UI
  contentSecurityPolicy: false,
}));
app.use(
  cors({
    origin: (origin, callback) => {
      // Mobile apps often send no Origin; Expo web may use any localhost port
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production" ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // MirrorTrade client + admin — open CORS for API
    },
    credentials: true,
  })
);

// Preserve raw body for Razorpay webhook HMAC verification
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    hint: "Open GET /api/routes for the full catalog. If you see this on Render, redeploy this repo's mirror_trade_server.",
  });
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`MirrorTrade server running on http://localhost:${PORT}`);
      console.log(`Health:  http://localhost:${PORT}/api/health`);
      console.log(`Routes:  http://localhost:${PORT}/api/routes`);
      console.log(`Plans:   http://localhost:${PORT}/api/plans`);
      console.log(`Client should use: EXPO_PUBLIC_API_URL=http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
