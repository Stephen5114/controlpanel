import { Package, HardDrive, Database, Globe, AlertCircle, CheckCircle, Loader2, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAddonCatalog,
  createAddonCheckout,
  getBillingSubscriptions,
  cancelBillingSubscription,
  type AddonCatalogResponse,
  type AddonPriceTier,
  type BillingSubscriptionView,
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

type AddonCategory = {
  key: string;
  title: string;
  description: string;
  icon: typeof Package;
  tiers: AddonPriceTier[];
};

function groupAddonsByCategory(addons: AddonPriceTier[]): AddonCategory[] {
  const categories: AddonCategory[] = [
    { key: "site_quota", title: "Site Quota", description: "Add more website slots to your account", icon: Globe, tiers: [] },
    { key: "disk_space", title: "Web Space", description: "Increase your disk storage allocation", icon: HardDrive, tiers: [] },
    { key: "database_quota", title: "Database Quota", description: "Add more database slots", icon: Database, tiers: [] },
    { key: "database_space", title: "Database Space", description: "Increase database storage capacity", icon: Database, tiers: [] },
    { key: "file_quota", title: "File Quota", description: "Increase the maximum number of files allowed", icon: FileText, tiers: [] },
  ];

  for (const addon of addons) {
    const cat = categories.find((c) => c.key === addon.addonType);
    if (cat) {
      cat.tiers.push(addon);
    }
  }

  return categories.filter((c) => c.tiers.length > 0);
}

function UsageBar({ label, used, quota, unit }: { label: string; used: number; quota: number; unit: string }) {
  const pct = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;
  const tone = pct >= 90 ? "is-danger" : pct >= 70 ? "is-warning" : "is-ok";

  return (
    <div className="addon-usage-bar">
      <div className="addon-usage-bar__header">
        <span className="addon-usage-bar__label">{label}</span>
        <span className="addon-usage-bar__value">
          {used} / {quota} {unit}
        </span>
      </div>
      <div className="addon-usage-bar__track">
        <div className={`addon-usage-bar__fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AddonsPage() {
  const { t } = useLocalization();
  const [catalog, setCatalog] = useState<AddonCatalogResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<BillingSubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
  const [busyCategory, setBusyCategory] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("addon_checkout") === "success") {
      setMessage(t("Addon purchased successfully! Your resource limits have been updated.", "Addon purchased successfully! Your resource limits have been updated."));
    } else if (params.get("addon_checkout") === "cancel") {
      setMessage(t("Addon checkout was canceled.", "Addon checkout was canceled."));
    }
  }, []);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catalogResult, subsResult] = await Promise.all([
          getAddonCatalog(session!),
          getBillingSubscriptions(session!),
        ]);
        if (!active) return;
        setCatalog(catalogResult);
        setSubscriptions(subsResult.filter((s) => s.scopeType === "resource_addon"));
        // Auto-select if only one hosting subscription
        if (catalogResult.subscriptions.length === 1) {
          setSelectedSubscription(catalogResult.subscriptions[0].id);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : t("Failed to load addon catalog.", "Failed to load addon catalog."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  async function handlePurchase(categoryKey: string) {
    const session = getCustomerSession();
    if (!session) return;

    const priceId = selectedTiers[categoryKey];
    if (!priceId) return;

    setBusyCategory(categoryKey);
    setError(null);
    setMessage(null);

    try {
      const result = await createAddonCheckout(session, {
        priceId,
        subscriptionId: selectedSubscription || undefined,
      });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
      } else {
        setMessage(result.message || t("Addon purchased successfully! Your resource limits have been updated.", "Addon purchased successfully! Your resource limits have been updated."));
        // Reload data
        const [catalogResult, subsResult] = await Promise.all([
          getAddonCatalog(session),
          getBillingSubscriptions(session),
        ]);
        setCatalog(catalogResult);
        setSubscriptions(subsResult.filter((s) => s.scopeType === "resource_addon"));
        setSelectedTiers((prev) => ({ ...prev, [categoryKey]: "" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Purchase failed.", "Purchase failed."));
    } finally {
      setBusyCategory(null);
    }
  }

  async function handleCancel(subscriptionId: string) {
    const session = getCustomerSession();
    if (!session) return;

    setCancellingId(subscriptionId);
    setError(null);
    setMessage(null);

    try {
      const result = await cancelBillingSubscription(session, subscriptionId);
      setMessage(result.message || t("Addon subscription canceled.", "Addon subscription canceled."));
      // Reload
      const [catalogResult, subsResult] = await Promise.all([
        getAddonCatalog(session),
        getBillingSubscriptions(session),
      ]);
      setCatalog(catalogResult);
      setSubscriptions(subsResult.filter((s) => s.scopeType === "resource_addon"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Cancellation failed.", "Cancellation failed."));
    } finally {
      setCancellingId(null);
    }
  }

  const categories = catalog ? groupAddonsByCategory(catalog.addons) : [];
  const resources = catalog?.resources;

  return (
    <div className="stack">
      <section className="page-hero page-hero--inline">
        <div>
          <p className="eyebrow">{t("Addons", "Addons")}</p>
          <h1>{t("Resource Addons", "Resource Addons")}</h1>
          <p className="page-copy">{t("Purchase additional resources for your hosting account. All addons are billed monthly.", "Purchase additional resources for your hosting account. All addons are billed monthly.")}</p>
        </div>
      </section>

      {message ? (
        <div className="inline-message inline-message--success">
          <CheckCircle size={16} /> {message}
        </div>
      ) : null}

      {error ? (
        <div className="inline-message inline-message--error">
          <AlertCircle size={16} /> {error}
        </div>
      ) : null}

      {loading ? (
        <div className="empty-panel">
          <Loader2 size={20} className="spin" /> {t("Loading addon catalog...", "Loading addon catalog...")}
        </div>
      ) : null}

      {!loading && resources ? (
        <section className="stack">
          <div className="section-title">
            <h2>{t("Current Resource Usage", "Current Resource Usage")}</h2>
          </div>
          <div className="card">
            <div className="addon-usage-grid">
              <UsageBar label={t("Sites", "Sites")} used={resources.usedSites} quota={resources.siteQuota} unit="" />
              <UsageBar label={t("Databases", "Databases")} used={resources.usedDatabases} quota={resources.databaseQuota} unit="" />
              <UsageBar
                label={t("Disk Space", "Disk Space")}
                used={Math.round(resources.usedDiskMb)}
                quota={resources.diskQuotaMb}
                unit="MB"
              />
              {resources.databaseSpaceLimitMb > 0 && (
                <UsageBar
                  label={t("Database Space", "Database Space")}
                  used={resources.usedDatabaseSpaceMb}
                  quota={resources.databaseSpaceLimitMb}
                  unit="MB"
                />
              )}
              <UsageBar label={t("File Quota", "File Quota")} used={0} quota={resources.fileQuotaCount} unit={t("files", "files")} />
            </div>
          </div>
        </section>
      ) : null}

      {!loading && catalog && catalog.subscriptions.length > 1 ? (
        <section className="stack">
          <div className="section-title">
            <h2>{t("Target Subscription", "Target Subscription")}</h2>
          </div>
          <div className="card" style={{ padding: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span className="muted">{t("Select which hosting subscription these addons apply to:", "Select which hosting subscription these addons apply to:")}</span>
              <select
                value={selectedSubscription}
                onChange={(e) => setSelectedSubscription(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.9rem", maxWidth: "400px" }}
              >
                <option value="">{t("— Select a subscription —", "— Select a subscription —")}</option>
                {catalog.subscriptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {!loading && categories.length > 0 ? (
        <section className="stack">
          <div className="section-title">
            <h2>{t("Available Addons", "Available Addons")}</h2>
          </div>
          <div className="two-up-grid">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const selected = selectedTiers[cat.key] || "";
              const isBusy = busyCategory === cat.key;

              return (
                <article className="card addon-card" key={cat.key}>
                  <div className="addon-card__header">
                    <Icon size={20} />
                    <div>
                      <h3>{t(cat.title, cat.title)}</h3>
                      <p className="muted">{t(cat.description, cat.description)}</p>
                    </div>
                  </div>

                  <div className="addon-card__tiers">
                    {cat.tiers.map((tier) => (
                      <label className={`addon-tier${selected === tier.priceId ? " is-selected" : ""}`} key={tier.priceId}>
                        <input
                          type="radio"
                          name={`addon-${cat.key}`}
                          value={tier.priceId}
                          checked={selected === tier.priceId}
                          onChange={() => setSelectedTiers((prev) => ({ ...prev, [cat.key]: tier.priceId }))}
                        />
                        <div className="addon-tier__info">
                          <strong>{t(tier.label, tier.label)}</strong>
                          <span className="muted">{t(tier.description, tier.description)}</span>
                        </div>
                        <div className="addon-tier__price">
                          {formatCurrency(tier.amount, tier.currency)}<span className="muted">/mo</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    className="primary-button"
                    disabled={!selected || isBusy || (catalog!.subscriptions.length > 1 && !selectedSubscription)}
                    onClick={() => handlePurchase(cat.key)}
                    type="button"
                  >
                    {isBusy ? (
                      <><Loader2 size={14} className="spin" /> {t("Processing...", "Processing...")}</>
                    ) : (
                      t("Purchase", "Purchase")
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!loading && subscriptions.length > 0 ? (
        <section className="stack">
          <div className="section-title">
            <h2>{t("Active Addon Subscriptions", "Active Addon Subscriptions")}</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Addon", "Addon")}</th>
                  <th>{t("Price", "Price")}</th>
                  <th>{t("Status", "Status")}</th>
                  <th>{t("Next Renewal", "Next Renewal")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td><strong>{sub.displayName}</strong></td>
                    <td>{formatCurrency(sub.monthlyAmount, sub.currency)}/mo</td>
                    <td>
                      <span className={`badge${sub.status === "active" ? " badge--success" : sub.status === "canceled" ? " badge--danger" : ""}`}>
                        {sub.status === "active" ? t("Active", "Active") : sub.status === "canceled" ? t("Canceled", "Canceled") : sub.status}
                      </span>
                    </td>
                    <td>{formatDate(sub.currentPeriodEndUtc)}</td>
                    <td>
                      {sub.status === "active" ? (
                        <button
                          className="text-button text-button--danger"
                          disabled={cancellingId === sub.id}
                          onClick={() => handleCancel(sub.id)}
                          type="button"
                        >
                          {cancellingId === sub.id ? t("Cancelling...", "Cancelling...") : t("Cancel", "Cancel")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && categories.length === 0 && !error ? (
        <div className="empty-panel">
          {t("No addons are available at this time.", "No addons are available at this time.")}
        </div>
      ) : null}
    </div>
  );
}
