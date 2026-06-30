import "../../styles/auth-brand.css";
import "../../styles/auth.css";
import { FormEvent, useEffect, useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthMarketingPanel } from "../components/AuthMarketingPanel";
import { AuthPasswordField } from "../components/AuthPasswordField";
import { requestPasswordReset, resendVerificationEmail, resetPassword } from "../lib/customer-api";
import { useLocalization } from "../lib/i18n";

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordPage() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeInputId = useId();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [resetPreviewUrl, setResetPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setRequiresVerification(false);
    setVerificationPreviewUrl(null);
    setResetPreviewUrl(null);

    try {
      const result = await requestPasswordReset({ email });
      if (!result.success) {
        setError(result.message);
        setRequiresVerification(result.requiresEmailVerification);
        setVerificationPreviewUrl(result.verificationPreviewUrl);
        return;
      }

      setNotice(t("If an account exists, we sent a 6-digit code and a reset link to your inbox.", "If an account exists, we sent a 6-digit code and a reset link to your inbox."));
      setResetPreviewUrl(result.resetPreviewUrl);
      setStage("reset");
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Cannot connect to backend.", "Cannot connect to backend."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (cooldownRemaining > 0) return;
    if (!email.trim()) return;

    setResetting(false);
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const result = await requestPasswordReset({ email });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice(t("A new code has been sent. Please check your inbox.", "A new code has been sent. Please check your inbox."));
      setResetPreviewUrl(result.resetPreviewUrl);
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      setCode("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Cannot connect to backend.", "Cannot connect to backend."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError(t("Enter the 6-digit code from your email.", "Enter the 6-digit code from your email."));
      return;
    }
    if (!newPassword) {
      setError(t("Choose a new password.", "Choose a new password."));
      return;
    }

    setResetting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await resetPassword({
        email: email.trim().toLowerCase(),
        code: trimmedCode,
        password: newPassword,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      const params = new URLSearchParams({ passwordReset: "1" });
      if (result.email) params.set("email", result.email);
      navigate(`/login?${params.toString()}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Cannot connect to backend.", "Cannot connect to backend."));
    } finally {
      setResetting(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(t("Enter your email first so we know where to send the verification link.", "Enter your email first so we know where to send the verification link."));
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);
    setVerificationPreviewUrl(null);

    try {
      const result = await resendVerificationEmail({ email: normalizedEmail });
      if (!result.success) {
        setError(result.message);
        setVerificationPreviewUrl(result.verificationPreviewUrl);
        setRequiresVerification(Boolean(result.verificationPreviewUrl));
        return;
      }

      setNotice(result.message);
      setVerificationPreviewUrl(result.verificationPreviewUrl);
      setRequiresVerification(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Cannot connect to backend.", "Cannot connect to backend."));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthMarketingPanel />

      <div className="auth-card">
        <p className="eyebrow">{t("Password help", "Password help")}</p>
        <h1>{t("Reset your password", "Reset your password")}</h1>
        <p className="page-copy">
          {stage === "request"
            ? t("Enter the email you use for Vibe Hosting. We'll send a 6-digit code and a secure link to choose a new password.", "Enter the email you use for Vibe Hosting. We'll send a 6-digit code and a secure link to choose a new password.")
            : t("Check your inbox. Enter the 6-digit code we just sent and choose a new password.", "Check your inbox. Enter the 6-digit code we just sent and choose a new password.")}
        </p>

        {stage === "request" ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>{t("Email", "Email")}</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("you@company.com", "you@company.com")}
                required
                type="email"
              />
            </label>

            {error ? <div className="inline-message inline-message--error">{error}</div> : null}
            {notice ? <div className="inline-message inline-message--success">{notice}</div> : null}

            {requiresVerification ? (
              <div className="auth-action-row">
                <button
                  className="secondary-button"
                  disabled={resending}
                  onClick={handleResendVerification}
                  type="button"
                >
                  {resending ? t("Sending link...", "Sending link...") : t("Resend verification email", "Resend verification email")}
                </button>
                {verificationPreviewUrl ? (
                  <a className="secondary-button" href={verificationPreviewUrl}>
                    {t("Open verification link", "Open verification link")}
                  </a>
                ) : null}
              </div>
            ) : null}

            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? t("Sending code...", "Sending code...") : t("Send code", "Send code")}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleResetWithCode}>
            <p className="otp-panel__hint">
              {t("We emailed a code to", "We emailed a code to ")} <strong>{email.trim().toLowerCase()}</strong>.
            </p>
            <label className="otp-panel__field" htmlFor={codeInputId}>
              <span>{t("Verification code", "Verification code")}</span>
              <input
                autoComplete="one-time-code"
                className="otp-panel__input"
                id={codeInputId}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                pattern="[0-9]{6}"
                placeholder={t("000000", "000000")}
                required
                value={code}
              />
            </label>
            <AuthPasswordField
              autoComplete="new-password"
              label={t("New password", "New password")}
              name="newPassword"
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t("Choose a new password", "Choose a new password")}
              required
              value={newPassword}
            />

            {error ? <div className="inline-message inline-message--error">{error}</div> : null}
            {notice ? <div className="inline-message inline-message--success">{notice}</div> : null}

            <div className="auth-action-row">
              <button className="primary-button" disabled={resetting || code.length !== 6} type="submit">
                {resetting ? t("Resetting...", "Resetting...") : t("Reset password", "Reset password")}
              </button>
              <button
                className="secondary-button"
                disabled={submitting || cooldownRemaining > 0}
                onClick={handleResendCode}
                type="button"
              >
                {submitting
                  ? t("Sending...", "Sending...")
                  : cooldownRemaining > 0
                    ? t("Resend in {seconds}s", "Resend in {seconds}s").replace("{seconds}", String(cooldownRemaining))
                    : t("Resend code", "Resend code")}
              </button>
              {resetPreviewUrl ? (
                <a className="secondary-button" href={resetPreviewUrl}>
                  {t("Open reset link", "Open reset link")}
                </a>
              ) : null}
            </div>

            <p className="auth-footnote">
              {t("Wrong email?", "Wrong email? ")}{" "}
              <button
                className="auth-inline-link auth-inline-link--button"
                onClick={() => {
                  setStage("request");
                  setCode("");
                  setNewPassword("");
                  setNotice(null);
                  setError(null);
                  setResetPreviewUrl(null);
                }}
                type="button"
              >
                {t("Start over", "Start over")}
              </button>
            </p>
          </form>
        )}

        <p className="auth-footnote">
          {t("Remembered it?", "Remembered it? ")}
          <Link to={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}>
            {t("Back to sign in", "Back to sign in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
