import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../api/client";
import { getHomeRouteForRole } from "../lib/roleHome";
import { Alert } from "../components/Alert";

export function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deliberately always the role's own home, never a preserved "from"
  // location: this page can be reached right after a different user logged
  // out on the same tab, and any stale `location.state` from that earlier
  // session must never influence where the next login lands.
  if (!isLoading && user) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }

  const emailIsValid = /^\S+@\S+\.\S+$/.test(email);
  const passwordIsValid = password.length > 0;
  const formIsValid = emailIsValid && passwordIsValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!formIsValid) return;

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(getHomeRouteForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to log in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login-card stack" onSubmit={handleSubmit} noValidate>
        <div className="login-brand">
          <span className="navbar-mark" aria-hidden="true">
            R
          </span>
          <div>
            <h1>Sign in</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Restaurant Management System
            </p>
          </div>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@restaurant.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-touched={touched}
            aria-invalid={touched && !emailIsValid}
            aria-describedby={touched && !emailIsValid ? "email-error" : undefined}
            required
          />
          {touched && !emailIsValid && (
            <span className="field-error" id="email-error">
              Enter a valid email address.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-touched={touched}
            aria-invalid={touched && !passwordIsValid}
            aria-describedby={touched && !passwordIsValid ? "password-error" : undefined}
            required
          />
          {touched && !passwordIsValid && (
            <span className="field-error" id="password-error">
              Password is required.
            </span>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
