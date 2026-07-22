import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, RefreshCw, Shield, ShieldCheck } from "lucide-react";
import { getSubscriptionSecurity, type SubscriptionSecurityResponse } from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { getActiveLocale, useLocalization } from "../lib/i18n";

function normalizeState(value: string) {
  return value.trim().toLowerCase();
}

function formatDate(value: string | null, t?: (key: string, def: string) => string) {
  return value ? new Date(value).toLocaleDateString(getActiveLocale()) : (t ? t("Unknown", "Unknown") : "Unknown");
}

export function SubscriptionSecurityPage() {
  const { t } = useLocalization();
  const { subId } = useParams();
  const [data, setData] = useState<SubscriptionSecurityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId) {
      setLoading(false);
      return;
    }

    let active = true;
    async function load() {
      try {
        if (!refreshTick) setLoading(true);
        setError(null);
        const response = await getSubscriptionSecurity(session!, subId!);
        if (active) setData(response);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t("Failed to load security telemetry.", "Failed to load security telemetry."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [refreshTick, subId]);

  const criticalCount = useMemo(
    () => data?.alerts.filter((alert) => alert.severity.toLowerCase() === "critical").length ?? 0,
    [data],
  );
  const healthyCount = useMemo(
    () => data?.sites.filter((site) => normalizeState(site.hostnameState) === "healthy" && normalizeState(site.httpsState) === "active").length ?? 0,
    [data],
  );

  if (loading) return <div className="empty-panel">{t("Loading security posture...", "Loading security posture...")}</div>;
  if (error) return <div className="inline-message inline-message--error">{error}</div>;
  if (!data) return <div className="inline-message inline-message--error">{t("Subscription security module not found.", "Subscription security module not found.")}</div>;

  return (
    <div className="al-module">
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2>{t("Security Ledger", "Security Ledger")}</h2>
        <button type="button" className="secondary-button" onClick={() => setRefreshTick((tick) => tick + 1)}>
          <RefreshCw size={16} />
          {t("Refresh", "Refresh")}
        </button>
      </section>

      <section className="al-metrics" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="al-metric-card">
          <div className="al-metric-card__header">
            <div className="al-metric-card__icon al-metric-card__icon--green"><ShieldCheck size={20} /></div>
            <span className="al-metric-card__badge al-metric-card__badge--green">{t("Healthy", "Healthy")}</span>
          </div>
          <p className="al-metric-card__label">{t("Healthy Sites", "Healthy Sites")}</p>
          <h2 className="al-metric-card__value">{healthyCount}</h2>
        </div>
        <div className="al-metric-card">
          <div className="al-metric-card__header">
            <div className="al-metric-card__icon al-metric-card__icon--amber"><AlertTriangle size={20} /></div>
          </div>
          <p className="al-metric-card__label">{t("Active Alerts", "Active Alerts")}</p>
          <h2 className="al-metric-card__value">{data.alerts.length}</h2>
        </div>
        <div className="al-metric-card">
          <div className="al-metric-card__header">
            <div className="al-metric-card__icon al-metric-card__icon--slate"><Shield size={20} /></div>
          </div>
          <p className="al-metric-card__label">{t("Critical Signals", "Critical Signals")}</p>
          <h2 className="al-metric-card__value">{criticalCount}</h2>
        </div>
      </section>

      {data.alerts.length > 0 ? (
        <section className="al-module-section">
          <div className="al-table-section__header">
            <h3>{t("Actionable Alerts", "Actionable Alerts")}</h3>
            <span className="al-table-section__view-link">{t("{count} current", "{count} current").replace("{count}", String(data.alerts.length))}</span>
          </div>
          <div className="al-module-list">
            {data.alerts.map((alert) => (
              <article className={`al-module-card al-module-card--${alert.severity}`} key={`${alert.type}-${alert.siteId}-${alert.detectedUtc}`}>
                <div className="al-module-card__main">
                  <div>
                    <p className="al-module-card__eyebrow">{t(alert.type, alert.type)} / {t(alert.severity, alert.severity)}</p>
                    <h3>{alert.siteName}</h3>
                    <p>{alert.message}</p>
                  </div>
                  <Link className="al-module-card__link" to={alert.href}>{t("Open", "Open")}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-panel">{t("No active security alerts for this subscription.", "No active security alerts for this subscription.")}</div>
      )}

      <section className="al-module-section">
        <div className="al-table-section__header">
          <h3>{t("Site Security State", "Site Security State")}</h3>
          <span className="al-table-section__view-link">{t("{count} sites", "{count} sites").replace("{count}", String(data.sites.length))}</span>
        </div>
        {data.sites.length === 0 ? (
          <div className="empty-panel">{t("No sites are attached to this subscription yet.", "No sites are attached to this subscription yet.")}</div>
        ) : (
          <div className="al-module-list">
            {data.sites.map((site) => (
              <article className="al-module-card" key={site.siteId}>
                <div className="al-module-card__main">
                  <div>
                    <p className="al-module-card__eyebrow">{site.domain}</p>
                    <h3>{site.siteName}</h3>
                    <p>{site.certificateSubject ?? t("No certificate subject reported yet.", "No certificate subject reported yet.")}</p>
                  </div>
                  <Link className="al-module-card__link" to={`/subscription/${data.subscription.id}/site/${site.siteId}/domains`}>
                    {t("Domains", "Domains")}
                  </Link>
                </div>
                <div className="al-module-card__grid">
                  <div><span>{t("Hostname", "Hostname")}</span><strong>{t(site.hostnameState, site.hostnameState)}</strong></div>
                  <div><span>{t("HTTPS", "HTTPS")}</span><strong>{t(site.httpsState, site.httpsState)}</strong></div>
                  <div><span>{t("HTTP binding", "HTTP binding")}</span><strong>{site.hasHttpBinding ? t("Detected", "Detected") : t("Missing", "Missing")}</strong></div>
                  <div><span>{t("HTTPS binding", "HTTPS binding")}</span><strong>{site.hasHttpsBinding ? t("Detected", "Detected") : t("Missing", "Missing")}</strong></div>
                  <div><span>{t("Certificate expiry", "Certificate expiry")}</span><strong>{formatDate(site.certificateExpiresUtc, t)}</strong></div>
                  <div><span>{t("Last scan", "Last scan")}</span><strong>{formatDate(site.lastScannedUtc, t)}</strong></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
