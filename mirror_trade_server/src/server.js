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

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps / tools with no Origin header
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`MirrorTrade server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
