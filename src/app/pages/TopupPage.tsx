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
    <div className="stack" style={{ maxWidth: "520px", margin: "0 auto" }}>
      <Link to="/" className="text-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}>
        <ArrowLeft size={16} /> {t("Back to Dashboard", "Back to Dashboard")}
      </Link>

      <section className="card" style={{ padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
            <Wallet size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{t("Add Account Credit", "Add Account Credit")}</h1>
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{t("Top up your prepaid balance via secure card checkout.", "Top up your prepaid balance via secure card checkout.")}</p>
          </div>
        </div>

        {error ? <div className="inline-message inline-message--error" style={{ marginTop: "16px" }}>{error}</div> : null}

        <div className="topup-presets" style={{ marginTop: "24px" }}>
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

        <label className="field" style={{ marginTop: "16px" }}>
          <span>{t("Custom amount (USD)", "Custom amount (USD)")}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="25.00"
            style={{ fontSize: "1.2rem", fontWeight: 700, textAlign: "center" }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleTopup(); }}
          />
        </label>

        {!valid && amount.length > 0 ? (
          <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--error)" }}>{t("Minimum $0.50", "Minimum $0.50")}</p>
        ) : null}

        <button
          type="button"
          className="primary-button"
          style={{ width: "100%", marginTop: "20px", padding: "14px", fontSize: "1.05rem", justifyContent: "center" }}
          disabled={!valid || busy}
          onClick={() => void handleTopup()}
        >
          {busy ? t("Opening checkout...", "Opening checkout...") : t("Add ${amount} credit", "Add ${amount} credit").replace("{amount}", valid ? parsed.toFixed(2) : "—")}
        </button>

        <p className="muted" style={{ margin: "14px 0 0", fontSize: "0.82rem", textAlign: "center" }}>
          {t("You'll be redirected to Stripe's secure checkout. Your card will also be saved for automatic renewals.", "You'll be redirected to Stripe's secure checkout. Your card will also be saved for automatic renewals.")}
        </p>
      </section>
    </div>
  );
}
