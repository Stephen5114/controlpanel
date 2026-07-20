import { ArrowLeft, CalendarDays, Check, Clock3, Cpu, Database, Globe2, HardDrive, Server, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCustomerSession } from "../lib/customer-session";
import { createVpsCheckout, createVpsRenewalCheckout, getVpsCatalog, getVpsService, type VpsPlan, type VpsService } from "../lib/api-vps";
import { getActiveLocale, useLocalization } from "../lib/i18n";

const pendingStatuses = new Set(["pending_purchase", "provisioning"]);

export function VpsPage() {
  const { serviceId } = useParams();
  return serviceId ? <VpsDetail serviceId={serviceId} /> : <VpsHome />;
}

function VpsHome() {
  const { t } = useLocalization();
  const [plans, setPlans] = useState<VpsPlan[]>([]);
  const [selectedOs, setSelectedOs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) return;
    getVpsCatalog(session)
      .then((planRows) => {
        setPlans(planRows);
        setSelectedOs(Object.fromEntries(planRows.map((plan) => [plan.id, plan.operatingSystems[0] ?? ""])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("Could not load VPS services.", "Could not load VPS services.")))
      .finally(() => setLoading(false));
  }, [t]);

  async function buy(plan: VpsPlan) {
    const session = getCustomerSession(); if (!session) return;
    setBusy(plan.id); setError(null);
    try {
      const result = await createVpsCheckout(session, plan.id, selectedOs[plan.id] || plan.operatingSystems[0] || "");
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else if (result.success && result.subscriptionScopeReference) window.location.assign(`/vps/${result.subscriptionScopeReference}`);
      else setError(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : t("Checkout failed.", "Checkout failed.")); }
    finally { setBusy(null); }
  }

  return <div className="vps-page">
    <section className="page-hero page-hero--inline">
      <div>
        <p className="eyebrow">Windows VPS Hosting</p>
        <h1>{t("High-performance VPS, without the complexity", "High-performance VPS, without the complexity")}</h1>
        <p className="page-copy">{t("Dedicated resources, predictable monthly pricing, and personal provisioning by our hosting team.", "Dedicated resources, predictable monthly pricing, and personal provisioning by our hosting team.")}</p>
      </div>
    </section>
    {error ? <div className="inline-message inline-message--error">{error}</div> : null}
    {loading ? <div className="empty-panel">{t("Loading VPS services...", "Loading VPS services...")}</div> : null}
    <section className="vps-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "40px" }}>
        <div className="vps-section__heading"><div><span className="vps-section__kicker">{t("Monthly plans", "Monthly plans")}</span><h2>{t("Choose your Windows VPS", "Choose your Windows VPS")}</h2><p>{t("No setup fee. Upgrade at your next renewal.", "No setup fee. Upgrade at your next renewal.")}</p></div></div>
        <ul className="vps-hero__assurances" aria-label="VPS service highlights">
          <li><Check size={16} /> {t("One static IP included", "One static IP included")}</li>
          <li><Check size={16} /> {t("Unlimited data transfer", "Unlimited data transfer")}</li>
          <li><Check size={16} /> {t("Ready within 24 hours", "Ready within 24 hours")}</li>
        </ul>
      </div>
      {plans.length === 0 && !loading ? <div className="empty-panel">{t("No VPS plans are available right now.", "No VPS plans are available right now.")}</div> : null}
      <div className="vps-plan-grid">{plans.map((plan, index) => <article className={`vps-plan-card${index === 1 ? " vps-plan-card--featured" : ""}`} key={plan.id}>
        {index === 1 ? <div className="vps-popular">{t("Most popular", "Most popular")}</div> : null}
        <div className="vps-plan-card__head"><span className="vps-region">{t("Windows VPS", "Windows VPS")}</span><h3>{plan.name}</h3><p>{plan.description}</p></div>
        <div className="vps-price"><strong>{formatMoney(plan.monthlyPrice, plan.currency)}</strong><span>{t("/ month", "/ month")}</span><small>{t("Billed monthly", "Billed monthly")}</small></div>
        <div className="vps-plan-divider" />
        <div className="vps-specs"><span><Cpu size={17} /><span><strong>{plan.cpuCores} vCPU</strong><small>{t("Processor cores", "Processor cores")}</small></span></span><span><Database size={17} /><span><strong>{formatRam(plan.ramMb)} RAM</strong><small>{t("Dedicated memory", "Dedicated memory")}</small></span></span><span><HardDrive size={17} /><span><strong>{plan.storageGb} GB {plan.storageType}</strong><small>{t("High-speed storage", "High-speed storage")}</small></span></span><span><Globe2 size={17} /><span><strong>{plan.bandwidth}</strong><small>{t("Data transfer", "Data transfer")}</small></span></span></div>
        <label className="vps-os-label">{t("Operating system", "Operating system")}<select value={selectedOs[plan.id] ?? ""} onChange={(e) => setSelectedOs((old) => ({ ...old, [plan.id]: e.target.value }))}>{plan.operatingSystems.map((os) => <option value={os} key={os}>{os}</option>)}</select></label>
        <button className="primary-button vps-buy-button" onClick={() => void buy(plan)} disabled={busy === plan.id}><ShoppingCart size={16} />{busy === plan.id ? t("Opening checkout...", "Opening checkout...") : t("Choose plan", "Choose plan")}</button>
        <p className="vps-fulfilment-note">{t("Manual provisioning · Password sent by email", "Manual provisioning · Password sent by email")}</p>
      </article>)}</div>
      <div className="vps-catalog-note"><strong>{t("All plans include:", "All plans include:")}</strong> {t("full administrator access, a static IPv4 address, and your choice of supported Windows Server edition. This is an unmanaged service.", "full administrator access, a static IPv4 address, and your choice of supported Windows Server edition. This is an unmanaged service.")}</div>
    </section>
  </div>;
}

function VpsDetail({ serviceId }: { serviceId: string }) {
  const { t } = useLocalization();
  const [service, setService] = useState<VpsService | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const session = getCustomerSession(); if (!session) return; getVpsService(session, serviceId).then(setService).catch((e) => setError(e instanceof Error ? e.message : t("Failed to load VPS.", "Failed to load VPS."))).finally(() => setLoading(false)); }, [serviceId]);
  const canRenew = useMemo(() => service && ["renewal_due", "expired"].includes(service.status), [service]);
  async function renew() { const session = getCustomerSession(); if (!session || !service) return; setBusy(true); setError(null); try { const r = await createVpsRenewalCheckout(session, service.id); if (r.checkoutUrl) window.location.assign(r.checkoutUrl); else if (r.success) window.location.reload(); else setError(r.message); } catch (e) { setError(e instanceof Error ? e.message : "Renewal checkout failed."); } finally { setBusy(false); } }
  if (loading) return <div className="empty-panel">{t("Loading server information...", "Loading server information...")}</div>;
  if (!service) return <div className="empty-panel">{error ?? t("VPS service not found.", "VPS service not found.")}</div>;
  const rows = [
    [t("Hosting Login ID", "Hosting Login ID"), service.hostingLoginId], [t("Product Name", "Product Name"), service.productName],
    [t("Description", "Description"), service.description], [t("IP Address", "IP Address"), service.ipAddress || t("Pending assignment", "Pending assignment")],
    [t("Operating System", "Operating System"), service.operatingSystem || "—"], [t("Connection Port", "Connection Port"), service.connectionPort?.toString() || "—"],
    [t("Username", "Username"), service.username || "—"], [t("Expires", "Expires"), formatDate(service.expiresUtc)],
    [t("Auto Backup", "Auto Backup"), service.autoBackupEnabled ? "ON" : "OFF"],
  ];
  return <div className="vps-page vps-detail-page">
    <Link to="/vps" className="vps-back"><ArrowLeft size={16} />{t("Back to VPS", "Back to VPS")}</Link>
    <section className="vps-information-card"><div className="vps-information-card__header"><div><h1>{t("Hosting Account Overview", "Hosting Account Overview")}</h1><p>VPS / Cloud</p></div><StatusBadge status={service.status} /></div>
      {pendingStatuses.has(service.status) ? <div className="vps-notice"><Clock3 size={18} />{t("Your VPS is being configured. It can take up to 24 hours to be ready.", "Your VPS is being configured. It can take up to 24 hours to be ready.")}</div> : null}
      {service.status === "renewal_paid" ? <div className="vps-notice"><Clock3 size={18} />{t("Your renewal payment was received and the provider renewal is being processed.", "Your renewal payment was received and the provider renewal is being processed.")}</div> : null}
      <dl className="vps-info-table">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {service.credentialsSent ? <div className="vps-credentials-note">{t("The login password was sent to your registered email address. Contact support if you did not receive it.", "The login password was sent to your registered email address. Contact support if you did not receive it.")}</div> : null}
    </section>
    <section className="vps-status-card"><div><span>{t("Server Status", "Server Status")}</span><StatusBadge status={service.status} /></div>{canRenew ? <button className="primary-button" disabled={busy} onClick={() => void renew()}>{busy ? t("Opening checkout...", "Opening checkout...") : t("Renew VPS", "Renew VPS")}</button> : null}</section>
    {error ? <div className="inline-message inline-message--error">{error}</div> : null}
  </div>;
}

function StatusBadge({ status }: { status: string }) { const label = status.split("_").map((x) => x[0].toUpperCase() + x.slice(1)).join(" "); return <span className={`vps-status vps-status--${status}`}>{label}</span>; }
function formatRam(mb: number) { return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 ? 1 : 0)} GB` : `${mb} MB`; }
function formatDate(value?: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat(getActiveLocale(), { dateStyle: "long" }).format(d); }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat(getActiveLocale(), { style: "currency", currency: currency.toUpperCase() }).format(value); }
