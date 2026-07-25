# MirrorTrade

Production-oriented monorepo: **shared Express API**, **Expo client**, **Vite admin**.

| App | Folder | Stack | Default |
|-----|--------|--------|---------|
| API | `mirror_trade_server` | Node + Express + MongoDB | `http://localhost:7000` |
| Mobile / Web client | `mirror_trade_client` | Expo + NativeWind | Expo / `8081` |
| Admin | `mirror_trade_admin` | Vite + React + Tailwind | `http://localhost:5173` |

```
MirrorTrade/
├── mirror_trade_server/   # REST API (shared)
├── mirror_trade_client/   # Expo app
├── mirror_trade_admin/    # Admin dashboard
└── scripts/smoke-test.js  # API smoke checks
```

## Prerequisites

- Node.js **18+**
- MongoDB (local or Atlas URI in `mirror_trade_server/.env`)

## Quick start (local)

```bash
# 1) Install
npm run install:all

# 2) Server env
cd mirror_trade_server
cp .env.example .env   # edit MONGODB_URI, JWT_SECRET, BNB_DEPOSIT_ADDRESS
npm run seed           # admin + demo user + traders
npm run dev            # http://localhost:7000

# 3) Admin (new terminal)
cd mirror_trade_admin
# .env already points to http://localhost:7000/api for local
npm run dev            # http://localhost:5173

# 4) Client (new terminal)
cd mirror_trade_client
# .env: EXPO_PUBLIC_USE_LOCAL_API=1 + EXPO_PUBLIC_API_URL=http://localhost:7000/api
npm start
```

### Smoke test

With the server running:

```bash
npm run smoke
# or: node scripts/smoke-test.js http://localhost:7000/api
```

### Seed accounts

| Role  | Email                   | Password   |
|-------|-------------------------|------------|
| Admin | `admin@mirrortrade.com` | `Admin@123` |
| User  | `user@mirrortrade.com`  | `User@123`  |

**Change these passwords before any public deployment.**

## What works end-to-end

| Flow | Status |
|------|--------|
| Register / login / JWT | ✅ Client + admin |
| VIP plans & ranks | ✅ |
| BNB deposit request → admin approve → USDT | ✅ (manual review; no on-chain proof yet) |
| Level purchase from USDT | ✅ |
| Earnings withdraw request → admin pay/reject | ✅ |
| Referral code + rewards on verify | ✅ (demo OTP in non-prod) |
| Exchange API connect + capital sync | ✅ (when keys valid) |
| Copy trading | ✅ **Paper mode** (Binance marks, no real orders) |
| Admin dashboard / users / deposits / withdrawals | ✅ |
| Bots / Signals | ✅ **API paper mode** (Mongo + Binance marks; not live exchange orders) |

## Production checklist

Before going live with real money:

1. **Secrets** — rotate `JWT_SECRET`, `ENCRYPTION_KEY`, Mongo password, Razorpay keys. Never commit `.env`.
2. **`NODE_ENV=production`**
3. **`AUTO_CREDIT_DEPOSITS=false`** (forced off in production code)
4. **`ALLOW_DEMO_FEATURES=false`** — blocks demo OTP / free auto-credit paths
5. **Real `BNB_DEPOSIT_ADDRESS`** and operational process to verify TxHash (admin or chain indexer)
6. **CORS** — set `CLIENT_URL`, `ADMIN_URL`, and optional `CORS_ORIGINS`
7. **`RAZORPAY_WEBHOOK_SECRET`** if Razorpay is enabled (required in production)
8. **Rate limits** — enabled on auth + wallet routes
9. **Paid host** — avoid free-tier cold starts for the API
10. **Copy / bots** — UI labels paper/demo; do not market as live exchange execution until order routing is built

### Deploy notes

- **API**: set env vars on Render/Railway/VPS; health = `GET /api/health`
- **Admin**: build with `VITE_API_URL=https://your-api.com/api` → `npm run build`
- **Client**: set `EXPO_PUBLIC_API_URL` to the same API (do **not** set `EXPO_PUBLIC_USE_LOCAL_API` for store builds)

## Main API routes

- `GET  /api/health` · `GET /api/routes`
- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET  /api/wallet` · deposit / withdraw / purchase-level
- `GET  /api/plans` · `GET /api/plans/me`
- `GET  /api/trade/traders` · copy / positions / portfolio
- `GET  /api/trade/bots` · create / pause / stop / resume
- `GET  /api/trade/signals` · execute (paper position)
- `GET  /api/admin/stats` · users · deposits · withdrawals

Full catalog: `GET /api/routes`.

## Architecture

```
  Expo Client  ──┐
                 ├──  Express API  ──  MongoDB
  Admin Web   ──┘
```

Both apps share JWT auth and the User model. Admin routes require `role: "admin"`.
