import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalization } from "../lib/i18n";
import { Logo } from "../components/Logo";

type ServiceStatus = "operational" | "degraded" | "outage";

interface Service {
  nameKey: string;
  status: ServiceStatus;
}

interface Incident {
  titleKey: string;
  date: string;
  descKey: string;
  resolved: boolean;
}

const services: Service[] = [
  { nameKey: "Website & Control Panel", status: "operational" },
  { nameKey: "API Services", status: "operational" },
  { nameKey: "Git Deployment", status: "operational" },
  { nameKey: "Database Hosting", status: "operational" },
  { nameKey: "VPS Instances", status: "operational" },
  { nameKey: "Domain Registration & DNS", status: "operational" },
  { nameKey: "Web Deploy (FTP/WebDeploy)", status: "operational" },
  { nameKey: "CDN & SSL", status: "operational" },
];

const incidents: Incident[] = [
  {
    titleKey: "Scheduled Maintenance — Database Cluster Upgrade",
    date: "July 20, 2026 — 02:00 UTC",
    descKey: "We will be upgrading our database clusters to improve performance. Expected downtime: ~30 minutes.",
    resolved: false,
  },
];

const statusConfig: Record<ServiceStatus, { icon: typeof CheckCircle2; labelKey: string }> = {
  operational: { icon: CheckCircle2, labelKey: "Operational" },
  degraded: { icon: AlertTriangle, labelKey: "Degraded Performance" },
  outage: { icon: XCircle, labelKey: "Major Outage" },
};

export function StatusPage() {
  const { t } = useLocalization();

  const allOperational = services.every((s) => s.status === "operational");
  const overallStatus: ServiceStatus = allOperational ? "operational" : "degraded";
  const OverallIcon = statusConfig[overallStatus].icon;

  return (
    <div className="status-page">
      <header className="status-page__header">
        <div className="status-page__header-inner">
          <Logo />
          <Link to="/landing" className="lp-nav__link">{t("Back to Home", "Back to Home")}</Link>
        </div>
      </header>

      <div className="status-page__body">
        {/* Overall status */}
        <motion.div
          className="status-page__overall"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={`status-page__overall-dot status-page__overall-dot--${overallStatus}`} />
          <div className="status-page__overall-text">
            <h2>
              {allOperational
                ? t("All Systems Operational", "All Systems Operational")
                : t("Some Systems Experiencing Issues", "Some Systems Experiencing Issues")}
            </h2>
            <p>{new Date().toUTCString()}</p>
          </div>
        </motion.div>

        {/* Services */}
        <motion.h3
          className="status-page__section-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {t("Services", "Services")}
        </motion.h3>
        <div className="status-page__services">
          {services.map((service, i) => {
            const cfg = statusConfig[service.status];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={service.nameKey}
                className="status-page__service"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <span className="status-page__service-name">
                  <Icon size={16} className={`status-page__service-dot--${service.status}`} />
                  {t(service.nameKey, service.nameKey)}
                </span>
                <span className={`status-page__service-status status-page__service-status--${service.status}`}>
                  {t(cfg.labelKey, cfg.labelKey)}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Incidents */}
        <h3 className="status-page__section-title">
          {t("Recent Incidents", "Recent Incidents")}
        </h3>
        {incidents.length > 0 ? (
          <div className="status-page__incidents">
            {incidents.map((incident, i) => (
              <motion.div
                key={incident.titleKey}
                className={`status-page__incident${incident.resolved ? " status-page__incident--resolved" : ""}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
              >
                <h4 className="status-page__incident-title">
                  {incident.resolved ? "✅ " : "⚠️ "}
                  {t(incident.titleKey, incident.titleKey)}
                </h4>
                <div className="status-page__incident-date">{incident.date}</div>
                <p className="status-page__incident-desc">
                  {t(incident.descKey, incident.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="status-page__empty">
            {t("No recent incidents", "No recent incidents")}
          </div>
        )}
      </div>

      <div className="status-page__footer">
        <Link to="/landing">{t("Vibe Hosting", "Vibe Hosting")}</Link> &mdash;{" "}
        {t("Status page updates automatically.", "Status page updates automatically.")}
      </div>
    </div>
  );
}
