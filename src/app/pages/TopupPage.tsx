import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { createAccountTopup } from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { useLocalization } from "../lib/i18n";

const PRESETS = [5, 10, 25, 50, 100];

export function TopupPage() {
  const { t } = useLocalization();
  const [amount, setAmount] = useState("25");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = Number.parseFloat(amount);
  const valid = Number.isFinite(parsed) && parsed >= 0.5;

  async function handleTopup() {
    const session = getCustomerSession();
    if (!session || !valid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAccountTopup(session, { amount: parsed });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setError(result.message || t("Unexpected response.", "Unexpected response."));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not start top-up.", "Could not start top-up."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack tp-wrapper">
      <Link to="/" className="text-button tp-back-link">
        <ArrowLeft size={16} /> {t("Back to Dashboard", "Back to Dashboard")}
      </Link>

      <section className="card tp-card">
        <div className="tp-header">
          <div className="tp-icon-box">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="tp-title">{t("Add Account Credit", "Add Account Credit")}</h1>
            <p className="muted tp-subtitle">{t("Top up your prepaid balance via secure card checkout.", "Top up your prepaid balance via secure card checkout.")}</p>
          </div>
        </div>

        {error ? <div className="inline-message inline-message--error tp-error-msg">{error}</div> : null}

        <div className="topup-presets tp-presets-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`topup-preset ${Number.parseFloat(amount) === preset ? "topup-preset--active" : ""}`}
              onClick={() => setAmount(String(preset))}
            >
              ${preset}
            </button>
          ))}
        </div>

        <label className="field tp-custom-field">
          <span>{t("Custom amount (USD)", "Custom amount (USD)")}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="25.00"
            className="tp-custom-input"
            onKeyDown={(e) => { if (e.key === "Enter") void handleTopup(); }}
          />
        </label>

        {!valid && amount.length > 0 ? (
          <p className="tp-min-error">{t("Minimum $0.50", "Minimum $0.50")}</p>
        ) : null}

        <button
          type="button"
          className="primary-button tp-submit-btn"
          disabled={!valid || busy}
          onClick={() => void handleTopup()}
        >
          {busy ? t("Opening checkout...", "Opening checkout...") : t("Add ${amount} credit", "Add ${amount} credit").replace("{amount}", valid ? parsed.toFixed(2) : "—")}
        </button>

        <p className="muted tp-footnote">
          {t("You'll be redirected to Stripe's secure checkout. Your card will also be saved for automatic renewals.", "You'll be redirected to Stripe's secure checkout. Your card will also be saved for automatic renewals.")}
        </p>
      </section>
    </div>
  );
}
