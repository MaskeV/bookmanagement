import { useState } from "react";
import "./AuthPage.css";
import { authRequest, saveSession } from "./Api";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  const change = (field, value) => setForm({ ...form, [field]: value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (isSignup) {
      if (form.password.length < 6) return setError("Password must be at least 6 characters.");
      if (form.password !== form.confirm) return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      if (isSignup) {
        await authRequest("register", {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        setForm({ ...form, password: "", confirm: "" });
        setMode("login");
        setInfo("Account created. Log in to continue.");
      } else {
        // expected response: { token, name, role }
        const data = await authRequest("login", { email: form.email, password: form.password });
        saveSession(data);
        onLogin(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>Book Management</h1>
          <p>{isSignup ? "Create an account to manage your library." : "Log in to manage your library."}</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={!isSignup ? "on" : ""} onClick={() => switchMode("login")}>
            Log in
          </button>
          <button type="button" className={isSignup ? "on" : ""} onClick={() => switchMode("signup")}>
            Sign up
          </button>
        </div>

        <form onSubmit={submit}>
          {isSignup && (
            <label>
              Full name
              <input required value={form.name} onChange={(e) => change("name", e.target.value)} />
            </label>
          )}

          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </label>

          <label>
            Password
            <div className="pw">
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) => change("password", e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {isSignup && (
            <label>
              Confirm password
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => change("confirm", e.target.value)}
              />
            </label>
          )}

          {error && <div className="msg error">{error}</div>}
          {info && <div className="msg ok">{info}</div>}

          <button className="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="switch">
          {isSignup ? "Already have an account? " : "New here? "}
          <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}