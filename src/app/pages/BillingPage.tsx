import "../../styles/billing.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, DollarSign, Receipt, RefreshCw, ShieldCheck, ShoppingCart, Wallet, AlertTriangle } from "lucide-react";
import {
  checkoutBillingInvoice,
  createAccountTopup,
  createBillingPaymentMethodSetup,
  deleteBillingPaymentMethod,
  getBillingOverview,
  type BillingInvoiceView,
  type BillingOverview,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { useLocalization } from "../lib/i18n";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined, t?: (key: string, def: string) => string) {
  const notScheduled = t?.("Not scheduled", "Not scheduled") ?? "Not scheduled";
  const unknown = t?.("Unknown", "Unknown") ?? "Unknown";
  if (!value) return notScheduled;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unknown;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function statusTone(status: string) {
  switch (status) {
    case "paid":
    case "active":
    case "succeeded":
      return "badge--success";
    case "grace_period":
    case "past_due":
    case "partially_paid":
      return "badge--warning";
    case "failed":
    case "void":
    case "refunded":
    case "suspended":
    case "canceled":
    case "cancelled":
      return "badge--danger";
    default:
      return "";
  }
}

export function BillingPage() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newSubscriptionScope, setNewSubscriptionScope] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState("25");
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "ledger">("overview");

  const outstandingInvoices = useMemo(
    () => overview?.invoices.filter((invoice) => invoice.status === "open" || invoice.status === "partially_paid") ?? [],
    [overview],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setMessage(t("Payment completed. Your subscription is now being activated.", "Payment completed. Your subscription is now being activated."));
      const pendingScope = sessionStorage.getItem("pendingSubscriptionScope") || params.get("scope");
      if (pendingScope) {
        sessionStorage.removeItem("pendingSubscriptionScope");
        setNewSubscriptionScope(pendingScope);
      }
    } else if (params.get("checkout") === "cancel") {
      setMessage(t("Checkout was canceled.", "Checkout was canceled."));
    } else if (params.get("paymentMethod") === "success") {
      setMessage(t("Payment method saved.", "Payment method saved."));
    } else if (params.get("paymentMethod") === "cancel") {
      setMessage(t("Payment method setup was canceled.", "Payment method setup was canceled."));
    } else if (params.get("topup") === "success") {
      setMessage(t("Top-up received. Your account credit is updating.", "Top-up received. Your account credit is updating."));
      window.dispatchEvent(new Event("balance-changed"));
    } else if (params.get("topup") === "cancel") {
      setMessage(t("Top-up was canceled.", "Top-up was canceled."));
    }
  }, []);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) {
      setError(t("Your session expired. Please sign in again.", "Your session expired. Please sign in again."));
      setLoading(false);
      return;
    }
    const activeSession = session;

    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const billing = await getBillingOverview(activeSession);
        if (!active) return;
        setOverview(billing);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : t("Failed to load billing.", "Failed to load billing."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey("refresh");
    try {
      setOverview(await getBillingOverview(session));
      setMessage(t("Billing data refreshed.", "Billing data refreshed."));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : t("Refresh failed.", "Refresh failed."));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSetupPaymentMethod() {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey("setup-payment-method");
    setError(null);
    try {
      const result = await createBillingPaymentMethodSetup(session);
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setMessage(result.message);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : t("Could not start payment-method setup.", "Could not start payment-method setup."));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTopup() {
    const session = getCustomerSession();
    if (!session) return;
    const amount = Number.parseFloat(topupAmount);
    if (!Number.isFinite(amount) || amount < 0.5) {
      setError(t("Enter a top-up amount of at least 0.50.", "Enter a top-up amount of at least 0.50."));
      return;
    }
    setBusyKey("topup");
    setError(null);
    try {
      const result = await createAccountTopup(session, { amount });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setMessage(result.message);
      window.dispatchEvent(new Event("balance-changed"));
    } catch (topupError) {
      setError(topupError instanceof Error ? topupError.message : t("Could not start top-up.", "Could not start top-up."));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleInvoiceCheckout(invoice: BillingInvoiceView) {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey(`invoice-${invoice.id}`);
    setError(null);
    try {
      const result = await checkoutBillingInvoice(session, invoice.id);
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setMessage(result.message);
      window.dispatchEvent(new Event("balance-changed"));
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : t("Could not open invoice checkout.", "Could not open invoice checkout."));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeletePaymentMethod(paymentMethodId: string) {
    const session = getCustomerSession();
    if (!session) return;
    setBusyKey(`payment-method-${paymentMethodId}`);
    setError(null);
    try {
      const result = await deleteBillingPaymentMethod(session, paymentMethodId);
      setMessage(result.message);
      setOverview(await getBillingOverview(session));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("Could not remove payment method.", "Could not remove payment method."));
    } finally {
      setBusyKey(null);
    }
  }

  function getStatusLabel(status: string) {
    if (status === "paid") return t("Paid", "Paid");
    if (status === "open") return t("Open", "Open");
    if (status === "active") return t("Active", "Active");
    if (status === "succeeded") return t("Succeeded", "Succeeded");
    if (status === "grace_period") return t("Grace Period", "Grace Period");
    if (status === "past_due") return t("Past Due", "Past Due");
    if (status === "partially_paid") return t("Partially Paid", "Partially Paid");
    if (status === "failed") return t("Failed", "Failed");
    if (status === "void") return t("Void", "Void");
    if (status === "refunded") return t("Refunded", "Refunded");
    if (status === "suspended") return t("Suspended", "Suspended");
    if (status === "canceled") return t("Canceled", "Canceled");
    return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return (
    <div className="stack">
      <section className="page-hero page-hero--inline">
        <div>
          <p className="eyebrow">{t("Billing", "Billing")}</p>
          <h1>{t("Payments, invoices, and renewals", "Payments, invoices, and renewals")}</h1>
          <p className="page-copy">{t("Track outstanding balances, subscriptions, payment methods, and your full finance history in one place.", "Track outstanding balances, subscriptions, payment methods, and your full finance history in one place.")}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void refresh()} disabled={busyKey === "refresh"}>
          <RefreshCw size={16} />
          {busyKey === "refresh" ? t("Refreshing...", "Refreshing...") : t("Refresh", "Refresh")}
        </button>
      </section>

      {error ? <div className="inline-message inline-message--error">{error}</div> : null}
      {message ? <div className="inline-message">{message}</div> : null}
      {newSubscriptionScope ? (
        <div className="inline-message" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span>{t("Your new subscription is ready.", "Your new subscription is ready.")}</span>
          <button
            type="button"
            className="primary-button"
            style={{ whiteSpace: "nowrap" }}
            onClick={() => navigate(`/subscription/${newSubscriptionScope}/overview`)}
          >
            {t("View Subscription", "View Subscription")} <ArrowRight size={14} style={{ marginLeft: "4px" }} />
          </button>
        </div>
      ) : null}

      {loading || !overview ? (
        <div className="empty-panel">{t("Loading billing center...", "Loading billing center...")}</div>
      ) : (
        <>
          <section className="billing-metrics">
            <MetricCard icon={<DollarSign size={18} />} label={t("Open balance", "Open balance")} value={formatCurrency(overview.summary.openBalance, overview.summary.currency)} note={t("{count} invoice(s) due", "{count} invoice(s) due").replace("{count}", String(overview.summary.openInvoiceCount))} />
            <MetricCard icon={<ShieldCheck size={18} />} label={t("Account balance", "Account balance")} value={formatCurrency(overview.summary.creditBalance, overview.summary.currency)} note={t("Available account credit", "Available account credit")} />
            <MetricCard icon={<CreditCard size={18} />} label={t("Saved payment methods", "Saved payment methods")} value={String(overview.summary.savedPaymentMethodCount)} note={t("Saved for checkout & renewals", "Saved for checkout & renewals")} />
            <MetricCard icon={<Receipt size={18} />} label={t("Monthly recurring", "Monthly recurring")} value={formatCurrency(overview.summary.totalMonthlyRecurring, overview.summary.currency)} note={overview.summary.nextRenewalUtc ? t("Next renewal {date}", "Next renewal {date}").replace("{date}", formatDate(overview.summary.nextRenewalUtc, t)) : t("Renewal schedule not confirmed yet", "Renewal schedule not confirmed yet")} />
          </section>

          <div className="billing-tabs">
            <button 
              className={`billing-tab-button ${activeTab === "overview" ? "active" : ""}`} 
              type="button" 
              onClick={() => setActiveTab("overview")}
            >
              <CreditCard size={16} />
              <span>{t("Overview & Subscriptions", "Overview & Subscriptions")}</span>
            </button>
            <button 
              className={`billing-tab-button ${activeTab === "invoices" ? "active" : ""}`} 
              type="button" 
              onClick={() => setActiveTab("invoices")}
            >
              <Receipt size={16} />
              <span>{t("Invoices", "Invoices")}</span>
              {outstandingInvoices.length > 0 ? (
                <span className="badge badge--warning" style={{ marginLeft: "4px", fontSize: "0.75rem", padding: "2px 6px" }}>
                  {t("{count} due", "{count} due").replace("{count}", String(outstandingInvoices.length))}
                </span>
              ) : null}
            </button>
            <button 
              className={`billing-tab-button ${activeTab === "ledger" ? "active" : ""}`} 
              type="button" 
              onClick={() => setActiveTab("ledger")}
            >
              <DollarSign size={16} />
              <span>{t("Transactions & Ledger", "Transactions & Ledger")}</span>
            </button>
          </div>

          {outstandingInvoices.length > 0 && activeTab !== "invoices" ? (
            <div className="dashboard-alert" style={{ marginBottom: "20px" }}>
              <div className="dashboard-alert__icon"><AlertTriangle size={18} /></div>
              <div className="dashboard-alert__body">
                <strong style={{ display: "block", marginBottom: "4px" }}>{t("Invoices Awaiting Payment", "Invoices Awaiting Payment")}</strong>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {t("You have {count} unpaid invoice(s) totaling {amount}.", "You have {count} unpaid invoice(s) totaling {amount}.").replace("{count}", String(outstandingInvoices.length)).replace("{amount}", formatCurrency(outstandingInvoices.reduce((acc, inv) => acc + inv.amountDue, 0), overview.summary.currency))}
                </p>
              </div>
              <button className="primary-button" type="button" onClick={() => setActiveTab("invoices")}>
                {t("View Invoices", "View Invoices")} <ArrowRight size={16} style={{ marginLeft: "6px" }} />
              </button>
            </div>
          ) : null}

          {activeTab === "overview" && (
            <div className="billing-layout">
              <div className="billing-main">
                <article className="card stack-sm">
                  <div className="section-head">
                    <div>
                      <h3>{t("Subscriptions", "Subscriptions")}</h3>
                      <p className="muted">{t("Recurring hosting contracts and their renewal state.", "Recurring hosting contracts and their renewal state.")}</p>
                    </div>
                  </div>
                  {overview.subscriptions.length === 0 ? (
                    <div className="empty-panel empty-panel--compact">{t("No billing subscriptions exist yet.", "No billing subscriptions exist yet.")}</div>
                  ) : (
                    <div className="stack-sm">
                      {overview.subscriptions.map((subscription) => (
                        <div className="billing-subscription-card" key={subscription.id}>
                          <div className="billing-subscription-card__header">
                            <strong>{subscription.displayName}</strong>
                            <span className={`badge ${statusTone(subscription.status)}`}>{getStatusLabel(subscription.status)}</span>
                          </div>
                          <div className="muted">{formatCurrency(subscription.monthlyAmount, subscription.currency)} / mo · {t("Next invoice {date}", "Next invoice {date}").replace("{date}", formatDate(subscription.nextInvoiceAtUtc, t))}</div>
                          {subscription.lastError ? <div className="inline-message inline-message--error">{subscription.lastError}</div> : null}
                          <div className="billing-inline-actions">
                            {subscription.cancelAtPeriodEnd ? (
                              <span className="muted">{t("Cancel at period end enabled", "Cancel at period end enabled")}</span>
                            ) : (
                              <span className="muted">{t("Contact support to cancel this subscription.", "Contact support to cancel this subscription.")}</span>
                            )}
                            {subscription.legacyMigrated ? <span className="billing-chip">{t("Legacy migrated", "Legacy migrated")}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="card stack-sm">
                  <div className="section-head">
                    <div>
                      <h3>{t("Payment methods", "Payment methods")}</h3>
                      <p className="muted">{t("Default cards renew subscriptions automatically.", "Default cards renew subscriptions automatically.")}</p>
                    </div>
                  </div>
                  {overview.paymentMethods.length === 0 ? (
                    <div className="empty-panel empty-panel--compact">{t("No saved payment methods yet.", "No saved payment methods yet.")}</div>
                  ) : (
                    <div className="stack-sm">
                      {overview.paymentMethods.map((method) => (
                        <div className="billing-list-row" key={method.id}>
                          <div>
                            <strong>{method.brand ? `${method.brand.toUpperCase()} •••• ${method.last4 ?? "----"}` : method.provider}</strong>
                            <div className="muted">{t("Expires {date}", "Expires {date}").replace("{date}", `${method.expMonth ?? "--"}/${method.expYear ?? "--"}`)}{method.isDefault ? " · " + t("Default", "Default") : ""}</div>
                          </div>
                          <button
                            className="text-button text-button--danger"
                            type="button"
                            onClick={() => void handleDeletePaymentMethod(method.id)}
                            disabled={busyKey === `payment-method-${method.id}`}
                          >
                            {t("Remove", "Remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <div className="billing-side">
                <article className="card stack-sm">
                  <div className="section-head">
                    <div>
                      <h3>{t("Add account credit", "Add account credit")}</h3>
                      <p className="muted">{t("Top up your prepaid balance. Used automatically for hosting and renewals.", "Top up your prepaid balance. Used automatically for hosting and renewals.")}</p>
                    </div>
                  </div>
                  <div className="billing-topup-chips">
                    {[10, 25, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={`billing-topup-chip ${Number.parseFloat(topupAmount) === amount ? "billing-topup-chip--active" : ""}`}
                        onClick={() => setTopupAmount(String(amount))}
                      >
                        {formatCurrency(amount, overview.summary.currency)}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>{t("Amount ({currency})", "Amount ({currency})").replace("{currency}", overview.summary.currency.toUpperCase())}</span>
                    <input
                      inputMode="decimal"
                      value={topupAmount}
                      onChange={(event) => setTopupAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="25.00"
                    />
                  </label>
                  <button className="primary-button billing-action-button" type="button" onClick={() => void handleTopup()} disabled={busyKey === "topup"}>
                    <Wallet size={16} /> {busyKey === "topup" ? t("Opening...", "Opening...") : t("Add credit", "Add credit")}
                  </button>
                </article>

                <article className="card stack-sm">
                  <div className="section-head">
                    <div>
                      <h3>{t("Quick actions", "Quick actions")}</h3>
                      <p className="muted">{t("Buy hosting or update how you pay.", "Buy hosting or update how you pay.")}</p>
                    </div>
                  </div>
                  <Link to="/buy" className="primary-button billing-action-button">
                    <ShoppingCart size={16} /> {t("Buy a subscription", "Buy a subscription")} <ArrowRight size={16} style={{ marginLeft: "6px" }} />
                  </Link>
                  <button className="secondary-button billing-action-button" type="button" onClick={() => void handleSetupPaymentMethod()} disabled={busyKey === "setup-payment-method"}>
                    <CreditCard size={16} /> {busyKey === "setup-payment-method" ? t("Opening...", "Opening...") : t("Save payment method", "Save payment method")}
                  </button>
                </article>
              </div>
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="stack">
              {outstandingInvoices.length > 0 && (
                <article className="card stack-sm" style={{ borderLeft: "4px solid var(--warning, #e2b93b)" }}>
                  <div className="section-head">
                    <div>
                      <h3>{t("Outstanding invoices", "Outstanding invoices")}</h3>
                      <p className="muted">{t("These invoices require immediate payment to keep services active.", "These invoices require immediate payment to keep services active.")}</p>
                    </div>
                    <span className="badge badge--warning">{t("{count} due", "{count} due").replace("{count}", String(outstandingInvoices.length))}</span>
                  </div>
                  <div className="stack-sm">
                    {outstandingInvoices.map((invoice) => (
                      <div className="billing-list-row" key={invoice.id}>
                        <div>
                          <strong>{invoice.invoiceNumber}</strong>
                          <div className="muted">{invoice.description ?? t("Invoice", "Invoice")} · {t("Due {date}", "Due {date}").replace("{date}", formatDate(invoice.dueUtc, t))} · <span className={`badge ${statusTone(invoice.status)}`}>{getStatusLabel(invoice.status)}</span></div>
                        </div>
                        <div className="billing-list-actions">
                          <strong>{formatCurrency(invoice.amountDue, invoice.currency)}</strong>
                          <button className="secondary-button" type="button" onClick={() => void handleInvoiceCheckout(invoice)} disabled={busyKey === `invoice-${invoice.id}`}>
                            {busyKey === `invoice-${invoice.id}` ? t("Opening...", "Opening...") : t("Pay", "Pay")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              <article className="card stack-sm">
                <div className="section-head">
                  <div>
                    <h3>{t("Invoice archive", "Invoice archive")}</h3>
                    <p className="muted">{t("Full history of invoices issued to this account.", "Full history of invoices issued to this account.")}</p>
                  </div>
                </div>
                {overview.invoices.length === 0 ? (
                  <div className="empty-panel empty-panel--compact">{t("No invoices yet.", "No invoices yet.")}</div>
                ) : (
                  <div className="stack-sm">
                    {overview.invoices.map((invoice) => (
                      <div className="billing-list-row" key={invoice.id}>
                        <div>
                          <strong>{invoice.invoiceNumber}</strong>
                          <div className="muted">{invoice.description ?? t("Invoice", "Invoice")} · {t("Issued {date}", "Issued {date}").replace("{date}", formatDate(invoice.issuedUtc, t))}</div>
                        </div>
                        <div className="billing-list-actions">
                          <span className={`badge ${statusTone(invoice.status)}`}>{getStatusLabel(invoice.status)}</span>
                          <strong>{formatCurrency(invoice.total, invoice.currency)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}

          {activeTab === "ledger" && (
            <div className="billing-layout">
              <div className="billing-main">
                <article className="card stack-sm">
                  <div className="section-head">
                    <div>
                      <h3>{t("Recent transactions", "Recent transactions")}</h3>
                      <p className="muted">{t("Payments made via card, bank top-ups, and applied credits.", "Payments made via card, bank top-ups, and applied credits.")}</p>
                    </div>
                  </div>
                  {overview.transactions.length === 0 ? (
                    <div className="empty-panel empty-panel--compact">{t("No transactions yet.", "No transactions yet.")}</div>
                  ) : (
                    <div className="stack-sm">
                      {overview.transactions.map((transaction) => (
                        <div className="billing-list-row" key={transaction.id}>
                          <div>
                            <strong>{transaction.description ?? transaction.type}</strong>
                            <div className="muted">{formatDate(transaction.occurredUtc, t)} · {transaction.provider} · <span className={`badge ${statusTone(transaction.status)}`}>{getStatusLabel(transaction.status)}</span></div>
                          </div>
                          <strong>{formatCurrency(transaction.amount, transaction.currency)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <div className="billing-side">
                <article className="card stack-sm">
                  <div className="section-head">
                    <div>
                      <h3>{t("Ledger trail", "Ledger trail")}</h3>
                      <p className="muted">{t("Complete chronological record of credit adjustments and balance states.", "Complete chronological record of credit adjustments and balance states.")}</p>
                    </div>
                  </div>
                  {overview.ledger.length === 0 ? (
                    <div className="empty-panel empty-panel--compact">{t("No ledger activity yet.", "No ledger activity yet.")}</div>
                  ) : (
                    <div className="stack-sm">
                      {overview.ledger.slice(0, 8).map((entry) => (
                        <div className="billing-ledger-row" key={entry.id}>
                          <div>
                            <strong>{entry.description}</strong>
                            <div className="muted">{formatDate(entry.createdUtc, t)} · {entry.entryType.replace(/_/g, " ")}</div>
                          </div>
                          <div className="billing-ledger-values">
                            <span className={entry.direction === "credit" ? "billing-amount billing-amount--positive" : "billing-amount billing-amount--negative"}>
                              {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount, entry.currency)}
                            </span>
                            <span className="muted" style={{ fontSize: "0.75rem" }}>{t("Bal: {amount}", "Bal: {amount}").replace("{amount}", formatCurrency(entry.balanceAfter, entry.currency))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <article className="card stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
        <div>
          <p className="label" style={{ margin: 0, fontSize: "0.85rem", fontWeight: "500" }}>{label}</p>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", margin: "6px 0 2px", letterSpacing: "-0.02em" }}>{value}</h2>
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
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          flexShrink: 0
        }}>
          {icon}
        </div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>{note}</p>
    </article>
  );
}
