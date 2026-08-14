import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage } from "../api/client.js";
import { Alert, Spinner } from "../components/ui.jsx";

const ROLE_OPTIONS = [
  { value: "reporter", label: "Reporter — files bugs" },
  { value: "tester", label: "Tester — files and verifies bugs" },
  { value: "developer", label: "Developer — fixes bugs" },
];

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "reporter" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not create your account"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🐛</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">The first account created becomes the admin.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <Alert>{error}</Alert>

          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              required
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ada Lovelace"
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
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
              required
              minLength={8}
              className="field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm text-ink-500">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
