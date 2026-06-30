import { Link } from "react-router-dom";
import { Loader2, Rocket, Globe, ExternalLink, FolderOpen, Key, Settings, Trash2 } from "lucide-react";
import { useLocalization } from "../../lib/i18n";
import type { SubscriptionWebsite, StackCatalogEntry } from "../../lib/customer-api";
import type { DisplayWebsite } from "./utils";
import { getStackLabel, isInFlightStatus, isHealthyStatus, getStatusLabel, isSiteStackConfigured } from "./utils";

interface SiteCardProps {
  site: DisplayWebsite;
  subId: string | undefined;
  stackCatalog: StackCatalogEntry[];
  onOpenDetails: (siteId: string) => void;
  onOpenFiles: (siteId: string) => void;
  onOpenFtp: (site: SubscriptionWebsite) => void;
  onOpenPublish: (site: SubscriptionWebsite) => void;
  onDelete: (siteId: string, siteName: string) => void;
}

export function SiteCard({
  site,
  subId,
  stackCatalog,
  onOpenDetails,
  onOpenFiles,
  onOpenFtp,
  onOpenPublish,
  onDelete,
}: SiteCardProps) {
  const { t } = useLocalization();
  const isActive = isHealthyStatus(site.provisioningStatus);
  const statusLabel = getStatusLabel(site.provisioningStatus);
  const configured = isSiteStackConfigured(site);
  const publishDisabled = Boolean(site.isOptimistic) || site.hasActivePublishJob || site.hasActiveRuntimeJob || isInFlightStatus(site.provisioningStatus);

  return (
    <div key={site.id} className="ov-site-card" onClick={() => onOpenDetails(site.id)}>
      <div className="ov-site-card__main">
        <div className="ov-site-card__icon"><Globe size={18} /></div>
        <div className="ov-site-card__info">
          <strong className="ov-site-card__name">{site.siteName || site.domain.split(".")[0]}</strong>
          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noreferrer"
            className="ov-site-card__domain"
            onClick={(e) => e.stopPropagation()}
          >
            {site.domain} <ExternalLink size={11} />
          </a>
          {(() => {
            const customDomains = (site.hostnames ?? []).filter((h: { isSystemBinding: boolean; isDefault: boolean }) => !h.isSystemBinding && !h.isDefault);
            if (customDomains.length === 0) return null;
            const MAX_SHOW = 3;
            const visible = customDomains.slice(0, MAX_SHOW);
            const remaining = customDomains.length - MAX_SHOW;
            return (
              <div className="ov-site-card__bindings" onClick={(e) => e.stopPropagation()}>
                {visible.map((h: { hostname: string }) => (
                  <a key={h.hostname} href={`https://${h.hostname}`} target="_blank" rel="noreferrer" className="ov-site-card__binding-tag">
                    {h.hostname}
                  </a>
                ))}
                {remaining > 0 && (
                  <Link to={`/subscription/${subId}/site/${site.id}/domains`} className="ov-site-card__binding-more">
                    {t("+{count} more", "+{count} more").replace("{count}", remaining.toString())}
                  </Link>
                )}
              </div>
            );
          })()}
        </div>
        <div className="ov-site-card__status-group">
          <span className={`ov-site-card__status ${isActive ? "ov-site-card__status--active" : "ov-site-card__status--warning"}`}>
            <span className="ov-site-card__status-dot" />
            {t(statusLabel, statusLabel)}
          </span>
          <span className={configured ? "ov-site-card__stack ov-site-card__stack--configured" : "ov-site-card__stack"}>
            {t(getStackLabel(site, stackCatalog), getStackLabel(site, stackCatalog))}
          </span>
        </div>
      </div>
      <div className="ov-site-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ov-btn ov-btn--primary ov-btn--sm"
          onClick={() => onOpenPublish(site)}
          disabled={publishDisabled}
        >
          {(site.hasActivePublishJob || site.hasActiveRuntimeJob) ? (
            <Loader2 size={13} className="al-spin" />
          ) : (
            <Rocket size={13} />
          )}
          {site.hasActivePublishJob ? t("Publishing...", "Publishing...") : site.hasActiveRuntimeJob ? t("Preparing...", "Preparing...") : t("Deploy", "Deploy")}
        </button>
        <Link
          to={`/subscription/${subId}/site/${site.id}/domains`}
          className="ov-icon-btn" title={t("Domains", "Domains")}
        ><Globe size={15} /></Link>
        <button type="button" className="ov-icon-btn" title={t("Files", "Files")}
          onClick={() => onOpenFiles(site.id)} disabled={Boolean(site.isOptimistic)}
        ><FolderOpen size={15} /></button>
        <button type="button" className="ov-icon-btn" title={t("FTP Credentials", "FTP Credentials")}
          onClick={() => onOpenFtp(site)}
          disabled={Boolean(site.isOptimistic) || !site.publish}
        ><Key size={15} /></button>
        <button type="button" className="ov-icon-btn" title={t("Settings", "Settings")}
          onClick={() => onOpenDetails(site.id)}
        ><Settings size={15} /></button>
        <button type="button" className="ov-icon-btn ov-icon-btn--danger" title={t("Delete", "Delete")}
          onClick={() => void onDelete(site.id, site.siteName)}
          disabled={Boolean(site.isOptimistic)}
        ><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
