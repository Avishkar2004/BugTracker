import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage } from "../api/client.js";
import { Alert, Spinner } from "../components/ui.jsx";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (user) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not sign you in"));
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => setForm({ email: "admin@bugtracker.dev", password: "password123" });

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🐛</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Bug Tracker</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in to pick up where the team left off.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <Alert>{error}</Alert>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <button type="button" onClick={useDemo} className="btn-ghost w-full">
            Fill demo admin credentials
          </button>

          <p className="text-center text-sm text-ink-500">
            No account?{" "}
            <Link to="/register" className="font-medium text-indigo-600 hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
