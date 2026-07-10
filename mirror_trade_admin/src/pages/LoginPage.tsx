import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@mirrortrade.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        // @ts-expect-error axios error shape
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Login failed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            MirrorTrade
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Admin Login</h1>
          <p className="mt-1 text-sm text-slate-400">
            Shared backend · admin panel only
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none ring-blue-500 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none ring-blue-500 focus:ring-2"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Seed admin: admin@mirrortrade.com / Admin@123
        </p>
      </div>
    </div>
  );
}
