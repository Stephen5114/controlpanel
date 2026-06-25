import { FormEvent, useEffect, useId, useState } from "react";
import { resendVerificationEmail, verifyEmailWithCode } from "../lib/customer-api";

type EmailVerificationCodePanelProps = {
  email: string;
  previewUrl?: string | null;
  onVerified: (verifiedEmail: string) => void;
  resendCooldownSeconds?: number;
};

const RESEND_COOLDOWN_DEFAULT = 60;

export function EmailVerificationCodePanel({
  email,
  previewUrl,
  onVerified,
  resendCooldownSeconds = RESEND_COOLDOWN_DEFAULT,
}: EmailVerificationCodePanelProps) {
  const codeInputId = useId();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(previewUrl ?? null);
  const [cooldownRemaining, setCooldownRemaining] = useState(resendCooldownSeconds);

  useEffect(() => {
    setActivePreviewUrl(previewUrl ?? null);
  }, [previewUrl]);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await verifyEmailWithCode({ email, code: trimmedCode });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onVerified(result.email ?? email);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cannot connect to backend.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldownRemaining > 0) return;

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await resendVerificationEmail({ email });
      if (!result.success) {
        setError(result.message);
        setActivePreviewUrl(result.verificationPreviewUrl ?? null);
        return;
      }

      setNotice(result.message);
      setActivePreviewUrl(result.verificationPreviewUrl ?? null);
      setCooldownRemaining(resendCooldownSeconds);
      setCode("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cannot connect to backend.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form className="otp-panel" onSubmit={handleSubmit}>
      <p className="otp-panel__hint">
        Enter the 6-digit code we emailed to <strong>{email}</strong>.
      </p>
      <label className="otp-panel__field" htmlFor={codeInputId}>
        <span>Verification code</span>
        <input
          autoComplete="one-time-code"
          className="otp-panel__input"
          id={codeInputId}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => {
            const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(digitsOnly);
          }}
          pattern="[0-9]{6}"
          placeholder="000000"
          required
          value={code}
        />
      </label>

      {error ? <div className="inline-message inline-message--error">{error}</div> : null}
      {notice ? <div className="inline-message inline-message--success">{notice}</div> : null}

      <div className="auth-action-row">
        <button className="primary-button" disabled={submitting || code.length !== 6} type="submit">
          {submitting ? "Verifying..." : "Verify email"}
        </button>
        <button
          className="secondary-button"
          disabled={resending || cooldownRemaining > 0}
          onClick={handleResend}
          type="button"
        >
          {resending
            ? "Sending..."
            : cooldownRemaining > 0
              ? `Resend in ${cooldownRemaining}s`
              : "Resend code"}
        </button>
        {activePreviewUrl ? (
          <a className="secondary-button" href={activePreviewUrl}>
            Open verification link
          </a>
        ) : null}
      </div>
    </form>
  );
}
