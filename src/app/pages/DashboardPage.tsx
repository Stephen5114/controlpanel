import { Globe, Plus, Server, Activity, CalendarClock, AlertTriangle, ArrowUpCircle, Database, RefreshCw, Wallet, CreditCard, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cancelBillingSubscription,
  createHostingSubscriptionCheckout,
  getBillingSubscriptions,
  getBillingSummary,
  getCustomerSubscriptions,
  type BillingSubscriptionView,
  type BillingSummary,
  type HostingSubscription,
} from "../lib/customer-api";
import { formatRegionLabel } from "../lib/display";
import { getCustomerSession } from "../lib/customer-session";
import { useLocalization } from "../lib/i18n";

type DashboardState = {
  subs: HostingSubscription[];
  billing: BillingSubscriptionView[];
  summary: BillingSummary | null;
};

function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "badge--success";
    case "grace_period":
    case "past_due":
    case "draft":
    case "checkout_pending":
      return "badge--warning";
    case "suspended":
    case "canceled":
      return "badge--danger";
    default:
      return "";
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function DashboardPage() {
  const { t } = useLocalization();
  const [state, setState] = useState<DashboardState>({ subs: [], billing: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "renewal-asc" | "renewal-desc">("name-asc");
  const [confirmRenew, setConfirmRenew] = useState<{ sub: HostingSubscription; billing: BillingSubscriptionView | undefined } | null>(null);
  const navigate = useNavigate();

  async function reload() {
    const session = getCustomerSession();
    if (!session) return;
    const [subs, billing, summary] = await Promise.all([
      getCustomerSubscriptions(session),
      getBillingSubscriptions(session).catch(() => [] as BillingSubscriptionView[]),
      getBillingSummary(session).catch(() => null),
    ]);
    setState({ subs, billing, summary });
  }

  async function handleRenew(sub: HostingSubscription) {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey(`renew-${sub.id}`);
    setError(null);
    try {
      const result = await createHostingSubscriptionCheckout(session, {
        planSlug: sub.planSlug,
        regionSlug: sub.regionSlug,
        existingSubscriptionId: sub.id,
      });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      // Balance payment succeeded — refresh dashboard and notify layout to update balance.
      await reload();
      window.dispatchEvent(new Event("balance-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not renew subscription.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCompletePending(sub: HostingSubscription) {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey(`complete-${sub.id}`);
    setError(null);
    try {
      const result = await createHostingSubscriptionCheckout(session, { planSlug: sub.planSlug, regionSlug: sub.regionSlug, existingSubscriptionId: sub.id });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not start payment.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCancelPending(billingId: string, key: string) {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey(`cancel-${key}`);
    setError(null);
    try {
      await cancelBillingSubscription(session, billingId);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not cancel.");
    } finally {
      setBusyKey(null);
    }
  }

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) return;
    const activeSession = session;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [subs, billing, summary] = await Promise.all([
          getCustomerSubscriptions(activeSession),
          getBillingSubscriptions(activeSession).catch(() => [] as BillingSubscriptionView[]),
          getBillingSummary(activeSession).catch(() => null),
        ]);
        if (!active) return;
        setState({ subs, billing, summary });
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Cannot connect to backend.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const billingByScope = useMemo(() => {
    const map = new Map<string, BillingSubscriptionView>();
    for (const item of state.billing) {
      map.set(item.scopeReference.toLowerCase(), item);
    }
    return map;
  }, [state.billing]);

  // Canceled subscriptions are not manageable — keep them off the dashboard.
  const visibleSubs = useMemo(() => {
    const filtered = state.subs.filter((sub) => billingByScope.get(sub.id.toLowerCase())?.status !== "canceled");
    return [...filtered].sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      const getTime = (sub: typeof a) => {
        const billing = billingByScope.get(sub.id.toLowerCase());
        const dateStr = billing?.nextInvoiceAtUtc ?? billing?.currentPeriodEndUtc;
        return dateStr ? new Date(dateStr).getTime() : Infinity;
      };
      return sortBy === "renewal-asc" ? getTime(a) - getTime(b) : getTime(b) - getTime(a);
    });
  }, [state.subs, billingByScope, sortBy]);

  const currency = state.summary?.currency ?? "USD";

  const stats = useMemo(() => {
    const summary = state.summary;

    return [
      { label: t("Subscriptions", "Subscriptions"), value: String(visibleSubs.length), detail: t("Hosting plans", "Hosting plans"), icon: <Server size={18} /> },
      { label: t("Account Balance", "Account Balance"), value: summary ? formatCurrency(summary.creditBalance, currency) : "—", detail: t("Prepaid balance", "Prepaid balance"), icon: <Wallet size={18} />, actionLabel: t("Top up", "Top up"), actionTo: "/topup" },
      { label: t("Monthly Cost", "Monthly Cost"), value: summary ? formatCurrency(summary.totalMonthlyRecurring, currency) : "—", detail: t("Recurring total", "Recurring total"), icon: <CreditCard size={18} /> },
    ];
  }, [visibleSubs, state.summary, currency, t]);

  // Subscriptions needing attention: past due, suspended, grace period, cancelling, or renewing within 7 days.
  const attention = useMemo(() => {
    const items: string[] = [];
    for (const sub of visibleSubs) {
      const billing = billingByScope.get(sub.id.toLowerCase());
      if (!billing) continue;
      const days = daysUntil(billing.nextInvoiceAtUtc ?? billing.currentPeriodEndUtc);
      if (billing.status === "past_due" || billing.status === "suspended") {
        items.push(`${sub.name} is ${statusLabel(billing.status)}`);
      } else if (billing.status === "grace_period") {
        items.push(`${sub.name} is in its grace period`);
      } else if (billing.cancelAtPeriodEnd) {
        items.push(`${sub.name} will cancel at period end`);
      } else if (billing.status === "draft" || billing.status === "checkout_pending") {
        items.push(`${sub.name} has an unfinished purchase awaiting payment`);
      } else if (days !== null && days <= 7) {
        items.push(days < 0 ? `${sub.name} renewal is overdue` : `${sub.name} renews in ${days} day${days === 1 ? "" : "s"}`);
      }
    }
    const openInvoices = state.summary?.openInvoiceCount ?? 0;
    if (openInvoices > 0) {
      items.push(`${openInvoices} open invoice${openInvoices === 1 ? "" : "s"} awaiting payment`);
    }
    return items;
  }, [visibleSubs, state.summary, billingByScope]);

  return (
    <div className="stack">
      <section className="page-hero page-hero--inline">
        <div>
          <p className="eyebrow">{t("Overview", "Overview")}</p>
          <h1>{t("Dashboard", "Dashboard")}</h1>
        </div>
        <Link className="primary-button" to="/buy">
          <Plus size={18} />
          <span>{t("New Subscription", "New Subscription")}</span>
        </Link>
      </section>

      {error ? <div className="inline-message inline-message--error">{error}</div> : null}

      {attention.length > 0 ? (
        <div className="dashboard-alert">
          <div className="dashboard-alert__icon"><AlertTriangle size={18} /></div>
          <div className="dashboard-alert__body">
            <strong>{t("Action needed", "Action needed")}</strong>
            <ul>
              {attention.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <Link className="primary-button" to="/billing">{t("Go to billing", "Go to billing")}</Link>
        </div>
      ) : null}

      <section className="stat-grid">
        {stats.map((stat) => (
          <article className="card stat-card" key={stat.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="label" style={{ margin: 0, fontSize: "0.85rem", fontWeight: "500" }}>{stat.label}</p>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", margin: "6px 0 2px", letterSpacing: "-0.02em" }}>{stat.value}</h2>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--background-muted, #f1f5f9)",
                color: "var(--primary-ink, #0f172a)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>{stat.detail}</p>
              {stat.actionLabel && stat.actionTo ? (
                <Link to={stat.actionTo} className="text-button" style={{ fontSize: "0.8rem", fontWeight: 600, padding: "4px 10px", borderRadius: "8px", background: "var(--primary-soft)", color: "var(--primary)", textDecoration: "none" }}>
                  + {stat.actionLabel}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="stack-sm">
        <div className="section-head">
          <div>
            <h3 style={{ margin: 0 }}>{t("Your Subscriptions", "Your Subscriptions")}</h3>
            <p className="muted" style={{ margin: 0 }}>{t("Select a subscription plan to manage its assigned websites and resources.", "Select a subscription plan to manage its assigned websites and resources.")}</p>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
            <ArrowUpDown size={14} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{ minHeight: "auto", height: "34px", padding: "0 10px", fontSize: "0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}
            >
              <option value="name-asc">{t("Name A → Z", "Name A → Z")}</option>
              <option value="name-desc">{t("Name Z → A", "Name Z → A")}</option>
              <option value="renewal-asc">{t("Renewal (Soonest)", "Renewal (Soonest)")}</option>
              <option value="renewal-desc">{t("Renewal (Latest)", "Renewal (Latest)")}</option>
            </select>
          </label>
        </div>

        {loading && visibleSubs.length === 0 ? <div className="empty-panel">{t("Loading subscriptions...", "Loading subscriptions...")}</div> : null}

        {!loading && visibleSubs.length === 0 ? (
          <div className="empty-state">
            <div style={{ padding: "40px", background: "white", borderRadius: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
              <h2>{t("No subscriptions yet", "No subscriptions yet")}</h2>
              <p className="muted" style={{ marginBottom: "24px" }}>{t("Start your journey by purchasing a new hosting plan infrastructure.", "Start your journey by purchasing a new hosting plan infrastructure.")}</p>
              <Link className="primary-button" to="/buy">
                <Plus size={18} />
                <span>{t("Buy Hosting Subscription", "Buy Hosting Subscription")}</span>
              </Link>
            </div>
          </div>
        ) : null}

        {visibleSubs.length > 0 ? (
          <div className="two-up-grid">
            {visibleSubs.map((sub) => {
              const billing = billingByScope.get(sub.id.toLowerCase());
              const effectiveStatus = (billing?.status ?? sub.status).toLowerCase();
              const isPending = effectiveStatus === "draft" || effectiveStatus === "checkout_pending";
              
              const getFallbackRenewal = (starts: string | null | undefined) => {
                if (!starts) return null;
                const start = new Date(starts);
                if (Number.isNaN(start.getTime())) return null;
                const next = new Date(start);
                const now = new Date();
                while (next <= now) {
                  next.setMonth(next.getMonth() + 1);
                }
                return next.toISOString();
              };

              let renewUtc = billing?.nextInvoiceAtUtc ?? billing?.currentPeriodEndUtc ?? null;
              if (!renewUtc && effectiveStatus === "active" && billing?.startsUtc) {
                renewUtc = getFallbackRenewal(billing.startsUtc);
              }

              const days = daysUntil(renewUtc);
              const renewTone =
                days === null ? "muted" : days < 0 ? "dashboard-renew--danger" : days <= 7 ? "dashboard-renew--warn" : "muted";
              return (
                <div
                  key={sub.id}
                  className="card project-card"
                  style={{ cursor: "pointer", transition: "transform 200ms, box-shadow 200ms" }}
                  onClick={() => navigate(`/subscription/${sub.id}/overview`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 32px 64px rgba(43, 73, 125, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem" }}>
                        <Server size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{sub.name}</h3>
                        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{sub.planSlug.toUpperCase()} {t("Plan", "Plan")}</p>
                      </div>
                    </div>
                    <span className={`badge ${statusBadgeClass(effectiveStatus)}`}>{statusLabel(effectiveStatus)}</span>
                  </div>

                  {isPending ? (
                    <div className="dashboard-pending" onClick={(e) => e.stopPropagation()}>
                      <div className="dashboard-pending__note">
                        <CalendarClock size={14} /> {t("Payment not completed — this plan isn't active yet.", "Payment not completed — this plan isn't active yet.")}
                        {billing ? <span className="dashboard-renew__amount">{formatCurrency(billing.monthlyAmount, billing.currency)}/mo</span> : null}
                      </div>
                      <div className="dashboard-pending__actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleCompletePending(sub)}
                          disabled={busyKey === `complete-${sub.id}`}
                        >
                          {busyKey === `complete-${sub.id}` ? t("Opening...", "Opening...") : t("Complete payment", "Complete payment")}
                        </button>
                        {billing ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleCancelPending(billing.id, sub.id)}
                            disabled={busyKey === `cancel-${sub.id}`}
                          >
                            {busyKey === `cancel-${sub.id}` ? t("Discarding...", "Discarding...") : t("Discard", "Discard")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className={`dashboard-renew ${renewTone}`}>
                      <CalendarClock size={14} />
                      {billing?.cancelAtPeriodEnd ? (
                        <span>{t("Cancels", "Cancels")} {formatDate(renewUtc)}</span>
                      ) : renewUtc ? (
                        <span>
                          {t("Next Renewal", "Next Renewal")}: {formatDate(renewUtc)}
                          {days !== null ? ` · ${days < 0 ? t("overdue", "overdue") : days === 0 ? t("today", "today") : days === 1 ? t("in 1 day", "in 1 day") : t("in days", `in ${days} days`).replace("{days}", String(days))}` : ""}
                        </span>
                      ) : (
                        <span>{t("No scheduled renewal", "No scheduled renewal")}</span>
                      )}
                      {billing ? <span className="dashboard-renew__amount">{formatCurrency(billing.monthlyAmount, billing.currency)}/mo</span> : null}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "16px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", fontSize: "0.85rem", color: "var(--muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Globe size={14} /> {formatRegionLabel(sub.regionSlug)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Activity size={14} /> {sub.usedSites} / {sub.siteQuota} {t("Sites", "Sites")}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Database size={14} /> {sub.usedDatabases} / {sub.databaseQuota} {t("Databases", "Databases")}</span>
                  </div>

                  {!isPending ? (
                    <div className="dashboard-sub-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="dashboard-sub-action"
                        disabled={busyKey === `renew-${sub.id}`}
                        onClick={() => setConfirmRenew({ sub, billing })}
                      >
                        <RefreshCw size={14} /> {busyKey === `renew-${sub.id}` ? t("Processing...", "Processing...") : `${t("Renew", "Renew")} ${formatCurrency(billing?.monthlyAmount ?? 0, billing?.currency ?? "USD")}`}
                      </button>
                      <Link to={`/buy?upgrade=${encodeURIComponent(sub.id)}`} className="dashboard-sub-action dashboard-sub-action--primary">
                        <ArrowUpCircle size={14} /> {t("Upgrade", "Upgrade")}
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {confirmRenew ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setConfirmRenew(null)}
        >
          <div
            style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>{t("Confirm Renewal", "Confirm Renewal")}</h3>
            <p style={{ margin: "0 0 24px", color: "var(--muted)", fontSize: "0.95rem" }}>
              {t("Renew", "Renew")} <strong>{confirmRenew.sub.name}</strong>
              {confirmRenew.billing ? ` · ${formatCurrency(confirmRenew.billing.monthlyAmount, confirmRenew.billing.currency)}/mo` : ""}?
              {" "}{t("Your next renewal date will be extended by 1 month.", "Your next renewal date will be extended by 1 month.")}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" className="secondary-button" onClick={() => setConfirmRenew(null)}>
                {t("Cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={busyKey === `renew-${confirmRenew.sub.id}`}
                onClick={() => {
                  const sub = confirmRenew.sub;
                  setConfirmRenew(null);
                  void handleRenew(sub);
                }}
              >
                <RefreshCw size={14} style={{ marginRight: "6px" }} />
                {t("Confirm Renewal", "Confirm Renewal")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
