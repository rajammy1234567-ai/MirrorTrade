/**
 * tests/rankLogic.test.js
 * ----------------------------------------------------
 * Quick sanity check for T-VIP rank calculation — no DB needed.
 * Run: node tests/rankLogic.test.js
 * ----------------------------------------------------
 */

const { calculateTVipRank } = require("../services/rankCalculator");

const cases = [
  { deposit: 50, expected: "DEMO" },
  { deposit: 100, expected: "T-VIP-1" },
  { deposit: 250, expected: "T-VIP-2" }, // between 200 and 300 -> should stay at T-VIP-2
  { deposit: 999, expected: "T-VIP-5" }, // just under 1000 -> T-VIP-5
  { deposit: 2000, expected: "T-VIP-7" },
  { deposit: 5000, expected: "T-VIP-7" }, // above max -> caps at highest rank
];

console.log("Running T-VIP rank calculation tests...\n");

let passed = 0;
for (const c of cases) {
  const result = calculateTVipRank(c.deposit);
  const ok = result.rank === c.expected;
  console.log(
    `Deposit $${c.deposit} -> got ${result.rank} (expected ${c.expected}) [${
      ok ? "PASS" : "FAIL"
    }]`
  );
  if (ok) passed++;
}

console.log(`\n${passed}/${cases.length} tests passed.`);
