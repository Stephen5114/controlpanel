import "../../styles/auth-brand.css";
import "../../styles/auth.css";
import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthMarketingPanel } from "../components/AuthMarketingPanel";
import { AuthPasswordField } from "../components/AuthPasswordField";
import { resetPassword } from "../lib/customer-api";
import { useLocalization } from "../lib/i18n";

export function ResetPasswordPage() {
  const { t } = useLocalization();

  const INVALID_RESET_MESSAGE = t("This password reset link is invalid or has expired.", "This password reset link is invalid or has expired.");
  const MISSING_RESET_MESSAGE = t("This password reset link is missing or invalid. Request a new one to continue.", "This password reset link is missing or invalid. Request a new one to continue.");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const invalidFromQuery = searchParams.get("invalid") === "1";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(() => {
    if (invalidFromQuery) {
      return INVALID_RESET_MESSAGE;
    }

    return token ? null : MISSING_RESET_MESSAGE;
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setFatalError(MISSING_RESET_MESSAGE);
      return;
    }

    if (!password.trim()) {
      setError(t("Enter a new password.", "Enter a new password."));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match.", "Passwords do not match."));
      return;
    }

    setSubmitting(true);

    try {
      const result = await resetPassword({ token, password });
      if (!result.success) {
        if (result.message === INVALID_RESET_MESSAGE) {
          setFatalError(result.message);
          return;
        }

        setError(result.message);
        return;
      }

      const nextSearch = new URLSearchParams();
      nextSearch.set("passwordReset", "1");
      if (result.email) {
        nextSearch.set("email", result.email);
      }

      navigate(`/login?${nextSearch.toString()}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Cannot connect to backend.", "Cannot connect to backend."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthMarketingPanel />

      <div className="auth-card">
        <p className="eyebrow">{t("Choose a new password", "Choose a new password")}</p>
        <h1>{t("Finish resetting your password", "Finish resetting your password")}</h1>
        <p className="page-copy">
          {t("Pick a new password for your Vibe Hosting account. After that, you can sign in right away.", "Pick a new password for your Vibe Hosting account. After that, you can sign in right away.")}
        </p>

        {fatalError ? (
          <div className="auth-form">
            <div className="inline-message inline-message--error">{fatalError}</div>
            <div className="auth-action-row">
              <Link className="primary-button" to="/forgot-password">
                {t("Request a new reset link", "Request a new reset link")}
              </Link>
              <Link className="secondary-button" to="/login">
                {t("Back to sign in", "Back to sign in")}
              </Link>
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <AuthPasswordField
              autoComplete="new-password"
              label={t("New password", "New password")}
              name="new-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("Choose a new password", "Choose a new password")}
              required
              value={password}
            />
            <AuthPasswordField
              autoComplete="new-password"
              label={t("Confirm password", "Confirm password")}
              name="confirm-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("Repeat your new password", "Repeat your new password")}
              required
              value={confirmPassword}
            />

            {error ? <div className="inline-message inline-message--error">{error}</div> : null}

            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? t("Saving password...", "Saving password...") : t("Reset password", "Reset password")}
            </button>
          </form>
        )}

        <p className="auth-footnote">
          {t("Prefer to start over?", "Prefer to start over? ")}{" "}
          <Link to="/forgot-password">{t("Request a fresh link", "Request a fresh link")}</Link>
        </p>
      </div>
    </div>
  );
}
