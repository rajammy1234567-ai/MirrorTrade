# Mirror Trade — Rank & Income Plan Implementation

Node.js + MongoDB (Mongoose) implementation of the T-VIP / C-VIP rank system.

## Folder structure

```
config/ranks.js          -> all rank tables & percentages (edit numbers ONLY here)
models/User.js            -> user schema (deposit, referral tree, cached ranks)
models/Transaction.js      -> audit log — every payout gets recorded here
services/teamBusiness.js   -> counts directs + sums downline deposits
services/rankCalculator.js -> figures out T-VIP rank and C-VIP rank for a user
services/bonusCalculator.js -> actually credits wallets + writes Transaction records
tests/rankLogic.test.js    -> quick sanity check, run with: node tests/rankLogic.test.js
```

## How to wire this into your existing project

1. Copy `config/`, `models/`, `services/` into your project (merge with existing folders if you already have User model — you'll need to add the new fields: `referredBy`, `referralCode`, `totalDeposit`, `tVipRank`, `cVipRank`, `walletBalance`).

2. `npm install mongoose` if not already installed.

3. **On every deposit confirmation**, call:
   ```js
   const { recalculateAndSaveRanks } = require("./services/rankCalculator");
   await recalculateAndSaveRanks(userDoc);
   ```
   Also call this for every user IN THE UPLINE of whoever just deposited, since it changes their team business too. (For scale, do this as a background job, not inline on the deposit request.)

4. **On every profit/bonus cycle** (however often you decide to run payouts — daily/weekly), call the three functions in `bonusCalculator.js` for each eligible user.

5. Every payout automatically creates a `Transaction` record — use this collection to show users their earning history and for your own accounting/reconciliation.

## Two decisions you must make before going live

1. **Where does `tradeProfitPool` actually come from?** The code takes it as an input — it doesn't generate it. If it's not backed by real trading activity, payouts are funded by newer deposits (Ponzi structure, illegal in India).

2. **Payout cap check**: before running a payout cycle, sum everything you're about to distribute and confirm it doesn't exceed 90% of that cycle's total deposits, per `config/ranks.js` → `DISTRIBUTION_POOL_PERCENT`. Add a guard function that blocks/flags a cycle if the sum would exceed this — nothing in the current code enforces that automatically yet, it's a business rule you need to add as a final check before crediting wallets.

## Scaling note

`calculateTeamBusiness()` uses plain recursion for now (fine for testing/small user base). Once you have real user volume, switch to `calculateTeamBusinessFast()` in the same file, which uses MongoDB's `$graphLookup` to do it in a single query — or better, maintain a denormalized `teamBusiness` field on the User doc updated incrementally on each deposit.
