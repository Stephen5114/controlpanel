import "../../styles/auth-brand.css";
import "../../styles/auth.css";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { AuthMarketingPanel } from "../components/AuthMarketingPanel";
import { AuthPasswordField } from "../components/AuthPasswordField";
import { EmailVerificationCodePanel } from "../components/EmailVerificationCodePanel";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { registerCustomer } from "../lib/customer-api";
import { isPasswordValid } from "../lib/password-rules";
import { useLocalization, LANGUAGES } from "../lib/i18n";

const TERMS_URL = "https://hostvibecoding.com/tos";
const PRIVACY_URL = "https://hostvibecoding.com/privacy";

export function RegisterPage() {
  const { currentLang, setLang, t } = useLocalization();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [tempLang, setTempLang] = useState(currentLang);

  useEffect(() => { setTempLang(currentLang); }, [currentLang]);

  const handleSaveLangSettings = () => { setLang(tempLang); setIsLangModalOpen(false); };
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    !submitting &&
    email.trim().length > 0 &&
    isPasswordValid(password) &&
    passwordsMatch &&
    agreedToTerms &&
    turnstileToken !== null;

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPasswordValid(password)) {
      setError(t("Your password does not meet all the requirements below.", "Your password does not meet all the requirements below."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("The two passwords do not match.", "The two passwords do not match."));
      return;
    }
    if (!agreedToTerms) {
      setError(t("Please accept the Terms of Service and Privacy Policy to continue.", "Please accept the Terms of Service and Privacy Policy to continue."));
      return;
    }

    setSubmitting(true);
    setPreviewUrl(null);
    setPendingEmail(null);

    try {
      const result = await registerCustomer({ email, password, username: username.trim() || undefined, turnstileToken: turnstileToken ?? undefined });
      setPreviewUrl(result.verificationPreviewUrl);

      if (!result.success) {
        setError(result.message);
        if (result.requiresEmailVerification) {
          setPendingEmail(email.trim().toLowerCase());
        }
        return;
      }

      if (result.requiresEmailVerification) {
        setPendingEmail(email.trim().toLowerCase());
        setSuccess(result.message);
      } else {
        setSuccess(result.message);
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAgreedToTerms(false);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Cannot connect to backend.", "Cannot connect to backend."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleVerified(verifiedEmail: string) {
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
        <p className="eyebrow">{t("Get started", "Get started")}</p>
        <h1>{t("Create your Vibe Hosting account", "Create your Vibe Hosting account")}</h1>
        <p className="page-copy">
          {t("Create your account, verify your email, and you will be ready to sign in right away.", "Create your account, verify your email, and you will be ready to sign in right away.")}
        </p>

        {pendingEmail ? (
          <>
            {success ? <div className="inline-message inline-message--success">{success}</div> : null}
            {error ? <div className="inline-message inline-message--error">{error}</div> : null}
            <EmailVerificationCodePanel
              email={pendingEmail}
              previewUrl={previewUrl}
              onVerified={handleVerified}
            />
            <p className="auth-footnote">
              {t("Wrong email?", "Wrong email?")}{" "}
              <button className="auth-inline-link auth-inline-link--button" onClick={() => { setPendingEmail(null); setSuccess(null); setError(null); }} type="button">
                {t("Start over", "Start over")}
              </button>
            </p>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>{t("Username", "Username")}</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                placeholder={t("vibedev", "vibedev")}
                autoComplete="username"
                minLength={3}
                maxLength={30}
              />
            </label>
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
            <AuthPasswordField
              autoComplete="new-password"
              label={t("Password", "Password")}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("Create a password", "Create a password")}
              required
              value={password}
            />
            <PasswordRequirements password={password} />

            <AuthPasswordField
              autoComplete="new-password"
              label={t("Confirm password", "Confirm password")}
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("Re-enter your password", "Re-enter your password")}
              required
              value={confirmPassword}
            />
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="field-error">{t("The two passwords do not match.", "The two passwords do not match.")}</p>
            ) : null}

            <label className="auth-terms-row">
              <input
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
                type="checkbox"
              />
              <span>
                {t("I agree to the", "I agree to the ")}
                <a href={TERMS_URL} rel="noopener noreferrer" target="_blank">
                  {t("Terms of Service", "Terms of Service")}
                </a>{" "}
                {t("and", "and")}{" "}
                <a href={PRIVACY_URL} rel="noopener noreferrer" target="_blank">
                  {t("Privacy Policy", "Privacy Policy")}
                </a>
                .
              </span>
            </label>

            <TurnstileWidget
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileExpire}
            />

            {error ? <div className="inline-message inline-message--error">{error}</div> : null}
            {success ? <div className="inline-message inline-message--success">{success}</div> : null}

            <button className="primary-button" disabled={!canSubmit} type="submit">
              {submitting ? t("Creating account...", "Creating account...") : t("Create account", "Create account")}
            </button>
          </form>
        )}

        <p className="auth-footnote">
          {t("Already have an account?", "Already have an account? ")}
          <Link to="/login">{t("Sign in", "Sign in")}</Link>
        </p>
      </div>

      {isLangModalOpen && (
        <div className="lang-modal-overlay" onClick={() => setIsLangModalOpen(false)}>
          <div className="lang-modal-box" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="lang-modal-title">{t("Language Options", "Language Options")}</h3>
              <p className="lang-modal-subtitle">{t("Choose your preferred language.", "Choose your preferred language.")}</p>
            </div>
            <div className="lang-modal-section">
              <label className="lang-modal-label">{t("Select Language", "Select Language")}</label>
              <select className="lang-modal-select" value={tempLang} onChange={(e) => setTempLang(e.target.value)}>
                {Object.entries(LANGUAGES).map(([key, lang]) => (
                  <option key={key} value={key}>{lang.label} ({key})</option>
                ))}
              </select>
            </div>
            <div className="lang-modal-actions">
              <button className="btn-secondary" onClick={() => setIsLangModalOpen(false)}>{t("Cancel", "Cancel")}</button>
              <button className="btn-primary" onClick={handleSaveLangSettings}>{t("Save Changes", "Save Changes")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
