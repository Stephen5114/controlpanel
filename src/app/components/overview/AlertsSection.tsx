import { useLocalization } from "../../lib/i18n";
import type { SubscriptionOverviewResponse } from "../../lib/customer-api";
import { getAlertIcon } from "./utils";

interface AlertsSectionProps {
  overview: SubscriptionOverviewResponse;
}

export function AlertsSection({ overview }: AlertsSectionProps) {
  const { t } = useLocalization();
  const { security } = overview;

  if (security.alerts.length === 0) return null;

  return (
    <section className="ov-section">
      <div className="ov-section__header">
        <h3 className="ov-section__title">{t("Alerts", "Alerts")}</h3>
        <span className="ov-alert-count">{security.alerts.length}</span>
      </div>
      {security.alerts.slice(0, 5).map((alert) => {
        const Icon = getAlertIcon(alert.severity);
        return (
          <div className="ov-alert-item" key={`${alert.type}-${alert.siteId}-${alert.detectedUtc}`}>
            <div className={`ov-alert-item__icon ${alert.severity === "critical" ? "ov-alert-item__icon--red" : "ov-alert-item__icon--amber"}`}>
              <Icon size={14} />
            </div>
            <div>
              <div className="ov-alert-item__title">{alert.siteName || t("System Alert", "System Alert")}</div>
              <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>{alert.message}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
