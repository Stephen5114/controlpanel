import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { deleteHostedSite, getSubscriptionSites, type HostedSite } from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { CheckCircle2, Copy, ExternalLink, Server, Trash2, UploadCloud } from "lucide-react";
import { formatRegionLabel } from "../lib/display";
import { getActiveLocale, useLocalization } from "../lib/i18n";

function getVisitHostname(site: HostedSite) {
  const sortedHostnames = [...site.hostnames].sort((left, right) => {
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    return left.hostname.localeCompare(right.hostname);
  });

  const readyPrimary = sortedHostnames.find((hostname) => hostname.isDefault && hostname.bindingStatus.toLowerCase() === "active");
  const readyFallback = sortedHostnames.find((hostname) => hostname.isSystemBinding && hostname.bindingStatus.toLowerCase() === "active");
  const readyAny = sortedHostnames.find((hostname) => hostname.bindingStatus.toLowerCase() === "active");

  return readyPrimary?.hostname ?? readyFallback?.hostname ?? readyAny?.hostname ?? site.domain;
}

function getPrimaryHostname(site: HostedSite) {
  return [...site.hostnames]
    .sort((left, right) => {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }

      return left.hostname.localeCompare(right.hostname);
    })[0]?.hostname ?? site.domain;
}

function CopyCredentialButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const { t } = useLocalization();
  return (
    <button type="button" className="text-button ss-copy-btn" onClick={onCopy}>
      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
      {copied ? t("Copied", "Copied") : t("Copy", "Copy")}
    </button>
  );
}

export function SiteSettingsPage() {
  const { t } = useLocalization();
  const { subId, siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<HostedSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId || !siteId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadSite() {
      try {
        setLoading(true);
        setError(null);
        const sites = await getSubscriptionSites(session!, subId!);
        if (!active) return;

        const found = sites.find((item) => item.id === siteId) ?? null;
        if (!found) {
          setError(t("Site not found or you do not have permission to view it within this subscription.", "Site not found or you do not have permission to view it within this subscription."));
          return;
        }

        setSite(found);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : t("Failed to load site settings.", "Failed to load site settings."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSite();
    return () => {
      active = false;
    };
  }, [subId, siteId, t]);

  useEffect(() => {
    if (!copiedKey) return;

    const timeout = window.setTimeout(() => {
      setCopiedKey(null);
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [copiedKey]);

  async function handleCopy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setCopiedKey(null);
    }
  }

  const handleDelete = async () => {
    const session = getCustomerSession();
    if (!session) return;
    if (!confirm(t("Are you absolutely sure you want to delete this project? This will permanently delete the application files and DNS records.", "Are you absolutely sure you want to delete this project? This will permanently delete the application files and DNS records."))) return;
    setIsDeleting(true);
    try {
      await deleteHostedSite(session, siteId!);
      navigate(`/subscription/${subId}/overview`);
    } catch (e) {
      alert(t("Failed to delete site.", "Failed to delete site."));
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="empty-panel">{t("Loading site settings...", "Loading site settings...")}</div>;
  }

  if (error || !site) {
    return <div className="inline-message inline-message--error">{error ?? t("Site not found.", "Site not found.")}</div>;
  }

  const visitHostname = getVisitHostname(site);
  const primaryHostname = getPrimaryHostname(site);

  return (
    <div className="stack">
      <section className="page-hero ss-hero">
        <div>
          <p className="eyebrow">{formatRegionLabel(site.regionSlug)}</p>
          <h1>{site.siteName}</h1>
          <p className="page-copy ss-hero-copy">
            <span className={`badge${site.provisioningStatus.toLowerCase() === "active" ? " badge--success" : ""}`}>
              {t(site.provisioningStatus, site.provisioningStatus)}
            </span>
            <span>{primaryHostname}</span>
            <span>{t("Created {date}", "Created {date}").replace("{date}", new Date(site.createdUtc).toLocaleDateString(getActiveLocale()))}</span>
          </p>
        </div>
        <a href={`http://${visitHostname}`} target="_blank" rel="noreferrer" className="secondary-button ss-visit-btn">
          {t("Visit Site", "Visit Site")}
          <ExternalLink size={16} />
        </a>
      </section>

      <div className="two-up-grid">
        <div className="card stack-sm">
          <div className="section-head">
            <h3 className="ss-head-icon"><Server size={18} /> {t("Server Details", "Server Details")}</h3>
          </div>
          <div className="detail-grid">
            <div>
              <dt>{t("Environment", "Environment")}</dt>
              <dd>{t("Web Application Container", "Web Application Container")}</dd>
            </div>
            <div>
              <dt>{t("Region", "Region")}</dt>
              <dd>{site.regionSlug}</dd>
            </div>
            <div>
              <dt>{t("Disk Limit", "Disk Limit")}</dt>
              <dd>{site.diskLimitMb.toLocaleString(getActiveLocale())} {t("MB", "MB")}</dd>
            </div>
            <div>
              <dt>{t("File Limit", "File Limit")}</dt>
              <dd>{t("{count} files", "{count} files").replace("{count}", site.fileLimitCount.toLocaleString(getActiveLocale()))}</dd>
            </div>
          </div>
        </div>

        <div className="card stack-sm">
          <div className="section-head">
            <h3 className="ss-head-icon"><UploadCloud size={18} /> {t("Publishing Credentials", "Publishing Credentials")}</h3>
          </div>
          <div className="detail-grid">
            <div className="form-grid__wide">
              <dt>{t("Web Deploy Endpoint", "Web Deploy Endpoint")}</dt>
              <dd className="ss-dd-mono" style={{ fontSize: "0.85rem" }}>{site.publish.webDeployEndpoint}</dd>
            </div>
            <div>
              <dt>{t("Deploy Username", "Deploy Username")}</dt>
              <dd className="ss-dd-mono">{site.publish.deployUser}</dd>
            </div>
            <div>
              <dt>{t("Deploy Password", "Deploy Password")}</dt>
              <dd className="ss-dd-mono-row">
                <span>************</span>
                <CopyCredentialButton
                  copied={copiedKey === "deploy-password"}
                  onCopy={() => void handleCopy(site.publish.deployPassword, "deploy-password")}
                />
              </dd>
            </div>
            <div>
              <dt>{t("FTP Host", "FTP Host")}</dt>
              <dd className="ss-dd-wrap">{site.publish.ftpHost}</dd>
            </div>
            <div>
              <dt>{t("FTP Username", "FTP Username")}</dt>
              <dd className="ss-dd-mono">{site.publish.ftpUser}</dd>
            </div>
            <div>
              <dt>{t("FTP Password", "FTP Password")}</dt>
              <dd className="ss-dd-mono-row">
                <span>************</span>
                <CopyCredentialButton
                  copied={copiedKey === "ftp-password"}
                  onCopy={() => void handleCopy(site.publish.ftpPassword, "ftp-password")}
                />
              </dd>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card stack-sm ss-danger-zone">
        <h3 className="ss-danger-title">
          <Trash2 size={20} /> {t("Danger Zone", "Danger Zone")}
        </h3>
        <p className="muted">{t("Permanently remove this project and all of its resources from your subscription. This action cannot be undone, and the subdomain will be released immediately.", "Permanently remove this project and all of its resources from your subscription. This action cannot be undone, and the subdomain will be released immediately.")}</p>
        <div className="ss-danger-btn-wrap">
          <button
            className="primary-button ss-danger-btn"
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? t("Deleting Infrastructure...", "Deleting Infrastructure...") : t("Delete Project", "Delete Project")}
          </button>
        </div>
      </div>
    </div>
  );
}
