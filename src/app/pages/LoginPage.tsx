import { FormEvent, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthMarketingPanel } from "../components/AuthMarketingPanel";
import { AuthPasswordField } from "../components/AuthPasswordField";
import { EmailVerificationCodePanel } from "../components/EmailVerificationCodePanel";
import { loginCustomer, resendVerificationEmail } from "../lib/customer-api";
import { saveCustomerSession } from "../lib/customer-session";
import { useLocalization, LANGUAGES } from "../lib/i18n";
import { Globe2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("verificationError") === "1"
      ? "This verification link is invalid or has expired. Request a new code below."
      : null);
  const [notice, setNotice] = useState<string | null>(() =>
    searchParams.get("passwordReset") === "1"
      ? "Password reset successful. Sign in with your new password."
      : searchParams.get("verified") === "1"
        ? "Email verified. Sign in to continue."
        : null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(() =>
    searchParams.get("verificationError") === "1" ? searchParams.get("email") : null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const { currentLang, setLang, t } = useLocalization();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [tempLang, setTempLang] = useState(currentLang);

  useEffect(() => {
    setTempLang(currentLang);
  }, [currentLang]);

  const handleSaveLangSettings = () => {
    setLang(tempLang);
    setIsLangModalOpen(false);
  };

  const target = typeof location.state?.from === "string" ? location.state.from : "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setPreviewUrl(null);
    setVerificationEmail(null);

    try {
      const result = await loginCustomer({ email, password });
      if (!result.success || !result.customerId || !result.token) {
        setError(result.message);
        setPreviewUrl(result.verificationPreviewUrl);
        if (result.requiresEmailVerification) {
          const normalized = email.trim().toLowerCase();
          setVerificationEmail(normalized);
          setNotice("Enter the 6-digit code we emailed you, or use the link in the email.");
        }
        return;
      }

      saveCustomerSession({
        customerId: result.customerId,
        email: email.trim().toLowerCase(),
        token: result.token,
      });
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cannot connect to backend.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStandaloneResend() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email first so we know where to send the verification link.");
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);
    setPreviewUrl(null);

    try {
      const result = await resendVerificationEmail({ email: normalizedEmail });
      if (!result.success) {
        setError(result.message);
        setPreviewUrl(result.verificationPreviewUrl);
        if (result.verificationPreviewUrl) {
          setVerificationEmail(normalizedEmail.toLowerCase());
        }
        return;
      }

      setNotice(result.message);
      setPreviewUrl(result.verificationPreviewUrl);
      setVerificationEmail(normalizedEmail.toLowerCase());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cannot connect to backend.");
    } finally {
      setResending(false);
    }
  }

  function handleVerified(verifiedEmail: string) {
    setVerificationEmail(null);
    setNotice("Email verified. Sign in to continue.");
    const params = new URLSearchParams({ verified: "1", email: verifiedEmail });
    navigate(`/login?${params.toString()}`, { replace: true });
  }

  return (
    <div className="auth-shell">
      <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 100 }}>
        <button className="nav-lang-selector" onClick={() => setIsLangModalOpen(true)} type="button">
          <Globe2 size={15} />
          <span>{currentLang}</span>
        </button>
      </div>

      <AuthMarketingPanel />

      <div className="auth-card">
        <p className="eyebrow">{t("Welcome back", "Welcome back")}</p>
        <h1>{t("Sign in to Vibe Hosting", "Sign in to Vibe Hosting")}</h1>
        <p className="page-copy">
          {t("Sign in after you confirm your email. If you still need the verification code, we can send it again.", "Sign in after you confirm your email. If you still need the verification code, we can send it again.")}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>{t("Email", "Email")}</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
            />
          </label>
          <AuthPasswordField
            autoComplete="current-password"
            label={t("Password", "Password")}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("Enter your password", "Enter your password")}
            required
            value={password}
          />
          <div className="auth-inline-row">
            <Link
              className="auth-inline-link"
              to={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"}
            >
              {t("Forgot password?", "Forgot password?")}
            </Link>
          </div>

          {error ? <div className="inline-message inline-message--error">{error}</div> : null}
          {notice ? <div className="inline-message inline-message--success">{notice}</div> : null}

          {verificationEmail ? (
            <EmailVerificationCodePanel
              email={verificationEmail}
              previewUrl={previewUrl}
              onVerified={handleVerified}
            />
          ) : (
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? t("Signing in...", "Signing in...") : t("Sign in", "Sign in")}
            </button>
          )}
        </form>

        {!verificationEmail && (error || notice) ? (
          <div className="auth-action-row auth-action-row--secondary">
            <button
              className="secondary-button"
              disabled={resending}
              onClick={handleStandaloneResend}
              type="button"
            >
              {resending ? t("Sending...", "Sending...") : t("Resend verification email", "Resend verification email")}
            </button>
          </div>
        ) : null}

        <p className="auth-footnote">
          {t("Need an account?", "Need an account?")} <Link to="/register">{t("Create one", "Create one")}</Link>
        </p>
      </div>

      {isLangModalOpen && (
        <div className="lang-modal-overlay" onClick={() => setIsLangModalOpen(false)}>
          <div className="lang-modal-box" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="lang-modal-title">{t("Language Options", "Language Options")}</h3>
              <p className="lang-modal-subtitle">
                {t("Choose your preferred language.", "Choose your preferred language.")}
              </p>
            </div>

            <div className="lang-modal-section">
              <label className="lang-modal-label">{t("Select Language", "Select Language")}</label>
              <select
                className="lang-modal-select"
                value={tempLang}
                onChange={(e) => setTempLang(e.target.value)}
              >
                {Object.entries(LANGUAGES).map(([key, lang]) => (
                  <option key={key} value={key}>
                    {lang.label} ({key})
                  </option>
                ))}
              </select>
            </div>

            <div className="lang-modal-actions">
              <button className="btn-secondary" onClick={() => setIsLangModalOpen(false)}>
                {t("Cancel", "Cancel")}
              </button>
              <button className="btn-primary" onClick={handleSaveLangSettings}>
                {t("Save Changes", "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
