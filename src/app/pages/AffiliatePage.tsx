import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  Check,
  Clock3,
  Copy,
  CreditCard,
  Link2,
  Mail,
  Share2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  createAffiliatePayout,
  getAffiliateCommissions,
  getAffiliateOverview,
  getAffiliatePayouts,
  getAffiliateReferrals,
} from "../lib/api-affiliate";
import type {
  AffiliateCommissionRow,
  AffiliateOverview,
  AffiliatePayoutRow,
  AffiliateReferralRow,
} from "../lib/api-affiliate";
import { getCustomerSession } from "../lib/customer-session";
import { getActiveLocale, useLocalization } from "../lib/i18n";

const REFERRAL_LINK_BASE = "https://hostvibecoding.com/r/";

type MainTab = "refer" | "earnings";
type EarningsTab = "commissions" | "referrals" | "payouts";

function MagneticButton({
  children,
  className,
  disabled,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 320, damping: 20, mass: 0.45 });
  const springY = useSpring(y, { stiffness: 320, damping: 20, mass: 0.45 });

  function followPointer(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left - bounds.width / 2) * 0.16);
    y.set((event.clientY - bounds.top - bounds.height / 2) * 0.2);
  }

  function resetPosition() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      type="button"
      className={className}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.94 }}
      onMouseMove={followPointer}
      onMouseLeave={resetPosition}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function HandDrawnReward() {
  return (
    <svg className="affiliate-handdrawn" viewBox="0 0 72 72" role="img" aria-label="Reward illustration">
      <path d="M16 38c5-15 28-22 42-10 10 9 5 28-10 33-16 5-38-7-32-23Z" />
      <path d="m27 36 7 7 13-16M20 18c5 1 8-2 9-7M49 13c-1 5 2 8 7 9M57 47c5 0 8 3 8 8" />
      <path d="M13 52c4-2 7-1 9 3" />
    </svg>
  );
}

function formatMoney(amount: number, currency: string) {
  return `${currency.toUpperCase() === "USD" ? "$" : `${currency.toUpperCase()} `}${amount.toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(getActiveLocale());
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (["available", "active", "converted", "paid", "paid_out", "approved"].includes(normalized)) {
    return "affiliate-status affiliate-status--success";
  }
  if (["pending", "requested", "needs_review"].includes(normalized)) {
    return "affiliate-status affiliate-status--warning";
  }
  if (["reversed", "rejected", "suspended", "disabled"].includes(normalized)) {
    return "affiliate-status affiliate-status--danger";
  }
  return "affiliate-status";
}

export function AffiliatePage() {
  const { t } = useLocalization();
  const session = getCustomerSession();

  const [overview, setOverview] = useState<AffiliateOverview | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommissionRow[]>([]);
  const [referrals, setReferrals] = useState<AffiliateReferralRow[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | "template" | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>("refer");
  const [earningsTab, setEarningsTab] = useState<EarningsTab>("commissions");

  const [creditAmount, setCreditAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState("paypal");
  const [cashDetails, setCashDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const referralLink = useMemo(
    () => (overview ? `${REFERRAL_LINK_BASE}${overview.code}` : ""),
    [overview],
  );

  async function refresh() {
    if (!session) return;
    try {
      const [ov, comms, refs, pays] = await Promise.all([
        getAffiliateOverview(session),
        getAffiliateCommissions(session),
        getAffiliateReferrals(session),
        getAffiliatePayouts(session),
      ]);
      setOverview(ov);
      setCommissions(comms);
      setReferrals(refs);
      setPayouts(pays);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not load affiliate data.", "Could not load affiliate data."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyToClipboard(text: string, kind: "link" | "code" | "template") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(t("Copy failed. Please select and copy the text manually.", "Copy failed. Please select and copy the text manually."));
    }
  }

  async function submitPayout(kind: "cash" | "account_credit") {
    if (!session || busy) return;
    const raw = kind === "cash" ? cashAmount : creditAmount;
    const amount = Number.parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await createAffiliatePayout(session, {
        kind,
        amount,
        method: kind === "cash" ? cashMethod : undefined,
        accountDetails: kind === "cash" ? cashDetails : undefined,
      });
      if (result.success) {
        setNotice(result.message);
        setCashAmount("");
        setCreditAmount("");
        setCashDetails("");
        await refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Request failed.", "Request failed."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="empty-panel stack"><p className="muted">{t("Loading...", "Loading...")}</p></div>;
  }

  if (!overview) {
    return (
      <div className="empty-panel stack">
        <h2>{t("Affiliate Program", "Affiliate Program")}</h2>
        {error ? <div className="inline-message inline-message--error">{error}</div> : null}
      </div>
    );
  }

  const canRequestCash = overview.availableBalance >= overview.minPayoutAmount;
  const conversionRate = overview.clickCount > 0
    ? Math.round((overview.conversionCount / overview.clickCount) * 1000) / 10
    : 0;
  const payoutProgress = Math.min(100, (overview.availableBalance / Math.max(overview.minPayoutAmount, 1)) * 100);
  const shareText = t(
    "Get {discount}% off your first Vibe Hosting order with my referral link: {link}",
    "Get {discount}% off your first Vibe Hosting order with my referral link: {link}",
  )
    .replace("{discount}", String(overview.newCustomerDiscountPercent))
    .replace("{link}", referralLink);
  const shareLinks = {
    email: `mailto:?subject=${encodeURIComponent("Vibe Hosting referral")}&body=${encodeURIComponent(shareText)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
  };
  const marketingTemplates = [
    t(
      "I deploy my projects on Vibe Hosting — simple hosting, one clear panel. Use my link for {discount}% off your first order: {link}",
      "I deploy my projects on Vibe Hosting — simple hosting, one clear panel. Use my link for {discount}% off your first order: {link}",
    ),
    t(
      "Looking for hosting for Node, Python or .NET apps? Vibe Hosting includes deploys, databases and domains in one place. Get {discount}% off: {link}",
      "Looking for hosting for Node, Python or .NET apps? Vibe Hosting includes deploys, databases and domains in one place. Get {discount}% off: {link}",
    ),
  ].map((template) => template
    .replace("{discount}", String(overview.newCustomerDiscountPercent))
    .replace("{link}", referralLink));

  return (
    <main className="affiliate-page">
      <header className="affiliate-page__header">
        <div>
          <p className="affiliate-eyebrow">{t("REFERRAL PROGRAM", "REFERRAL PROGRAM")}</p>
          <h1>{t("Refer friends. Earn rewards.", "Refer friends. Earn rewards.")}</h1>
          <p>{t("Share Vibe Hosting with people you know and earn when they become customers.", "Share Vibe Hosting with people you know and earn when they become customers.")}</p>
        </div>
      </header>

      <nav className="affiliate-main-tabs" aria-label={t("Affiliate sections", "Affiliate sections")}>
        <button
          type="button"
          className={activeTab === "refer" ? "is-active" : ""}
          aria-current={activeTab === "refer" ? "page" : undefined}
          onClick={() => setActiveTab("refer")}
        >
          <Share2 size={18} />
          {t("Refer & Earn", "Refer & Earn")}
        </button>
        <button
          type="button"
          className={activeTab === "earnings" ? "is-active" : ""}
          aria-current={activeTab === "earnings" ? "page" : undefined}
          onClick={() => setActiveTab("earnings")}
        >
          <Wallet size={18} />
          {t("My earnings", "My earnings")}
        </button>
      </nav>

      {notice ? <div className="inline-message inline-message--success">{notice}</div> : null}
      {error ? <div className="inline-message inline-message--error">{error}</div> : null}
      {!overview.programEnabled ? (
        <div className="inline-message inline-message--error">{t("The affiliate program is currently paused.", "The affiliate program is currently paused.")}</div>
      ) : null}
      {overview.status !== "active" ? (
        <div className="inline-message inline-message--error">{t("Your affiliate account is suspended. Contact support.", "Your affiliate account is suspended. Contact support.")}</div>
      ) : null}

      {activeTab === "refer" ? (
        <div className="affiliate-tab-content">
          <motion.section
            className="affiliate-hero"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 20 }}
          >
            <div className="affiliate-hero__copy">
              <span className="affiliate-hero__icon"><HandDrawnReward /></span>
              <h2>{t("Give a discount. Get rewarded.", "Give a discount. Get rewarded.")}</h2>
              <p>
                {t(
                  "Your friends receive {discount}% off their first order. You earn {first}% during their first year and {after}% after that.",
                  "Your friends receive {discount}% off their first order. You earn {first}% during their first year and {after}% after that.",
                )
                  .replace("{discount}", String(overview.newCustomerDiscountPercent))
                  .replace("{first}", String(overview.commissionPercentFirstYear))
                  .replace("{after}", String(overview.commissionPercentAfter))}
              </p>
            </div>
            <div className="affiliate-hero__reward" aria-hidden="true">
              <div><span>{overview.newCustomerDiscountPercent}%</span><small>{t("for friends", "for friends")}</small></div>
              <ArrowRight size={22} />
              <div><span>{overview.commissionPercentFirstYear}%</span><small>{t("for you", "for you")}</small></div>
            </div>
          </motion.section>

          <section className="affiliate-panel affiliate-share-panel">
            <div className="affiliate-section-heading">
              <div>
                <h2>{t("Share your referral link", "Share your referral link")}</h2>
                <p>{t("Anyone who joins through this link will be connected to your account.", "Anyone who joins through this link will be connected to your account.")}</p>
              </div>
              <span className="affiliate-code-chip">{t("Code", "Code")}: {overview.code}</span>
            </div>

            <div className="affiliate-link-control">
              <Link2 size={19} />
              <input readOnly value={referralLink} aria-label={t("Your referral link", "Your referral link")} onFocus={(event) => event.currentTarget.select()} />
              <MagneticButton onClick={() => void copyToClipboard(referralLink, "link")}>
                {copied === "link" ? <Check size={18} /> : <Copy size={18} />}
                {copied === "link" ? t("Copied", "Copied") : t("Copy link", "Copy link")}
              </MagneticButton>
            </div>

            <div className="affiliate-share-row">
              <span>{t("Share via", "Share via")}</span>
              <a href={shareLinks.email}><Mail size={17} />{t("Email", "Email")}</a>
              <a href={shareLinks.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
              <a href={shareLinks.x} target="_blank" rel="noreferrer">X</a>
              <a href={shareLinks.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <button type="button" onClick={() => void copyToClipboard(overview.code, "code")}>
                {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
                {t("Copy code", "Copy code")}
              </button>
            </div>
          </section>

          <section className="affiliate-panel">
            <div className="affiliate-section-heading">
              <div>
                <h2>{t("How referrals work", "How referrals work")}</h2>
                <p>{t("Three simple steps from sharing to earning.", "Three simple steps from sharing to earning.")}</p>
              </div>
            </div>
            <div className="affiliate-steps">
              <motion.article whileHover={{ y: -6, rotate: -0.35 }} transition={{ type: "spring", stiffness: 360, damping: 18 }}>
                <span>1</span><Share2 size={22} />
                <h3>{t("Share your link", "Share your link")}</h3>
                <p>{t("Send it directly or post it wherever your audience follows you.", "Send it directly or post it wherever your audience follows you.")}</p>
              </motion.article>
              <motion.article whileHover={{ y: -6, rotate: 0.35 }} transition={{ type: "spring", stiffness: 360, damping: 18 }}>
                <span>2</span><UserPlus size={22} />
                <h3>{t("A friend signs up", "A friend signs up")}</h3>
                <p>{t("They receive the new customer discount and purchase a service.", "They receive the new customer discount and purchase a service.")}</p>
              </motion.article>
              <motion.article whileHover={{ y: -6, rotate: -0.35 }} transition={{ type: "spring", stiffness: 360, damping: 18 }}>
                <span>3</span><Banknote size={22} />
                <h3>{t("You earn a reward", "You earn a reward")}</h3>
                <p>{t("After the {days}-day protection period, the commission becomes available.", "After the {days}-day protection period, the commission becomes available.").replace("{days}", String(overview.commissionHoldDays))}</p>
              </motion.article>
            </div>
          </section>

          <section className="affiliate-panel affiliate-materials">
            <div className="affiliate-section-heading">
              <div>
                <h2>{t("Ready-to-share messages", "Ready-to-share messages")}</h2>
                <p>{t("Use these as a starting point for social posts, blogs or communities.", "Use these as a starting point for social posts, blogs or communities.")}</p>
              </div>
            </div>
            <div className="affiliate-template-list">
              {marketingTemplates.map((template, index) => (
                <article key={index}>
                  <p>{template}</p>
                  <button type="button" onClick={() => void copyToClipboard(template, "template")}>
                    <Copy size={16} />{t("Copy message", "Copy message")}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="affiliate-tab-content">
          <section className="affiliate-summary-grid">
            <motion.article className="affiliate-summary-card affiliate-summary-card--featured" whileHover={{ y: -5, rotate: -0.4 }} transition={{ type: "spring", stiffness: 330, damping: 19 }}>
              <span><Wallet size={20} /></span>
              <p>{t("Available for payout", "Available for payout")}</p>
              <strong>{formatMoney(overview.availableBalance, overview.currency)}</strong>
              <button type="button" onClick={() => document.getElementById("affiliate-payout")?.scrollIntoView({ behavior: "smooth" })}>
                {t("Withdraw", "Withdraw")}<ArrowRight size={16} />
              </button>
            </motion.article>
            <motion.article className="affiliate-summary-card" whileHover={{ y: -5, rotate: 0.35 }} transition={{ type: "spring", stiffness: 330, damping: 19 }}>
              <span><Clock3 size={20} /></span>
              <p>{t("Pending commission", "Pending commission")}</p>
              <strong>{formatMoney(overview.pendingBalance, overview.currency)}</strong>
              <small>{t("In validation period", "In validation period")}</small>
            </motion.article>
            <motion.article className="affiliate-summary-card" whileHover={{ y: -5, rotate: -0.35 }} transition={{ type: "spring", stiffness: 330, damping: 19 }}>
              <span><Banknote size={20} /></span>
              <p>{t("Total paid out", "Total paid out")}</p>
              <strong>{formatMoney(overview.paidOutTotal, overview.currency)}</strong>
              <small>{payouts.length} {t("payouts", "payouts")}</small>
            </motion.article>
            <motion.article className="affiliate-summary-card" whileHover={{ y: -5, rotate: 0.4 }} transition={{ type: "spring", stiffness: 330, damping: 19 }}>
              <span><Users size={20} /></span>
              <p>{t("Total referrals", "Total referrals")}</p>
              <strong>{overview.signupCount}</strong>
              <small>{overview.conversionCount} {t("paying customers", "paying customers")}</small>
            </motion.article>
          </section>

          <section className="affiliate-panel affiliate-funnel-panel">
            <div className="affiliate-section-heading">
              <div>
                <h2>{t("Referral performance", "Referral performance")}</h2>
                <p>{t("See how your link turns visitors into customers.", "See how your link turns visitors into customers.")}</p>
              </div>
              <div className="affiliate-conversion"><strong>{conversionRate}%</strong><span>{t("click-to-customer", "click-to-customer")}</span></div>
            </div>
            <div className="affiliate-funnel">
              <div><span><Link2 size={18} /></span><strong>{overview.clickCount}</strong><small>{t("Link clicks", "Link clicks")}</small></div>
              <ArrowRight size={18} />
              <div><span><Users size={18} /></span><strong>{overview.signupCount}</strong><small>{t("Signups", "Signups")}</small></div>
              <ArrowRight size={18} />
              <div><span><TrendingUp size={18} /></span><strong>{overview.conversionCount}</strong><small>{t("Paying customers", "Paying customers")}</small></div>
            </div>
          </section>

          <section className="affiliate-panel affiliate-history-panel">
            <div className="affiliate-history-tabs" role="tablist" aria-label={t("Earnings details", "Earnings details")}>
              <button type="button" className={earningsTab === "commissions" ? "is-active" : ""} onClick={() => setEarningsTab("commissions")}>{t("Commissions", "Commissions")} <span>{commissions.length}</span></button>
              <button type="button" className={earningsTab === "referrals" ? "is-active" : ""} onClick={() => setEarningsTab("referrals")}>{t("Referrals", "Referrals")} <span>{referrals.length}</span></button>
              <button type="button" className={earningsTab === "payouts" ? "is-active" : ""} onClick={() => setEarningsTab("payouts")}>{t("Payouts", "Payouts")} <span>{payouts.length}</span></button>
            </div>

            {earningsTab === "commissions" ? (
              commissions.length === 0 ? <div className="affiliate-empty"><TrendingUp size={24} /><h3>{t("No commissions yet", "No commissions yet")}</h3><p>{t("Share your referral link to start earning.", "Share your referral link to start earning.")}</p></div> :
              <div className="affiliate-table-wrap"><table className="affiliate-table"><thead><tr><th>{t("Date", "Date")}</th><th>{t("Payment", "Payment")}</th><th>{t("Rate", "Rate")}</th><th>{t("Commission", "Commission")}</th><th>{t("Status", "Status")}</th><th>{t("Available on", "Available on")}</th></tr></thead><tbody>
                {commissions.map((commission) => <tr key={commission.id}><td>{formatDate(commission.createdUtc)}</td><td>{formatMoney(commission.baseAmount, commission.currency)}</td><td>{commission.ratePercent}%</td><td><strong>{formatMoney(commission.amount, commission.currency)}</strong></td><td><span className={statusClass(commission.status)}>{commission.status.replace(/_/g, " ")}</span></td><td>{commission.status === "pending" ? formatDate(commission.holdUntilUtc) : formatDate(commission.availableUtc)}</td></tr>)}
              </tbody></table></div>
            ) : null}

            {earningsTab === "referrals" ? (
              referrals.length === 0 ? <div className="affiliate-empty"><Users size={24} /><h3>{t("No referrals yet", "No referrals yet")}</h3><p>{t("Nobody has signed up with your link yet.", "Nobody has signed up with your link yet.")}</p></div> :
              <div className="affiliate-table-wrap"><table className="affiliate-table"><thead><tr><th>{t("Customer", "Customer")}</th><th>{t("Signed up", "Signed up")}</th><th>{t("First payment", "First payment")}</th><th>{t("Status", "Status")}</th></tr></thead><tbody>
                {referrals.map((referral) => <tr key={referral.id}><td className="affiliate-masked-email">{referral.maskedEmail}</td><td>{formatDate(referral.attributedUtc)}</td><td>{formatDate(referral.firstPaymentUtc)}</td><td><span className={statusClass(referral.status)}>{referral.status === "converted" ? t("Paying", "Paying") : referral.status}</span></td></tr>)}
              </tbody></table></div>
            ) : null}

            {earningsTab === "payouts" ? (
              payouts.length === 0 ? <div className="affiliate-empty"><Wallet size={24} /><h3>{t("No payouts yet", "No payouts yet")}</h3><p>{t("Your payout requests will appear here.", "Your payout requests will appear here.")}</p></div> :
              <div className="affiliate-table-wrap"><table className="affiliate-table"><thead><tr><th>{t("Date", "Date")}</th><th>{t("Type", "Type")}</th><th>{t("Amount", "Amount")}</th><th>{t("Method", "Method")}</th><th>{t("Status", "Status")}</th></tr></thead><tbody>
                {payouts.map((payout) => <tr key={payout.id}><td>{formatDate(payout.requestedUtc)}</td><td>{payout.kind === "account_credit" ? t("Account credit", "Account credit") : t("Cash", "Cash")}</td><td><strong>{formatMoney(payout.amount, payout.currency)}</strong></td><td>{payout.method || "—"}</td><td><span className={statusClass(payout.status)}>{payout.status.replace(/_/g, " ")}</span></td></tr>)}
              </tbody></table></div>
            ) : null}
          </section>

          <section id="affiliate-payout" className="affiliate-panel affiliate-payout-panel">
            <div className="affiliate-payout-heading">
              <div>
                <p>{t("AVAILABLE BALANCE", "AVAILABLE BALANCE")}</p>
                <h2>{formatMoney(overview.availableBalance, overview.currency)}</h2>
                <span>{t("Choose how you would like to use your earnings.", "Choose how you would like to use your earnings.")}</span>
              </div>
              <div className="affiliate-payout-progress">
                <div><span>{t("Cash payout minimum", "Cash payout minimum")}</span><strong>{formatMoney(overview.minPayoutAmount, overview.currency)}</strong></div>
                <progress max="100" value={payoutProgress} />
                <small>{canRequestCash ? t("You can request a cash payout now.", "You can request a cash payout now.") : t("Keep earning to unlock cash payouts.", "Keep earning to unlock cash payouts.")}</small>
              </div>
            </div>

            <div className="affiliate-payout-options">
              <article>
                <span className="affiliate-option-icon"><CreditCard size={21} /></span>
                <h3>{t("Use as account credit", "Use as account credit")}</h3>
                <p>{t("Apply earnings to your billing balance instantly for services and renewals.", "Apply earnings to your billing balance instantly for services and renewals.")}</p>
                <label className="field"><span>{t("Amount", "Amount")}</span><input inputMode="decimal" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="10.00" /></label>
                <MagneticButton className="affiliate-action-button" disabled={busy || !Number.parseFloat(creditAmount)} onClick={() => void submitPayout("account_credit")}>{t("Convert instantly", "Convert instantly")}</MagneticButton>
              </article>
              <article>
                <span className="affiliate-option-icon"><Banknote size={21} /></span>
                <h3>{t("Request cash payout", "Request cash payout")}</h3>
                <p>{t("Withdraw your available balance using your preferred payout method.", "Withdraw your available balance using your preferred payout method.")}</p>
                <div className="affiliate-payout-form-row">
                  <label className="field"><span>{t("Amount", "Amount")}</span><input inputMode="decimal" value={cashAmount} onChange={(event) => setCashAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder={overview.minPayoutAmount.toFixed(2)} /></label>
                  <label className="field"><span>{t("Method", "Method")}</span><select value={cashMethod} onChange={(event) => setCashMethod(event.target.value)}><option value="paypal">PayPal</option><option value="alipay">{t("Alipay", "Alipay")}</option><option value="bank">{t("Bank transfer", "Bank transfer")}</option></select></label>
                </div>
                <label className="field"><span>{t("Payout account details", "Payout account details")}</span><textarea rows={2} value={cashDetails} onChange={(event) => setCashDetails(event.target.value)} placeholder={t("PayPal email / Alipay account / bank details", "PayPal email / Alipay account / bank details")} /></label>
                <MagneticButton className="affiliate-action-button" disabled={busy || !canRequestCash || !Number.parseFloat(cashAmount) || cashDetails.trim().length === 0} onClick={() => void submitPayout("cash")}>{t("Request payout", "Request payout")}</MagneticButton>
              </article>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
