import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { driver, type DriveStep } from "driver.js";
import { useNavigate, useParams } from "react-router-dom";
import { Cloud, Plus, Database, HelpCircle, Server, Shield } from "lucide-react";
import { useLocalization } from "../lib/i18n";
import { getCustomerSession } from "../lib/customer-session";
import { formatRegionLabel } from "../lib/display";
import {
  changeSiteFtpPassword,
  createHostedDatabase,
  createSubscriptionSite,
  deleteHostedSite,
  downloadPublishProfile,
  getDeployLog,
  getEnvVars,
  saveEnvVars,
  setupWebhook,
  disableWebhook,
  getStackCatalog,
  getSubscriptionOverview,
  publishSite,
  saveGitConfig,
  triggerGitDeploy,
  updateSiteStack,
  type StackCatalogEntry,
  type SubscriptionOverviewResponse,
  type SubscriptionWebsite,
} from "../lib/customer-api";
import {
  NodeDeployGuide,
  SiteCard,
  StatBar,
  AlertsSection,
  SiteCreateModal,
  DatabaseCreateModal,
  FtpCredentialsModal,
  PublishDialog,
  isInFlightStatus,
  isHealthyStatus,
  getStatusLabel,
  getAvailableStacks,
} from "../components/overview";
import type { DisplayWebsite, DisplayDatabase } from "../components/overview";

export function SubscriptionOverviewPage() {
  const { t } = useLocalization();
  const { subId } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SubscriptionOverviewResponse | null>(null);
  const [sites, setSites] = useState<DisplayWebsite[]>([]);
  const [databases, setDatabases] = useState<DisplayDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Site creation
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [newSiteAlias, setNewSiteAlias] = useState("");
  const [isProvisioningSite, setIsProvisioningSite] = useState(false);
  const [siteProvisionError, setSiteProvisionError] = useState<string | null>(null);

  // Database creation
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [isDbProvisioning, setIsDbProvisioning] = useState(false);
  const [dbProvisionError, setDbProvisionError] = useState<string | null>(null);

  // Stack catalog
  const [stackCatalog, setStackCatalog] = useState<StackCatalogEntry[]>([]);

  // FTP
  const [ftpTarget, setFtpTarget] = useState<SubscriptionWebsite | null>(null);
  const [ftpPasswordVisible, setFtpPasswordVisible] = useState(false);
  const [ftpCopied, setFtpCopied] = useState<string | null>(null);
  const [ftpChangePwMode, setFtpChangePwMode] = useState(false);
  const [ftpNewPassword, setFtpNewPassword] = useState("");
  const [ftpConfirmPassword, setFtpConfirmPassword] = useState("");
  const [ftpChanging, setFtpChanging] = useState(false);
  const [ftpChangeError, setFtpChangeError] = useState<string | null>(null);
  const [ftpChangeSuccess, setFtpChangeSuccess] = useState<string | null>(null);

  // Publish
  const [publishTarget, setPublishTarget] = useState<SubscriptionWebsite | null>(null);

  useEffect(() => {
    const handler = () => setIsSiteModalOpen(true);
    window.addEventListener("al:open-add-site-modal", handler);
    return () => window.removeEventListener("al:open-add-site-modal", handler);
  }, []);

  useEffect(() => {
    let active = true;
    getStackCatalog()
      .then((response) => {
        if (active) setStackCatalog(response.stacks);
      })
      .catch(() => { /* non-fatal */ });
    return () => { active = false; };
  }, []);

  // Load overview
  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId) { setLoading(false); return; }

    let active = true;
    async function load() {
      try {
        if (!refreshTick) setLoading(true);
        setError(null);

        const nextOverview = await getSubscriptionOverview(session!, subId!);
        if (!active) return;

        // Merge optimistic sites
        const optimisticSites = sites.filter((site) => site.isOptimistic);
        const mergedSites: DisplayWebsite[] = [...nextOverview.websites];
        for (const optimisticSite of optimisticSites) {
          const matchIndex = mergedSites.findIndex((s) => s.domain === optimisticSite.domain);
          if (matchIndex >= 0) {
            const backendStatus = mergedSites[matchIndex].provisioningStatus;
            mergedSites[matchIndex] = {
              ...mergedSites[matchIndex],
              provisioningStatus: isInFlightStatus(backendStatus) ? "creating" : backendStatus,
              isOptimistic: isInFlightStatus(backendStatus),
            };
          } else {
            mergedSites.unshift(optimisticSite);
          }
        }

        const optimisticDbs = databases.filter((db) => db.isOptimistic);
        const mergedDbs: DisplayDatabase[] = [...nextOverview.databases];
        for (const optimisticDb of optimisticDbs) {
          const matchIndex = mergedDbs.findIndex((db) => db.databaseName === optimisticDb.databaseName);
          if (matchIndex >= 0) {
            const backendStatus = mergedDbs[matchIndex].provisioningStatus;
            mergedDbs[matchIndex] = {
              ...mergedDbs[matchIndex],
              provisioningStatus: isInFlightStatus(backendStatus) ? "creating" : backendStatus,
              isOptimistic: isInFlightStatus(backendStatus),
            };
          } else {
            mergedDbs.unshift(optimisticDb);
          }
        }

        setOverview(nextOverview);
        setSites(mergedSites);
        setDatabases(mergedDbs);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Failed to load subscription overview.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [subId, refreshTick]);

  // Auto-refresh when work is in flight
  const hasInFlightWork = useMemo(
    () => sites.some((site) => isInFlightStatus(site.provisioningStatus) || site.hasActivePublishJob || site.hasActiveRuntimeJob) ||
      databases.some((db) => isInFlightStatus(db.provisioningStatus)),
    [sites, databases],
  );

  useEffect(() => {
    if (!hasInFlightWork) return;
    const intervalId = window.setInterval(() => setRefreshTick((tick) => tick + 1), 3000);
    return () => window.clearInterval(intervalId);
  }, [hasInFlightWork]);

  // Keep the open publish dialog in sync with polled site data
  useEffect(() => {
    setPublishTarget((current) => {
      if (!current) return current;
      const latest = sites.find((s) => s.id === current.id);
      return latest ? { ...current, ...latest } : current;
    });
  }, [sites]);

  const availableStacks = useMemo(() => getAvailableStacks(stackCatalog), [stackCatalog]);
  const onlyOneStack = availableStacks.length === 1;

  // Driver.js tour
  const guideStorageKey = subId ? `ov-guide:v1:${subId}` : null;
  const startOverviewTour = useCallback(() => {
    const hasSites = sites.length > 0;
    const steps: DriveStep[] = [
      { element: ".ov-header__actions", popover: { title: "Create a website", description: "Click \"Add Website\" to create your first site. Give it a name and we'll provision it with a free subdomain automatically." } },
      { element: ".ov-stats", popover: { title: "Resource usage", description: "Track your websites, databases, storage, and bandwidth quotas at a glance." } },
    ];
    if (hasSites) {
      steps.push(
        { element: ".ov-site-card .ov-btn--primary", popover: { title: "Deploy your site", description: "Click the Deploy button to publish your code. You can upload files via the file manager or connect a Git repository." } },
        { element: ".ov-site-card .ov-icon-btn[title='Domains']", popover: { title: "Add a custom domain", description: "Click the globe icon to bind your own domain name (e.g. example.com). We'll guide you through the DNS setup." } },
      );
    }
    steps.push({
      element: ".ov-info-row",
      popover: {
        title: "Server & plan info", description: "View your server status, hosting plan details, and security configuration here.",
        onPopoverRender: (popover: { wrapper: HTMLElement }) => {
          const btn = document.createElement("button");
          btn.textContent = "Don't show again";
          btn.className = "driver-popover-dismiss-btn";
          btn.addEventListener("click", () => {
            if (guideStorageKey) window.localStorage.setItem(guideStorageKey, "dismissed");
            driverObj.destroy();
          });
          popover.wrapper.querySelector(".driver-popover-footer")?.appendChild(btn);
        },
      },
    });
    const driverObj = driver({ showProgress: true, animate: true, overlayColor: "rgba(0, 0, 0, 0.55)", steps });
    driverObj.drive();
  }, [guideStorageKey, sites.length]);

  useEffect(() => {
    if (!guideStorageKey || loading) return;
    const isDismissed = window.localStorage.getItem(guideStorageKey) === "dismissed";
    if (isDismissed) return;
    const timeout = window.setTimeout(() => startOverviewTour(), 500);
    return () => window.clearTimeout(timeout);
  }, [guideStorageKey, loading, startOverviewTour]);

  // ── Event handlers ──────────────────────────────────────────────

  const openSiteDetails = (siteId: string) => navigate(`/subscription/${subscription!.id}/site/${siteId}/settings`);
  const openSiteFiles = (siteId: string) => navigate(`/subscription/${subscription!.id}/files?siteId=${encodeURIComponent(siteId)}`);
  const openFtpCredentials = (site: SubscriptionWebsite) => setFtpTarget(site);
  const openPublishDialog = (site: SubscriptionWebsite) => {
    setPublishTarget(site);
  };

  const handleFtpCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFtpCopied(key);
      window.setTimeout(() => setFtpCopied((prev) => (prev === key ? null : prev)), 2000);
    } catch { /* clipboard not available */ }
  };

  const handleFtpPasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    const session = getCustomerSession();
    if (!ftpTarget || !session || !subId) return;
    setFtpChangeError(null);
    setFtpChangeSuccess(null);
    if (ftpNewPassword !== ftpConfirmPassword) { setFtpChangeError("Passwords do not match."); return; }
    if (ftpNewPassword.length < 12) { setFtpChangeError("Password must be at least 12 characters."); return; }
    setFtpChanging(true);
    try {
      const result = await changeSiteFtpPassword(session, subId, ftpTarget.id, { ftpPassword: ftpNewPassword });
      if (result.success) {
        setFtpChangeSuccess(result.message);
        setFtpNewPassword("");
        setFtpConfirmPassword("");
        setFtpChangePwMode(false);
        setFtpTarget((prev) => prev ? { ...prev, publish: prev.publish ? { ...prev.publish, ftpPassword: ftpNewPassword } : null } : null);
      } else { setFtpChangeError(result.message); }
    } catch (err) { setFtpChangeError(err instanceof Error ? err.message : "Failed to change FTP password."); }
    finally { setFtpChanging(false); }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    const session = getCustomerSession();
    if (!session) return;
    if (!window.confirm(`Confirm: Delete "${siteName}"?`)) return;
    try {
      await deleteHostedSite(session, siteId);
      setSites((current) => current.map((site) => site.id === siteId ? { ...site, provisioningStatus: "deleting" } : site));
      setRefreshTick((tick) => tick + 1);
    } catch (deleteError) { alert(deleteError instanceof Error ? deleteError.message : "Failed to delete site."); }
  };

  const handleCreateSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getCustomerSession();
    if (!session || !subId) return;
    setIsProvisioningSite(true);
    setSiteProvisionError(null);
    const requestedSiteName = newSiteAlias.trim() || "Project";
    const slug = requestedSiteName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
    const assignedDomain = `${slug}-${node?.nodeName ?? Math.random().toString(36).slice(2, 6)}.code0xff.shop`;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticSite: DisplayWebsite = {
      id: optimisticId, siteName: requestedSiteName, domain: assignedDomain, provisioningStatus: "creating",
      lastProvisionError: null, platformSummary: "Provisioning environment",
      publicIpAddress: node?.publicIpAddress ?? null, serverHost: node?.nodeName ?? null,
      isQuotaBlocked: false, iisSiteState: "pending", appPoolState: "pending",
      hasHttpBinding: false, hasHttpsBinding: false, createdUtc: new Date().toISOString(),
      stack: "static", stackVersion: null, runtimeStatus: null, runtimeMessage: null,
      runtimeReadyUtc: null, lastPublishedUtc: null, lastPublishStatus: null, lastPublishMessage: null,
      hasActivePublishJob: false, hasActiveRuntimeJob: false, publish: null, hostnames: null,
      gitRepoUrl: null, gitBranch: null, gitHasPat: false, autoDeployEnabled: false, hasWebhook: false, isOptimistic: true,
    };
    setSites((current) => [optimisticSite, ...current]);
    setIsSiteModalOpen(false);
    try {
      await createSubscriptionSite(session, subId, { siteName: requestedSiteName, domain: assignedDomain });
      setNewSiteAlias("");
      setRefreshTick((tick) => tick + 1);
    } catch (createError) {
      setSites((current) => current.filter((site) => site.id !== optimisticId));
      setSiteProvisionError(createError instanceof Error ? createError.message : "Failed to provision site.");
      setIsSiteModalOpen(true);
    } finally { setIsProvisioningSite(false); }
  };

  const handleCreateDatabase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getCustomerSession();
    const requestedAlias = newDbName.trim() || "main";
    if (!session || !subId) return;
    setIsDbProvisioning(true);
    setDbProvisionError(null);
    const optimisticId = `optimistic-db-${crypto.randomUUID()}`;
    const optimisticDb: DisplayDatabase = {
      id: optimisticId, subscriptionId: subId, databaseName: requestedAlias,
      dbUser: "Allocating...", dbPassword: undefined, databaseSpaceMb: 512,
      serverHost: "Waiting for node...", provisioningStatus: "creating",
      lastProvisionError: null, createdUtc: new Date().toISOString(),
      siteId: null, siteName: null, engine: "mysql", port: 0, isOptimistic: true,
    };
    setDatabases((current) => [optimisticDb, ...current]);
    setIsDbModalOpen(false);
    try {
      const result = await createHostedDatabase(session, subId, { databaseName: requestedAlias });
      if (result.database) {
        setDatabases((current) => current.map((db) => db.id === optimisticId ? { ...result.database!, provisioningStatus: "creating", isOptimistic: true } : db));
      }
      setNewDbName("");
      setRefreshTick((tick) => tick + 1);
    } catch (createError) {
      setDatabases((current) => current.filter((db) => db.id !== optimisticId));
      setDbProvisionError(createError instanceof Error ? createError.message : "Failed to provision database.");
      setIsDbModalOpen(true);
    } finally { setIsDbProvisioning(false); }
  };

  // Publish callbacks
  const handlePublishStackChange = useCallback((siteId: string, updates: Partial<SubscriptionWebsite>) => {
    setSites((current) => current.map((s) => s.id === siteId ? { ...s, ...updates } : s));
    setPublishTarget((current) => current?.id === siteId ? { ...current, ...updates } : current);
  }, []);

  const handleUpdateStack = useCallback(async (siteId: string, stack: string, version: string | null, startupCommand?: string | null) => {
    const session = getCustomerSession();
    if (!session || !subId) throw new Error("No session");
    return updateSiteStack(session, subId, siteId, { stack, version, startupCommand: startupCommand ?? undefined });
  }, [subId]);

  const handlePublish = useCallback(async (siteId: string, entryDll: string | null) => {
    const session = getCustomerSession();
    if (!session || !subId) throw new Error("No session");
    return publishSite(session, subId, siteId, { entryDll });
  }, [subId]);

  const handleDownloadProfile = useCallback(async (siteId: string) => {
    const session = getCustomerSession();
    if (!session || !subId) throw new Error("No session");
    return downloadPublishProfile(session, subId, siteId);
  }, [subId]);

  const handleSaveGitConfig = useCallback(async (_siteId: string, repoUrl: string, branch: string, pat: string | null) => {
    const session = getCustomerSession();
    if (!session || !subId) throw new Error("No session");
    return saveGitConfig(session, subId, _siteId, { repoUrl, branch, pat });
  }, [subId]);

  const handleGitDeploy = useCallback(async (siteId: string) => {
    const session = getCustomerSession();
    if (!session || !subId) throw new Error("No session");
    return triggerGitDeploy(session, subId, siteId);
  }, [subId]);

  const handleGetDeployLog = useCallback(async (siteId: string): Promise<{ success: boolean; data?: { logText: string | null; phase?: string | null; deploymentId?: string | null } | null }> => {
    const session = getCustomerSession();
    if (!session || !subId) return { success: false };
    try {
      const result = await getDeployLog(session, subId, siteId);
      if (!result.success || !result.data) return { success: result.success };
      return { success: true, data: { logText: result.data.logText ?? null, phase: result.data.phase ?? null, deploymentId: result.data.deploymentId ?? null } };
    } catch { return { success: false }; }
  }, [subId]);

  const handleGetEnvVars = useCallback(async (siteId: string) => {
    const session = getCustomerSession();
    if (!session || !subId) return { success: false };
    try { return await getEnvVars(session, subId, siteId); }
    catch { return { success: false }; }
  }, [subId]);

  const handleSaveEnvVars = useCallback(async (siteId: string, items: { name: string; value?: string | null }[]) => {
    const session = getCustomerSession();
    if (!session || !subId) return { success: false, message: "No session." };
    try { return await saveEnvVars(session, subId, siteId, items); }
    catch (e) { return { success: false, message: e instanceof Error ? e.message : "Save failed." }; }
  }, [subId]);

  const handleSetupWebhook = useCallback(async (siteId: string) => {
    const session = getCustomerSession();
    if (!session || !subId) return { success: false, message: "No session." };
    try { return await setupWebhook(session, subId, siteId); }
    catch (e) { return { success: false, message: e instanceof Error ? e.message : "Failed." }; }
  }, [subId]);

  const handleDisableWebhook = useCallback(async (siteId: string) => {
    const session = getCustomerSession();
    if (!session || !subId) return { success: false, message: "No session." };
    try { return await disableWebhook(session, subId, siteId); }
    catch (e) { return { success: false, message: e instanceof Error ? e.message : "Failed." }; }
  }, [subId]);

  // ── Render ──────────────────────────────────────────────────────
  if (loading) return <div className="empty-panel">Loading subscription data...</div>;
  if (error) return <div className="inline-message inline-message--error">{error}</div>;
  if (!overview) return <div className="inline-message inline-message--error">Subscription not found.</div>;

  const { subscription, node, security } = overview;
  const regionLabel = formatRegionLabel(subscription.regionSlug);
  const nodeLabel = node?.nodeName ?? "No active node assigned";
  const uptime = node?.uptimePercent == null ? getStatusLabel(node?.status ?? "unknown") : `${node.uptimePercent.toFixed(2)}%`;
  const serverStatus = node?.status?.toLowerCase() === "online" || node?.status?.toLowerCase() === "active" ? "online" : node ? "degraded" : "offline";

  return (
    <>
      {/* Header */}
      <section className="ov-header">
        <div className="ov-header__left">
          <div className="ov-header__icon"><Cloud size={22} /></div>
          <div>
            <h1 className="ov-header__name">{subscription.name}</h1>
            <div className="ov-header__meta">
              <span className="ov-header__plan-badge">{subscription.planSlug.toUpperCase()}</span>
              <span className="ov-header__region">{t(regionLabel, regionLabel)}</span>
              <span className={`ov-header__status ov-header__status--${serverStatus}`}>
                <span className="ov-header__status-dot" />
                {serverStatus === "online" ? t("Server Online", "Server Online") : serverStatus === "degraded" ? t("Degraded", "Degraded") : t("Offline", "Offline")}
              </span>
            </div>
          </div>
        </div>
        <div className="ov-header__actions">
          <button type="button" className="ov-btn ov-btn--outline" onClick={() => setIsSiteModalOpen(true)}>
            <Plus size={15} />{t("Add Website", "Add Website")}
          </button>
          <button type="button" className="ov-btn ov-btn--outline" onClick={() => setIsDbModalOpen(true)}>
            <Database size={15} />{t("Add Database", "Add Database")}
          </button>
          <button type="button" className="ov-btn ov-btn--ghost" onClick={startOverviewTour} title="Guided tour">
            <HelpCircle size={15} />
          </button>
        </div>
      </section>

      {/* Stats */}
      <StatBar overview={overview} />

      {/* In-flight message */}
      {hasInFlightWork && (
        <div className="inline-message">
          {t("Infrastructure updates are in progress. This page will refresh automatically.", "Infrastructure updates are in progress. This page will refresh automatically.")}
        </div>
      )}

      {/* Websites section */}
      <section className="ov-section">
        <div className="ov-section__header">
          <h3 className="ov-section__title">{t("Websites", "Websites")}</h3>
        </div>
        {sites.length === 0 ? (
          <div className="ov-empty">
            <Cloud size={32} strokeWidth={1.5} />
            <p>{t("No websites yet", "No websites yet")}</p>
            <button type="button" className="ov-btn ov-btn--primary ov-btn--sm" onClick={() => setIsSiteModalOpen(true)}>
              <Plus size={14} /> {t("Create your first website", "Create your first website")}
            </button>
          </div>
        ) : (
          <div className="ov-sites">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                subId={subId}
                stackCatalog={stackCatalog}
                onOpenDetails={openSiteDetails}
                onOpenFiles={openSiteFiles}
                onOpenFtp={openFtpCredentials}
                onOpenPublish={openPublishDialog}
                onDelete={handleDeleteSite}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick info cards */}
      <section className="ov-info-row">
        <div className="ov-info-card">
          <div className="ov-info-card__icon"><Server size={18} /></div>
          <div className="ov-info-card__body">
            <span className="ov-info-card__label">{t("Server", "Server")}</span>
            <strong className="ov-info-card__value">{t(regionLabel, regionLabel)}</strong>
          </div>
          <span className={`ov-info-card__badge ov-info-card__badge--${serverStatus}`}>
            {serverStatus === "online" ? t("Healthy", "Healthy") : serverStatus === "degraded" ? t("Degraded", "Degraded") : t("Offline", "Offline")}
          </span>
        </div>
        <div className="ov-info-card">
          <div className="ov-info-card__icon"><Shield size={18} /></div>
          <div className="ov-info-card__body">
            <span className="ov-info-card__label">{t("Security", "Security")}</span>
            <strong className="ov-info-card__value">
              {security.alerts.length === 0 ? t("All clear", "All clear") : `${security.alerts.length} ${security.alerts.length > 1 ? t("alerts", "alerts") : t("alert", "alert")}`}
            </strong>
          </div>
          <span className={`ov-info-card__badge ${security.alerts.length > 0 ? "ov-info-card__badge--degraded" : "ov-info-card__badge--online"}`}>
            {security.alerts.length === 0 ? t("OK", "OK") : t("Action needed", "Action needed")}
          </span>
        </div>
      </section>

      {/* Alerts */}
      <AlertsSection overview={overview} />

      {/* Modals */}
      <SiteCreateModal
        isOpen={isSiteModalOpen} onClose={() => setIsSiteModalOpen(false)}
        onSubmit={handleCreateSite} alias={newSiteAlias} onAliasChange={setNewSiteAlias}
        isProvisioning={isProvisioningSite} error={siteProvisionError} subscription={subscription}
      />
      <DatabaseCreateModal
        isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)}
        onSubmit={handleCreateDatabase} name={newDbName} onNameChange={setNewDbName}
        isProvisioning={isDbProvisioning} error={dbProvisionError}
      />

      {/* FTP Credentials - kept inline due to tight state coupling */}
      {ftpTarget?.publish ? (
        <FtpCredentialsModal
          site={ftpTarget}
          onClose={() => setFtpTarget(null)}
          onCopy={handleFtpCopy}
          onChangePassword={handleFtpPasswordChange}
        />
      ) : null}

      {/* Publish Dialog */}
      {publishTarget && (
        <PublishDialog
          site={publishTarget}
          subscriptionId={subId!}
          stackCatalog={stackCatalog}
          availableStacks={availableStacks}
          onlyOneStack={onlyOneStack}
          onClose={() => setPublishTarget(null)}
          onStackChange={handlePublishStackChange}
          onUpdateStack={handleUpdateStack}
          onPublish={handlePublish}
          onDownloadProfile={handleDownloadProfile}
          onSaveGitConfig={handleSaveGitConfig}
          onGitDeploy={handleGitDeploy}
          onGetDeployLog={handleGetDeployLog}
          onGetEnvVars={handleGetEnvVars}
          onSaveEnvVars={handleSaveEnvVars}
          onSetupWebhook={handleSetupWebhook}
          onDisableWebhook={handleDisableWebhook}
        />
      )}
    </>
  );
}
