import { Globe, Plus, Server, Activity, CalendarClock, AlertTriangle, ArrowUpCircle, Database, RefreshCw, Wallet, CreditCard, ArrowUpDown, ChevronRight } from "lucide-react";
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
import { getActiveLocale, useLocalization } from "../lib/i18n";
import { Badge, EmptyState, Button, Modal } from "../components";
import { createVpsRenewalCheckout, getVpsServices, type VpsService } from "../lib/api-vps";

type DashboardState = {
  subs: HostingSubscription[];
  vps: VpsService[];
  billing: BillingSubscriptionView[];
  summary: BillingSummary | null;
};

type DashboardResource =
  | { kind: "hosting"; name: string; renewUtc?: string | null; service: HostingSubscription }
  | { kind: "vps"; name: string; renewUtc?: string | null; service: VpsService };

function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(getActiveLocale(), { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(getActiveLocale(), { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function badgeTone(status: string): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "grace_period":
    case "past_due":
    case "draft":
    case "checkout_pending":
    case "pending_purchase":
    case "provisioning":
    case "renewal_due":
    case "renewal_paid":
      return "warning";
    case "suspended":
    case "canceled":
      return "danger";
    default:
      return "default";
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function DashboardPage() {
  const { t } = useLocalization();
  const [state, setState] = useState<DashboardState>({ subs: [], vps: [], billing: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "renewal-asc" | "renewal-desc">("name-asc");
  const [confirmRenew, setConfirmRenew] = useState<{ sub: HostingSubscription; billing: BillingSubscriptionView | undefined } | null>(null);
  const navigate = useNavigate();

  async function reload() {
    const session = getCustomerSession();
    if (!session) return;
    const [subs, vps, billing, summary] = await Promise.all([
      getCustomerSubscriptions(session),
      getVpsServices(session).catch(() => [] as VpsService[]),
      getBillingSubscriptions(session).catch(() => [] as BillingSubscriptionView[]),
      getBillingSummary(session).catch(() => null),
    ]);
    setState({ subs, vps, billing, summary });
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

  async function handleVpsRenew(service: VpsService) {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey(`vps-renew-${service.id}`);
    setError(null);
    try {
      const result = await createVpsRenewalCheckout(session, service.id);
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else if (result.success) { await reload(); window.dispatchEvent(new Event("balance-changed")); }
      else setError(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not renew VPS.");
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
        const [subs, vps, billing, summary] = await Promise.all([
          getCustomerSubscriptions(activeSession),
          getVpsServices(activeSession).catch(() => [] as VpsService[]),
          getBillingSubscriptions(activeSession).catch(() => [] as BillingSubscriptionView[]),
          getBillingSummary(activeSession).catch(() => null),
        ]);
        if (!active) return;
        setState({ subs, vps, billing, summary });
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

  const dashboardResources = useMemo<DashboardResource[]>(() => {
    const resources: DashboardResource[] = [
      ...visibleSubs.map((service) => {
        const billing = billingByScope.get(service.id.toLowerCase());
        return { kind: "hosting" as const, name: service.name, renewUtc: billing?.nextInvoiceAtUtc ?? billing?.currentPeriodEndUtc, service };
      }),
      ...state.vps
        .filter((service) => service.status !== "canceled")
        .map((service) => ({ kind: "vps" as const, name: service.hostingLoginId, renewUtc: service.expiresUtc, service })),
    ];

    return resources.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, undefined, { numeric: true });
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, undefined, { numeric: true });
      const aTime = a.renewUtc ? new Date(a.renewUtc).getTime() : Infinity;
      const bTime = b.renewUtc ? new Date(b.renewUtc).getTime() : Infinity;
      return sortBy === "renewal-asc" ? aTime - bTime : bTime - aTime;
    });
  }, [visibleSubs, state.vps, billingByScope, sortBy]);

  const currency = state.summary?.currency ?? "USD";

  const stats = useMemo(() => {
    const summary = state.summary;

    return [
      { label: t("Subscriptions", "Subscriptions"), value: String(dashboardResources.length), detail: t("Hosting and VPS", "Hosting and VPS"), icon: <Server size={18} /> },
      { label: t("Account Balance", "Account Balance"), value: summary ? formatCurrency(summary.creditBalance, currency) : "—", detail: t("Prepaid balance", "Prepaid balance"), icon: <Wallet size={18} />, actionLabel: t("Top up", "Top up"), actionTo: "/topup" },
      { label: t("Monthly Cost", "Monthly Cost"), value: summary ? formatCurrency(summary.totalMonthlyRecurring, currency) : "—", detail: t("Recurring total", "Recurring total"), icon: <CreditCard size={18} /> },
    ];
  }, [dashboardResources, state.summary, currency, t]);

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
            <div className="stat-card__header">
              <div>
                <p className="stat-card__label">{stat.label}</p>
                <h2 className="stat-card__value">{stat.value}</h2>
              </div>
              <div className="stat-card__icon-box">
                {stat.icon}
              </div>
            </div>
            <div className="stat-card__footer">
              <p className="muted" style={{ margin: 0 }}>{stat.detail}</p>
              {stat.actionLabel && stat.actionTo ? (
                <Link to={stat.actionTo} className="stat-card__action">+ {stat.actionLabel}</Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="stack-sm">
        <div className="section-head">
          <div>
            <h3 className="sub-section__title">{t("Your Subscriptions", "Your Subscriptions")}</h3>
            <p className="muted sub-section__desc">{t("Select a subscription plan to manage its assigned websites and resources.", "Select a subscription plan to manage its assigned websites and resources.")}</p>
          </div>
          <label className="sub-sort">
            <ArrowUpDown size={14} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="name-asc">{t("Name A → Z", "Name A → Z")}</option>
              <option value="name-desc">{t("Name Z → A", "Name Z → A")}</option>
              <option value="renewal-asc">{t("Renewal (Soonest)", "Renewal (Soonest)")}</option>
              <option value="renewal-desc">{t("Renewal (Latest)", "Renewal (Latest)")}</option>
            </select>
          </label>
        </div>

        {loading && dashboardResources.length === 0 ? <div className="empty-panel">{t("Loading subscriptions...", "Loading subscriptions...")}</div> : null}

        {!loading && dashboardResources.length === 0 ? (
          <EmptyState
            title={t("No subscriptions yet", "No subscriptions yet")}
            description={t("Choose a hosting plan to get your first site online.", "Choose a hosting plan to get your first site online.")}
            action={
              <Link className="primary-button" to="/buy">
                <Plus size={18} />
                <span>{t("Buy Hosting Subscription", "Buy Hosting Subscription")}</span>
              </Link>
            }
          />
        ) : null}

        {dashboardResources.length > 0 ? (
          <div className="two-up-grid">
            {dashboardResources.map((resource) => {
              if (resource.kind === "vps") {
                const service = resource.service;
                const days = daysUntil(service.expiresUtc);
                const renewTone = days === null ? "muted" : days < 0 ? "dashboard-renew--danger" : days <= 7 ? "dashboard-renew--warn" : "muted";
                return (
                  <div key={`vps-${service.id}`} className="card project-card" onClick={() => navigate(`/vps/${service.id}`)}>
                    <div className="project-card__header">
                      <div className="project-card__identity">
                        <div className="project-card__icon"><Server size={20} /></div>
                        <div>
                          <h3 className="project-card__name">{service.hostingLoginId}</h3>
                          <p className="muted project-card__plan">{service.productName} · VPS</p>
                        </div>
                      </div>
                      <Badge tone={badgeTone(service.status)}>{statusLabel(service.status)}</Badge>
                    </div>
                    <div className={`dashboard-renew ${renewTone}`}>
                      <CalendarClock size={14} />
                      <span>{service.expiresUtc ? `${t("Next Renewal", "Next Renewal")}: ${formatDate(service.expiresUtc)}` : t("Provisioning in progress", "Provisioning in progress")}</span>
                    </div>
                    <div className="project-card__meta">
                      <span className="project-card__meta-item"><Globe size={14} /> {formatRegionLabel(service.region)}</span>
                      <span className="project-card__meta-item"><Activity size={14} /> {service.ipAddress || t("Pending assignment", "Pending assignment")}</span>
                      <span className="project-card__meta-item"><Database size={14} /> {service.operatingSystem || t("Operating system pending", "Operating system pending")}</span>
                    </div>
                    {!(["pending_purchase", "provisioning", "renewal_paid", "canceled"].includes(service.status)) ? (
                      <div className="dashboard-sub-actions" onClick={(event) => event.stopPropagation()}>
                        <button className="dashboard-sub-action" type="button" disabled={busyKey === `vps-renew-${service.id}`} onClick={() => void handleVpsRenew(service)}>
                          <RefreshCw size={14} /> {busyKey === `vps-renew-${service.id}` ? t("Processing...", "Processing...") : t("Renew", "Renew")}
                        </button>
                        <Link className="dashboard-sub-action dashboard-sub-action--primary" to={`/vps?upgrade=${encodeURIComponent(service.id)}`}>
                          <ArrowUpCircle size={14} /> {t("Upgrade", "Upgrade")}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              }
              const sub = resource.service;
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
                  onClick={() => navigate(`/subscription/${sub.id}/overview`)}
                >
                  <div className="project-card__header">
                    <div className="project-card__identity">
                      <div className="project-card__icon">
                        <Server size={20} />
                      </div>
                      <div>
                        <h3 className="project-card__name">{sub.name}</h3>
                        <p className="muted project-card__plan">{sub.planSlug.toUpperCase()} {t("Plan", "Plan")}</p>
                      </div>
                    </div>
                    <Badge tone={badgeTone(effectiveStatus)}>{statusLabel(effectiveStatus)}</Badge>
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

                    </div>
                  )}

                  <div className="project-card__meta">
                    <span className="project-card__meta-item"><Globe size={14} /> {formatRegionLabel(sub.regionSlug)}</span>
                    <span className="project-card__meta-item"><Activity size={14} /> {sub.usedSites} / {sub.siteQuota} {t("Sites", "Sites")}</span>
                    <span className="project-card__meta-item"><Database size={14} /> {sub.usedDatabases} / {sub.databaseQuota} {t("Databases", "Databases")}</span>
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

      <Modal
        open={confirmRenew !== null}
        onClose={() => setConfirmRenew(null)}
        title={t("Ready to renew! 🚀", "Ready to renew! 🚀")}
        subtitle={t("Your subscription will be extended by 1 month.", "Your subscription will be extended by 1 month.")}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setConfirmRenew(null)}>
              {t("Cancel", "Cancel")}
            </button>
            <button
              className="primary-button"
              type="button"
              style={{ flex: 1 }}
              disabled={busyKey === `renew-${confirmRenew?.sub.id}`}
              onClick={() => {
                const sub = confirmRenew!.sub;
                setConfirmRenew(null);
                void handleRenew(sub);
              }}
            >
              {t("Yes, renew now", "Yes, renew now")} <ChevronRight size={18} />
            </button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
            {confirmRenew?.billing ? formatCurrency(confirmRenew.billing.monthlyAmount, confirmRenew.billing.currency) : ""}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {confirmRenew?.sub.name ?? ""}
          </div>
        </div>
      </Modal>
    </div>
  );
}
