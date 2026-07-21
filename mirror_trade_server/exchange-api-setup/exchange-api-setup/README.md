# Exchange API Connect — Backend Setup

Ye tumhare screenshot ke "Connect Exchange" → "API Credentials" flow ka backend hai.

## Install
```bash
npm install express mongoose axios dotenv jsonwebtoken
```

## Setup
1. `.env.example` ko `.env` mein copy karo aur values fill karo.
2. `ENCRYPTION_KEY` generate karo:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. `middleware/requireAuth.js` ko apne existing auth system se wire karo.
4. `node server.js`

## Flow (jo tumhare frontend se match karega)

1. User exchange select karta hai (Binance/Bybit/OKX) → screen 1
2. User API Key + Secret (OKX ke liye passphrase bhi) paste karta hai → screen 2
3. Frontend `POST /api/exchanges/connect` call karta hai:
   ```json
   {
     "exchange": "binance",
     "apiKey": "...",
     "apiSecret": "..."
   }
   ```
4. Backend:
   - Exchange ko seedha call karke key verify karta hai
   - **Withdrawal permission check karta hai** — agar enabled hai, request reject ho jaati hai (ye tumhare "Trade-Only Access Guaranteed" wale badge ko backend se enforce karta hai, sirf UI claim nahi)
   - Key/Secret ko AES-256-GCM se encrypt karke MongoDB mein save karta hai
   - Response mein sirf permissions + status bhejta hai, kabhi bhi raw key wapas nahi bhejta

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/exchanges/connect` | Save + verify a new exchange connection |
| GET | `/api/exchanges` | List user's connected exchanges (no secrets) |
| DELETE | `/api/exchanges/:exchange` | Disconnect / remove stored credentials |

## Important security notes
- **Never** log `apiSecret` or send it back in any response.
- `getDecryptedCredentials()` in the controller is for internal use only (e.g. your background job that syncs balances/positions) — don't expose it over HTTP.
- Rotate `ENCRYPTION_KEY` carefully — if you change it, existing encrypted rows become unreadable. Plan a re-encryption migration if you ever need to rotate.
- Consider rate-limiting `/connect` to prevent brute-force key guessing.
- OKX needs a passphrase; Binance/Bybit don't — the frontend form should show that field conditionally when `exchange === 'okx'`.

## Next steps (for Automated / Signal / Manual trading modes)
Once this connect flow works, the same encrypted credentials get reused by
a separate `tradeExecutionService` that places orders based on:
- **Manual** → user clicks "Buy/Sell" in your app
- **Signal** → your signal engine triggers an order
- **Automated** → your bot logic triggers an order

Sab teeno modes same `getDecryptedCredentials(userId, exchange)` helper use
karenge order placement ke waqt — bas order-signing call add karna hoga
(similar to `checkApiRestrictions`, but hitting the `/order` endpoint
instead of the permissions endpoint).
