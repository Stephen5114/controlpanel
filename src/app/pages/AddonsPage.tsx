import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Database,
  FileText,
  Globe,
  HardDrive,
  Loader2,
  MapPin,
  Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  cancelBillingSubscription,
  createAddonCheckout,
  getAddonCatalog,
  getBillingSubscriptions,
  type AddonCatalogResponse,
  type AddonPriceTier,
  type BillingSubscriptionView,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { getActiveLocale, useLocalization } from "../lib/i18n";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat(getActiveLocale(), {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(getActiveLocale(), {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function AddonsCategoryHeader({ categoryKey }: { categoryKey: string }) {
  const { t } = useLocalization();
  const titles: Record<string, { title: string; description: string }> = {
    site_quota: { title: "Site Quota", description: "Add more website slots to this package" },
    disk_space: { title: "Web Space", description: "Increase this package's web storage" },
    database_quota: { title: "Database Quota", description: "Add more database slots to this package" },
    database_space: { title: "Database Space", description: "Increase this package's database allocation" },
    file_quota: { title: "File Quota", description: "Increase the maximum number of files allowed" },
  };
  const entry = titles[categoryKey];
  return (
    <>
      <h3>{t(entry.title, entry.title)}</h3>
      <p className="muted">{t(entry.description, entry.description)}</p>
    </>
  );
}

type AddonCategory = {
  key: string;
  icon: typeof Package;
  tiers: AddonPriceTier[];
};

function groupAddonsByCategory(addons: AddonPriceTier[]): AddonCategory[] {
  const categories: AddonCategory[] = [
    { key: "site_quota", icon: Globe, tiers: [] },
    { key: "disk_space", icon: HardDrive, tiers: [] },
    { key: "database_quota", icon: Database, tiers: [] },
    { key: "database_space", icon: Database, tiers: [] },
    { key: "file_quota", icon: FileText, tiers: [] },
  ];
  for (const addon of addons) {
    categories.find((category) => category.key === addon.addonType)?.tiers.push(addon);
  }
  return categories.filter((category) => category.tiers.length > 0);
}

function UsageBar({ label, used, quota, unit }: { label: string; used: number; quota: number; unit: string }) {
  const { t } = useLocalization();
  const rawPercent = quota > 0 ? (used / quota) * 100 : 0;
  const percent = Math.min(rawPercent, 100);
  const tone = rawPercent >= 90 ? "is-danger" : rawPercent >= 70 ? "is-warning" : "is-ok";
  const overBy = Math.max(used - quota, 0);

  return (
    <div className="addon-usage-bar">
      <div className="addon-usage-bar__header">
        <span className="addon-usage-bar__label">{label}</span>
        <span className="addon-usage-bar__value">{used} / {quota} {unit}</span>
      </div>
      <div className="addon-usage-bar__track">
        <div className={`addon-usage-bar__fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      {overBy > 0 ? (
        <span className="addon-usage-bar__over">
          {overBy} {unit} {t("over the current limit", "over the current limit")}
        </span>
      ) : null}
    </div>
  );
}

export function AddonsPage() {
  const { t } = useLocalization();
  const [catalog, setCatalog] = useState<AddonCatalogResponse | null>(null);
  const [addonSubscriptions, setAddonSubscriptions] = useState<BillingSubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
  const [busyCategory, setBusyCategory] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState("");

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
        const [catalogResult, subscriptionsResult] = await Promise.all([
          getAddonCatalog(session!),
          getBillingSubscriptions(session!),
        ]);
        if (!active) return;
        setCatalog(catalogResult);
        setAddonSubscriptions(subscriptionsResult.filter((item) => item.scopeType === "resource_addon"));
        const requestedId = new URLSearchParams(window.location.search).get("subscription");
        const requested = catalogResult.subscriptions.find((item) => item.id === requestedId);
        setSelectedSubscription(requested?.id ?? catalogResult.subscriptions[0]?.id ?? "");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : t("Failed to load addon catalog.", "Failed to load addon catalog."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  async function reload() {
    const session = getCustomerSession();
    if (!session) return;
    const [catalogResult, subscriptionsResult] = await Promise.all([
      getAddonCatalog(session),
      getBillingSubscriptions(session),
    ]);
    setCatalog(catalogResult);
    setAddonSubscriptions(subscriptionsResult.filter((item) => item.scopeType === "resource_addon"));
  }

  function chooseSubscription(subscriptionId: string) {
    setSelectedSubscription(subscriptionId);
    setSelectedTiers({});
    const url = new URL(window.location.href);
    url.searchParams.set("subscription", subscriptionId);
    window.history.replaceState({}, "", url);
  }

  async function handlePurchase(categoryKey: string) {
    const session = getCustomerSession();
    const priceId = selectedTiers[categoryKey];
    if (!session || !priceId || !selectedSubscription) return;
    setBusyCategory(categoryKey);
    setError(null);
    setMessage(null);
    try {
      const result = await createAddonCheckout(session, {
        priceId,
        subscriptionId: selectedSubscription,
      });
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setMessage(result.message || t("Addon purchased successfully! Your resource limits have been updated.", "Addon purchased successfully! Your resource limits have been updated."));
      await reload();
      setSelectedTiers((current) => ({ ...current, [categoryKey]: "" }));
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : t("Purchase failed.", "Purchase failed."));
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
      await reload();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : t("Cancellation failed.", "Cancellation failed."));
    } finally {
      setCancellingId(null);
    }
  }

  const categories = catalog ? groupAddonsByCategory(catalog.addons) : [];
  const selectedPackage = catalog?.subscriptions.find((item) => item.id === selectedSubscription);
  const resources = selectedPackage?.resources;
  const visibleAddonSubscriptions = addonSubscriptions.filter(
    (item) => !item.targetHostingSubscriptionId || item.targetHostingSubscriptionId === selectedSubscription,
  );

  return (
    <div className="stack">
      <section className="page-hero page-hero--inline">
        <div>
          <p className="eyebrow">{t("Addons", "Addons")}</p>
          <h1>{t("Resource Addons", "Resource Addons")}</h1>
          <p className="page-copy">{t("Purchase additional resources for a specific hosting package. All addons are billed monthly.", "Purchase additional resources for a specific hosting package. All addons are billed monthly.")}</p>
        </div>
      </section>

      {message ? <div className="inline-message inline-message--success"><CheckCircle size={16} /> {message}</div> : null}
      {error ? <div className="inline-message inline-message--error"><AlertCircle size={16} /> {error}</div> : null}
      {loading ? <div className="empty-panel"><Loader2 size={20} className="spin" /> {t("Loading addon catalog...", "Loading addon catalog...")}</div> : null}

      {!loading && catalog && catalog.subscriptions.length > 0 ? (
        <section className="stack">
          <div className="section-title">
            <div>
              <h2>{t("Choose a package", "Choose a package")}</h2>
              <p className="muted">{t("Resource usage and addons are managed separately for each package.", "Resource usage and addons are managed separately for each package.")}</p>
            </div>
          </div>
          <div className="addon-package-grid">
            {catalog.subscriptions.map((subscription) => {
              const selected = subscription.id === selectedSubscription;
              const usage = subscription.resources;
              return (
                <button
                  className={`addon-package-card${selected ? " is-selected" : ""}`}
                  key={subscription.id}
                  onClick={() => chooseSubscription(subscription.id)}
                  type="button"
                >
                  <div className="addon-package-card__top">
                    <div>
                      <span className="addon-package-card__plan">{subscription.displayName}</span>
                      <span className="addon-package-card__region"><MapPin size={13} /> {subscription.regionSlug.toUpperCase()}</span>
                    </div>
                    <span className="badge badge--success">{t("Active", "Active")}</span>
                  </div>
                  <div className="addon-package-card__metrics">
                    <span><strong>{usage.usedSites}/{usage.siteQuota}</strong>{t("Sites", "Sites")}</span>
                    <span><strong>{Math.round(usage.usedDiskMb)}/{usage.diskQuotaMb} MB</strong>{t("Web Space", "Web Space")}</span>
                    <span><strong>{usage.usedDatabases}/{usage.databaseQuota}</strong>{t("Databases", "Databases")}</span>
                  </div>
                  <span className="addon-package-card__action">
                    {selected ? t("Selected package", "Selected package") : t("Manage resources", "Manage resources")}
                    <ChevronRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {!loading && resources && selectedPackage ? (
        <section className="stack">
          <div className="section-title">
            <div>
              <p className="eyebrow">{t("Selected package", "Selected package")}</p>
              <h2>{selectedPackage.displayName} — {t("Resource usage", "Resource usage")}</h2>
            </div>
          </div>
          <div className="card addon-resource-panel">
            <div className="addon-usage-grid">
              <UsageBar label={t("Sites", "Sites")} used={resources.usedSites} quota={resources.siteQuota} unit="" />
              <UsageBar label={t("Databases", "Databases")} used={resources.usedDatabases} quota={resources.databaseQuota} unit="" />
              <UsageBar label={t("Web Space", "Web Space")} used={Math.round(resources.usedDiskMb)} quota={resources.diskQuotaMb} unit="MB" />
              {resources.databaseSpaceLimitMb > 0 ? (
                <UsageBar label={t("Database Allocation", "Database Allocation")} used={resources.usedDatabaseSpaceMb} quota={resources.databaseSpaceLimitMb} unit="MB" />
              ) : null}
              <UsageBar label={t("File Quota", "File Quota")} used={resources.usedFileCount} quota={resources.fileQuotaCount} unit={t("files", "files")} />
            </div>
          </div>
        </section>
      ) : null}

      {!loading && catalog && catalog.subscriptions.length === 0 ? (
        <div className="empty-panel addon-empty-state">
          <Package size={24} />
          <strong>{t("No hosting package found", "No hosting package found")}</strong>
          <span className="muted">{t("Purchase a hosting package before adding resources.", "Purchase a hosting package before adding resources.")}</span>
          <a className="primary-button" href="/buy">{t("Buy a hosting plan", "Buy a hosting plan")}</a>
        </div>
      ) : null}

      {!loading && selectedPackage && categories.length > 0 ? (
        <section className="stack">
          <div className="section-title">
            <div>
              <h2>{t("Available Addons", "Available Addons")}</h2>
              <p className="muted">{t("New resources will be added to", "New resources will be added to")} <strong>{selectedPackage.displayName}</strong>.</p>
            </div>
          </div>
          <div className="two-up-grid">
            {categories.map((category) => {
              const Icon = category.icon;
              const selectedTier = selectedTiers[category.key] || "";
              const busy = busyCategory === category.key;
              return (
                <article className="card addon-card" key={category.key}>
                  <div className="addon-card__header">
                    <Icon size={20} />
                    <div><AddonsCategoryHeader categoryKey={category.key} /></div>
                  </div>
                  <div className="addon-card__tiers">
                    {category.tiers.map((tier) => (
                      <label className={`addon-tier${selectedTier === tier.priceId ? " is-selected" : ""}`} key={tier.priceId}>
                        <input
                          type="radio"
                          name={`addon-${category.key}`}
                          value={tier.priceId}
                          checked={selectedTier === tier.priceId}
                          onChange={() => setSelectedTiers((current) => ({ ...current, [category.key]: tier.priceId }))}
                        />
                        <div className="addon-tier__info">
                          <strong>{t(tier.label, tier.label)}</strong>
                          <span className="muted">{t(tier.description, tier.description)}</span>
                        </div>
                        <div className="addon-tier__price">
                          {formatCurrency(tier.amount, tier.currency)}<span className="muted">{t("/mo", "/mo")}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button className="primary-button" disabled={!selectedTier || busy} onClick={() => handlePurchase(category.key)} type="button">
                    {busy ? (
                      <><Loader2 size={14} className="spin" /> {t("Processing...", "Processing...")}</>
                    ) : (
                      `${t("Add to", "Add to")} ${selectedPackage.displayName}`
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!loading && visibleAddonSubscriptions.length > 0 ? (
        <section className="stack">
          <div className="section-title">
            <div>
              <h2>{t("Active Addon Subscriptions", "Active Addon Subscriptions")}</h2>
              <p className="muted">{t("Addons for the selected package are shown below. Account-wide legacy addons remain visible.", "Addons for the selected package are shown below. Account-wide legacy addons remain visible.")}</p>
            </div>
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
                {visibleAddonSubscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td><strong>{subscription.displayName}</strong></td>
                    <td>{formatCurrency(subscription.monthlyAmount, subscription.currency)}{t("/mo", "/mo")}</td>
                    <td>
                      <span className={`badge${subscription.status === "active" ? " badge--success" : subscription.status === "canceled" ? " badge--danger" : ""}`}>
                        {subscription.status === "active" ? t("Active", "Active") : subscription.status === "canceled" ? t("Canceled", "Canceled") : subscription.status}
                      </span>
                    </td>
                    <td>{formatDate(subscription.currentPeriodEndUtc)}</td>
                    <td>
                      {subscription.status === "active" ? (
                        <button
                          className="text-button text-button--danger"
                          disabled={cancellingId === subscription.id}
                          onClick={() => handleCancel(subscription.id)}
                          type="button"
                        >
                          {cancellingId === subscription.id ? t("Cancelling...", "Cancelling...") : t("Cancel", "Cancel")}
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

      {!loading && catalog && catalog.subscriptions.length > 0 && categories.length === 0 && !error ? (
        <div className="empty-panel">{t("No addons are available at this time.", "No addons are available at this time.")}</div>
      ) : null}
    </div>
  );
}
