/**
 * End-to-end smoke test against a running MirrorTrade API.
 * Usage: node scripts/smoke-test.js [baseUrl]
 * Default: http://localhost:7000/api
 */
const BASE = (process.argv[2] || "http://localhost:7000/api").replace(/\/$/, "");

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(label, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${label}`);
    return true;
  }
  console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`);
  return false;
}

async function main() {
  console.log(`\nMirrorTrade smoke test → ${BASE}\n`);
  let passed = 0;
  let failed = 0;
  const check = (label, cond, detail) => {
    if (ok(label, cond, detail)) passed++;
    else failed++;
  };

  // Health
  const health = await req("GET", "/health");
  check("GET /health", health.status === 200 && health.data.success);

  const routes = await req("GET", "/routes");
  check(
    "GET /routes",
    routes.status === 200 && Array.isArray(routes.data.data) && routes.data.data.length > 10
  );

  const plans = await req("GET", "/plans");
  check("GET /plans", plans.status === 200 && plans.data.success);

  const traders = await req("GET", "/trade/traders");
  check(
    "GET /trade/traders",
    traders.status === 200 && (traders.data.count || 0) >= 1,
    `count=${traders.data.count}`
  );

  // Login demo user
  const login = await req("POST", "/auth/login", {
    email: "user@mirrortrade.com",
    password: "User@123",
  });
  check("POST /auth/login (user)", login.status === 200 && !!login.data.token, login.data.message);
  const userToken = login.data.token;

  if (userToken) {
    const me = await req("GET", "/auth/me", null, userToken);
    check("GET /auth/me", me.status === 200 && me.data.user?.email);

    const wallet = await req("GET", "/wallet", null, userToken);
    check("GET /wallet", wallet.status === 200 && wallet.data.success);

    const depInfo = await req("GET", "/wallet/deposit-info", null, userToken);
    check("GET /wallet/deposit-info", depInfo.status === 200 && depInfo.data.data?.address);

    const planMe = await req("GET", "/plans/me", null, userToken);
    check("GET /plans/me", planMe.status === 200 && planMe.data.success);

    const ref = await req("GET", "/referrals/my-code", null, userToken);
    check("GET /referrals/my-code", ref.status === 200 && ref.data.data?.referralCode);

    const portfolio = await req("GET", "/trade/portfolio", null, userToken);
    check("GET /trade/portfolio", portfolio.status === 200 && portfolio.data.success);

    const exchanges = await req("GET", "/exchanges", null, userToken);
    check("GET /exchanges", exchanges.status === 200);
  }

  // Admin login
  const adminLogin = await req("POST", "/auth/login", {
    email: "admin@mirrortrade.com",
    password: "Admin@123",
  });
  check(
    "POST /auth/login (admin)",
    adminLogin.status === 200 && adminLogin.data.user?.role === "admin",
    adminLogin.data.message
  );
  const adminToken = adminLogin.data.token;

  if (adminToken) {
    const stats = await req("GET", "/admin/stats", null, adminToken);
    check("GET /admin/stats", stats.status === 200 && typeof stats.data.data?.totalUsers === "number");

    const users = await req("GET", "/admin/users?limit=10", null, adminToken);
    check("GET /admin/users", users.status === 200 && Array.isArray(users.data.data));

    const deps = await req("GET", "/admin/deposits", null, adminToken);
    check("GET /admin/deposits", deps.status === 200);

    const wds = await req("GET", "/admin/withdrawals", null, adminToken);
    check("GET /admin/withdrawals", wds.status === 200);
  }

  // Negative: non-admin cannot hit admin stats
  if (userToken) {
    const denied = await req("GET", "/admin/stats", null, userToken);
    check("Admin gate (user 403)", denied.status === 403);
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e.message);
  process.exit(1);
});
