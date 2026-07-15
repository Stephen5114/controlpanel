import { useCallback, useState, useEffect, useRef } from "react";
import {
  Loader2, CheckCircle2, RefreshCw, Rocket, X, Download,
  Terminal, Cpu, Lock, Globe, Zap, Copy, Check, Github, ChevronDown, Search,
  FileCode2, Braces, Coffee,
} from "lucide-react";
import type { StackCatalogEntry, SubscriptionWebsite, GitHubRepo, GitHubBranch } from "../../lib/customer-api";
import { getGitHubConnection, disconnectGitHub, getGitHubOAuthUrl, listGitHubRepos, listGitHubBranches } from "../../lib/customer-api";
import { getCustomerSession } from "../../lib/customer-session";
import { useLocalization } from "../../lib/i18n";
import { NodeDeployGuide } from "./NodeDeployGuide";
import { EnvVarsEditor } from "./EnvVarsEditor";
import { getStackLabel, isSiteStackConfigured, guessEntryDll, canPublishSite, formatDateTime } from "./utils";

interface PublishDialogProps {
  site: SubscriptionWebsite;
  subscriptionId: string;
  stackCatalog: StackCatalogEntry[];
  availableStacks: StackCatalogEntry[];
  onlyOneStack: boolean;
  onClose: () => void;
  onStackChange: (siteId: string, updates: Partial<SubscriptionWebsite>) => void;
  onUpdateStack: (siteId: string, stack: string, version: string | null, startupCommand?: string | null) => Promise<{ success: boolean; message: string; data?: any }>;
  onPublish: (siteId: string, entryDll: string | null) => Promise<{ success: boolean; message: string; data?: any }>;
  onDownloadProfile: (siteId: string) => Promise<{ fileName: string; blob: Blob }>;
  onSaveGitConfig: (siteId: string, repoUrl: string, branch: string, pat: string | null) => Promise<{ success: boolean; message: string }>;
  onGitDeploy: (siteId: string) => Promise<{ success: boolean; message: string }>;
  onGetDeployLog: (siteId: string) => Promise<{ success: boolean; data?: { logText: string | null; phase?: string | null; deploymentId?: string | null } | null }>;
  onGetEnvVars: (siteId: string) => Promise<{ success: boolean; data?: { name: string; hasValue: boolean }[] }>;
  onSaveEnvVars: (siteId: string, items: { name: string; value?: string | null }[]) => Promise<{ success: boolean; message: string; requiresRedeploy?: boolean }>;
  onSetupWebhook: (siteId: string) => Promise<{ success: boolean; message: string; data?: { webhookUrl: string; secret: string } | null }>;
  onDisableWebhook: (siteId: string) => Promise<{ success: boolean; message: string }>;
}

const PHASE_PROGRESS: Record<string, number> = {
  queued: 5,
  cloning: 20,
  installing: 40,
  building: 60,
  activating: 80,
  health_check: 90,
  succeeded: 100,
  failed: 0,
  rolled_back: 0,
};

function phaseToProgress(phase: string | null): number {
  if (!phase) return 5;
  return PHASE_PROGRESS[phase] ?? 5;
}

export function PublishDialog({
  site, subscriptionId, stackCatalog, availableStacks, onlyOneStack,
  onClose, onStackChange, onUpdateStack, onPublish,
  onDownloadProfile, onSaveGitConfig, onGitDeploy, onGetDeployLog,
  onGetEnvVars, onSaveEnvVars, onSetupWebhook, onDisableWebhook,
}: PublishDialogProps) {
  const { t } = useLocalization();
  const [phase, setPhase] = useState<"select-stack" | "publish">(
    isSiteStackConfigured(site) || onlyOneStack ? "publish" : "select-stack",
  );
  const [stackChoice, setStackChoice] = useState(
    isSiteStackConfigured(site) ? site.stack : (availableStacks[0]?.slug ?? "dotnet"),
  );
  const [versionChoice, setVersionChoice] = useState(() => {
    if (isSiteStackConfigured(site) && site.stackVersion) return site.stackVersion;
    const entry = stackCatalog.find((s) => s.slug === (isSiteStackConfigured(site) ? site.stack : availableStacks[0]?.slug));
    return entry?.versions.find((v) => v.isDefault)?.value ?? entry?.versions[0]?.value ?? "10.0";
  });
  const [entryDllInput, setEntryDllInput] = useState("");
  const [startupCommandInput, setStartupCommandInput] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishInfo, setPublishInfo] = useState<string | null>(null);
  const [isSubmittingStack, setIsSubmittingStack] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);
  const [deployMode, setDeployMode] = useState<"git" | "ftp">("git");
  const [gitRepoUrl, setGitRepoUrl] = useState(site.gitRepoUrl ?? "");
  const [gitBranch, setGitBranch] = useState(site.gitBranch ?? "main");
  const [gitPat, setGitPat] = useState("");
  const [isSavingGitConfig, setIsSavingGitConfig] = useState(false);
  const [gitConfigError, setGitConfigError] = useState<string | null>(null);
  const [gitConfigSaved, setGitConfigSaved] = useState(false);
  const [deployLog, setDeployLog] = useState<string | null>(null);
  const [deployPhase, setDeployPhase] = useState<string | null>(null);
  const [isDeployingFromGit, setIsDeployingFromGit] = useState(false);
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(site.autoDeployEnabled);
  const [isTogglingWebhook, setIsTogglingWebhook] = useState(false);
  const [webhookSetup, setWebhookSetup] = useState<{ webhookUrl: string; secret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "secret" | null>(null);

  // GitHub OAuth state
  const [ghConnected, setGhConnected] = useState<boolean | null>(null);
  const [ghLogin, setGhLogin] = useState<string | null>(null);
  const [ghConnecting, setGhConnecting] = useState(false);
  const [ghRepos, setGhRepos] = useState<GitHubRepo[] | null>(null);
  const [ghReposLoading, setGhReposLoading] = useState(false);
  const [ghRepoSearch, setGhRepoSearch] = useState("");
  const [ghSelectedRepo, setGhSelectedRepo] = useState<GitHubRepo | null>(null);
  const [ghBranches, setGhBranches] = useState<GitHubBranch[]>([]);
  const [ghBranchesLoading, setGhBranchesLoading] = useState(false);
  const [ghRepoOpen, setGhRepoOpen] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Load existing deploy state immediately when dialog opens during an active job
  useEffect(() => {
    if (!site.hasActivePublishJob) return;
    onGetDeployLog(site.id).then((result) => {
      if (!result.success || !result.data) return;
      if (result.data.logText) setDeployLog(result.data.logText);
      if (result.data.phase) setDeployPhase(result.data.phase);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll deploy log while publish job is active
  useEffect(() => {
    if (!site.hasActivePublishJob) return;
    const intervalId = window.setInterval(async () => {
      try {
        const result = await onGetDeployLog(site.id);
        if (result.success && result.data) {
          if (result.data.logText) setDeployLog(result.data.logText);
          if (result.data.phase) setDeployPhase(result.data.phase);
        }
      } catch { /* swallow */ }
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [site.hasActivePublishJob, site.id, onGetDeployLog]);

  const handleStackChoiceChange = useCallback((slug: string) => {
    setStackChoice(slug);
    const entry = stackCatalog.find((s) => s.slug === slug);
    if (entry) {
      const defaultVersion = entry.versions.find((v) => v.isDefault)?.value ?? entry.versions[0]?.value ?? "";
      setVersionChoice(defaultVersion);
    }
  }, [stackCatalog]);

  const handleConfirmStack = async () => {
    const chosenStack = stackCatalog.find((s) => s.slug === stackChoice);
    if (chosenStack && chosenStack.status !== "available") {
      setPublishError(`${chosenStack.name} is not yet available. Please pick another stack.`);
      return;
    }
    setIsSubmittingStack(true);
    setPublishError(null);
    setPublishInfo(null);
    try {
      const response = await onUpdateStack(site.id, stackChoice, versionChoice || null);
      if (!response.success) {
        setPublishError(response.message || "Failed to configure runtime.");
        return;
      }
      onStackChange(site.id, {
        stack: response.data?.stack ?? stackChoice,
        stackVersion: response.data?.stackVersion ?? versionChoice,
        runtimeStatus: response.data?.runtimeStatus ?? site.runtimeStatus,
        runtimeMessage: response.data?.runtimeMessage ?? site.runtimeMessage,
        hasActiveRuntimeJob: response.data?.runtimeJobQueued ?? site.hasActiveRuntimeJob,
      });
      setPublishInfo(response.message || "Runtime configuration saved.");
      setPhase("publish");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to configure runtime.");
    } finally {
      setIsSubmittingStack(false);
    }
  };

  const handleDownloadPublishProfile = async () => {
    setIsDownloadingProfile(true);
    setPublishError(null);
    try {
      const { fileName, blob } = await onDownloadProfile(site.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fallbackBase = (site.siteName || site.domain.split(".")[0] || "site").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const hasValidName = fileName && fileName !== "download" && /\.PublishSettings$/i.test(fileName);
      link.download = hasValidName ? fileName : `${fallbackBase || "site"}.PublishSettings`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPublishInfo("Publish profile downloaded. Import it in Visual Studio 2022 (Publish → Import Profile).");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to download publish profile.");
    } finally {
      setIsDownloadingProfile(false);
    }
  };

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    setPublishInfo(null);
    try {
      const effectiveStack = isSiteStackConfigured(site) ? site.stack : stackChoice;
      const needsStackConfig = !isSiteStackConfigured(site);
      const stackTakesStartupCommand = ["node", "python", "springboot"].includes(effectiveStack);
      const startupChanged = stackTakesStartupCommand && startupCommandInput.trim();

      if (needsStackConfig || startupChanged) {
        const stackResponse = await onUpdateStack(site.id,
          needsStackConfig ? stackChoice : effectiveStack,
          needsStackConfig ? (versionChoice || null) : (site.stackVersion ?? null),
          startupChanged ? startupCommandInput.trim() : null,
        );
        if (!stackResponse.success) {
          setPublishError(stackResponse.message || "Failed to configure runtime.");
          return;
        }
        onStackChange(site.id, {
          stack: stackResponse.data?.stack ?? (needsStackConfig ? stackChoice : site.stack),
          stackVersion: stackResponse.data?.stackVersion ?? (needsStackConfig ? versionChoice : site.stackVersion),
          runtimeStatus: stackResponse.data?.runtimeStatus ?? site.runtimeStatus,
          runtimeMessage: stackResponse.data?.runtimeMessage ?? site.runtimeMessage,
          hasActiveRuntimeJob: stackResponse.data?.runtimeJobQueued ?? site.hasActiveRuntimeJob,
        });
      }

      const response = await onPublish(site.id,
        (effectiveStack === "dotnet" || effectiveStack === "netcore") && entryDllInput.trim() ? entryDllInput.trim() : null);
      if (!response.success) {
        setPublishError(response.message || "Failed to queue publish.");
        return;
      }
      onStackChange(site.id, {
        hasActivePublishJob: true,
        lastPublishStatus: response.data?.lastPublishStatus ?? "queued",
        lastPublishMessage: null,
        lastPublishedUtc: response.data?.lastPublishedUtc ?? site.lastPublishedUtc,
      });
      setPublishInfo(
        effectiveStack === "dotnet" || effectiveStack === "netcore"
          ? "Publish queued. Visual Studio's upload will finalize shortly."
          : "Publish queued. The server will install dependencies and configure the site.",
      );
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish site.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveGitConfig = async () => {
    setIsSavingGitConfig(true);
    setGitConfigError(null);
    setGitConfigSaved(false);
    try {
      const response = await onSaveGitConfig(site.id, gitRepoUrl.trim(), gitBranch.trim() || "main", gitPat.trim() || null);
      if (!response.success) {
        setGitConfigError(response.message || "Failed to save git config.");
        return;
      }
      setGitPat("");
      setGitConfigSaved(true);
      onStackChange(site.id, { gitRepoUrl: gitRepoUrl.trim(), gitBranch: gitBranch.trim() || "main", gitHasPat: true });
    } catch (e) {
      setGitConfigError(e instanceof Error ? e.message : "Failed to save git config.");
    } finally {
      setIsSavingGitConfig(false);
    }
  };

  const handleGitDeploy = async () => {
    setIsDeployingFromGit(true);
    setPublishError(null);
    setDeployLog(null);
    setDeployPhase(null);
    try {
      const response = await onGitDeploy(site.id);
      if (!response.success) {
        setPublishError(response.message || "Failed to trigger git deploy.");
        return;
      }
      onStackChange(site.id, { hasActivePublishJob: true, lastPublishStatus: "pending", lastPublishMessage: null });
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Failed to trigger git deploy.");
    } finally {
      setIsDeployingFromGit(false);
    }
  };

  const handleToggleAutoDeploy = async () => {
    setIsTogglingWebhook(true);
    try {
      if (autoDeployEnabled) {
        const r = await onDisableWebhook(site.id);
        if (r.success) {
          setAutoDeployEnabled(false);
          setWebhookSetup(null);
          onStackChange(site.id, { autoDeployEnabled: false, hasWebhook: false });
        }
      } else {
        const r = await onSetupWebhook(site.id);
        if (r.success && r.data) {
          setAutoDeployEnabled(true);
          setWebhookSetup(r.data);
          onStackChange(site.id, { autoDeployEnabled: true, hasWebhook: true });
        }
      }
    } catch { /* swallow */ } finally {
      setIsTogglingWebhook(false);
    }
  };

  const copyToClipboard = (text: string, field: "url" | "secret") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // Load GitHub connection status when git mode is shown
  useEffect(() => {
    if (deployMode !== "git" || phase !== "publish") return;
    const session = getCustomerSession();
    if (!session) return;
    getGitHubConnection(session, subscriptionId)
      .then((r) => {
        setGhConnected(r.data.connected);
        setGhLogin(r.data.connected ? r.data.login : null);
        if (r.data.connected) loadGhRepos(session);
      })
      .catch(() => setGhConnected(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployMode, phase]);

  const loadGhRepos = (session: ReturnType<typeof getCustomerSession>) => {
    if (!session) return;
    setGhReposLoading(true);
    listGitHubRepos(session, subscriptionId)
      .then((r) => setGhRepos(r.data))
      .catch(() => setGhRepos([]))
      .finally(() => setGhReposLoading(false));
  };

  const handleConnectGitHub = async () => {
    const session = getCustomerSession();
    if (!session) return;
    setGhConnecting(true);
    try {
      const r = await getGitHubOAuthUrl(session, subscriptionId);
      const popup = window.open(r.data.url, "github-oauth", "width=700,height=600,left=200,top=100");
      popupRef.current = popup;

      const onMessage = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== "github-oauth-result") return;
        window.removeEventListener("message", onMessage);
        setGhConnecting(false);
        if (e.data.status === "success") {
          setGhConnected(true);
          setGhLogin(e.data.login ?? null);
          const sess = getCustomerSession();
          if (sess) loadGhRepos(sess);
        }
      };
      window.addEventListener("message", onMessage);

      // cleanup if popup closed manually without message
      const poll = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(poll);
          window.removeEventListener("message", onMessage);
          setGhConnecting(false);
        }
      }, 500);
    } catch {
      setGhConnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    const session = getCustomerSession();
    if (!session) return;
    await disconnectGitHub(session, subscriptionId).catch(() => {});
    setGhConnected(false);
    setGhLogin(null);
    setGhRepos(null);
    setGhSelectedRepo(null);
    setGhBranches([]);
  };

  const handleSelectGhRepo = async (repo: GitHubRepo) => {
    setGhSelectedRepo(repo);
    setGhRepoOpen(false);
    setGhRepoSearch("");
    // auto-fill repo URL
    setGitRepoUrl(repo.cloneUrl);
    setGitBranch(repo.defaultBranch);
    // load branches
    const session = getCustomerSession();
    if (!session) return;
    const [owner, repoName] = repo.fullName.split("/");
    setGhBranchesLoading(true);
    try {
      const r = await listGitHubBranches(session, subscriptionId, owner, repoName);
      setGhBranches(r.data);
    } catch {
      setGhBranches([]);
    } finally {
      setGhBranchesLoading(false);
    }
  };

  const activeStack = isSiteStackConfigured(site) ? site.stack : stackChoice;
  const isNode = activeStack === "node";
  const isDotnet = activeStack === "dotnet" || activeStack === "netcore";
  // Stacks whose start command can be overridden (auto-detected otherwise)
  const supportsStartupCommand = ["node", "python", "springboot"].includes(activeStack);

  return (
    <div className="al-modal-backdrop" onClick={onClose}>
      <div
        className="card stack al-modal-card al-publish-modal"
        style={{ width: "min(640px, 100%)", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="al-modal-card__head" style={{ marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8, fontSize: "1.35rem", fontWeight: 700 }}>
              <Rocket size={20} style={{ color: "var(--primary)" }} />
              {t("Publish {siteName}", "Publish {siteName}").replace("{siteName}", site.siteName)}
            </h2>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>{site.domain}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmittingStack || isPublishing}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "8px", borderRadius: "50%", display: "grid", placeItems: "center", transition: "all 150ms ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-soft)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--muted)"; }}>
            <X size={18} />
          </button>
        </div>

        {/* Status messages */}
        {publishError && <div className="inline-message inline-message--error" style={{ marginBottom: "16px" }}>{publishError}</div>}
        {!publishError && (site.hasActivePublishJob || deployPhase) && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#1e40af" }}>
              {site.hasActivePublishJob
                ? <Loader2 size={14} className="al-spin" />
                : <CheckCircle2 size={14} style={{ color: deployPhase === "succeeded" ? "#16a34a" : "#ef4444" }} />}
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                {site.hasActivePublishJob
                  ? t("Publishing... the agent is preparing your web container.", "Publishing... the agent is preparing your web container.")
                  : deployPhase === "succeeded"
                    ? t("Deploy complete.", "Deploy complete.")
                    : t("Deploy ended.", "Deploy ended.")}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "#bfdbfe", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${phaseToProgress(deployPhase)}%`, background: "linear-gradient(90deg, #2563eb, #60a5fa)", borderRadius: 999, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.68rem", color: "#3b82f6" }}>
              {(["Queued", "Cloning", "Installing", "Building", "Activating", "Done"] as const).map((step, i, arr) => {
                const stepPct = i === 0 ? 0 : (i / (arr.length - 1)) * 95;
                const progress = phaseToProgress(deployPhase);
                return <span key={step} style={{ fontWeight: progress >= stepPct ? 700 : 400, opacity: progress >= stepPct ? 1 : 0.45 }}>{step}</span>;
              })}
            </div>
          </div>
        )}
        {!publishError && !site.hasActivePublishJob && site.lastPublishStatus?.toLowerCase() === "succeeded" && (
          <div className="inline-message" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "16px" }}>
            <span><CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />{t("Publish complete", "Publish complete")}{site.lastPublishedUtc ? ` · ${formatDateTime(site.lastPublishedUtc)}` : ""}.</span>
            <a href={`https://${site.domain}`} target="_blank" rel="noreferrer" style={{ color: "#065f46", fontWeight: 600, textDecoration: "underline" }}>{t("Open site", "Open site")}</a>
          </div>
        )}
        {!publishError && !site.hasActivePublishJob && site.lastPublishStatus?.toLowerCase() === "failed" && (
          <div className="inline-message inline-message--error" style={{ marginBottom: "16px" }}>
            {t("Publish failed", "Publish failed")}{site.lastPublishMessage ? ` — ${site.lastPublishMessage}` : "."}
          </div>
        )}
        {publishInfo && !site.hasActivePublishJob && site.lastPublishStatus?.toLowerCase() !== "succeeded" && site.lastPublishStatus?.toLowerCase() !== "failed" && (
          <div className="inline-message" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", marginBottom: "16px" }}>
            <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />{t(publishInfo, publishInfo)}
          </div>
        )}

        {/* Phase: select stack */}
        {phase === "select-stack" ? (
          <div className="stack-sm">
            <p className="muted" style={{ marginTop: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>
              {t("Pick a runtime stack. The hosting agent will prepare the hosting environment automatically. This is a one-time setup; after it's done, publishing becomes a single click.", "Pick a runtime stack. The hosting agent will prepare the hosting environment automatically. This is a one-time setup; after it's done, publishing becomes a single click.")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              {stackCatalog.map((entry) => {
                const isSelected = stackChoice === entry.slug;
                const isAvailable = entry.status === "available";
                let StackIcon = Lock;
                if (entry.slug === "static") StackIcon = Globe;
                else if (entry.slug === "netcore" || entry.slug === "dotnet") StackIcon = Cpu;
                else if (entry.slug === "node") StackIcon = Terminal;
                else if (entry.slug === "python") StackIcon = FileCode2;
                else if (entry.slug === "php") StackIcon = Braces;
                else if (entry.slug === "springboot") StackIcon = Coffee;
                return (
                  <button key={entry.slug} type="button"
                    onClick={() => isAvailable && handleStackChoiceChange(entry.slug)}
                    disabled={!isAvailable || isSubmittingStack}
                    style={{ textAlign: "left", padding: "16px", borderRadius: "14px", border: isSelected ? "2.5px solid var(--primary)" : "1px solid var(--border)", background: isSelected ? "rgba(37, 99, 235, 0.03)" : isAvailable ? "var(--surface)" : "#f8fafc", cursor: isAvailable ? "pointer" : "not-allowed", opacity: isAvailable ? 1 : 0.65, display: "flex", flexDirection: "column", gap: 6, transition: "all 150ms ease", boxShadow: isSelected ? "0 8px 20px rgba(37, 99, 235, 0.06)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: isSelected ? "var(--primary-soft)" : "#e2e8f0", color: isSelected ? "var(--primary)" : "var(--muted)", display: "grid", placeItems: "center" }}><StackIcon size={16} /></div>
                      {isSelected && <CheckCircle2 size={16} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
                    </div>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text)", marginTop: 6 }}>{t(entry.name, entry.name)}</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.3 }}>{t(entry.description, entry.description)}</span>
                    {!isAvailable && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", background: "#e2e8f0", padding: "3px 8px", borderRadius: "999px", display: "inline-block", width: "fit-content", marginTop: 4 }}>{t("Coming soon", "Coming soon")}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {(() => {
              const chosen = stackCatalog.find((s) => s.slug === stackChoice);
              if (!chosen || chosen.versions.length === 0) return null;
              return (
                <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>{t("Runtime version", "Runtime version")}</span>
                  <select value={versionChoice} onChange={(e) => setVersionChoice(e.target.value)} disabled={isSubmittingStack}
                    style={{ width: "100%", minHeight: "46px", padding: "0 16px", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--surface)", outline: "none", fontSize: "0.9rem", fontWeight: 500, color: "var(--text)" }}>
                    {chosen.versions.map((v) => (<option key={v.value} value={v.value}>{t(v.label, v.label)}</option>))}
                  </select>
                </label>
              );
            })()}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
              <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmittingStack} style={{ minHeight: "42px", padding: "0 20px" }}>{t("Cancel", "Cancel")}</button>
              <button type="button" className="primary-button" onClick={handleConfirmStack} disabled={isSubmittingStack || !stackCatalog.find((s) => s.slug === stackChoice && s.status === "available")}
                style={{ minHeight: "42px", padding: "0 20px", display: "flex", alignItems: "center", gap: 8 }}>
                {isSubmittingStack ? (<><RefreshCw size={14} className="spin" /> {t("Preparing runtime...", "Preparing runtime...")}</>) : (<>{t("Continue", "Continue")}</>)}
              </button>
            </div>
          </div>
        ) : (
          <div className="stack-sm">
            {/* Deploy mode tabs */}
            <div style={{ display: "flex", gap: 0, background: "var(--surface-soft)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", marginBottom: 4 }}>
              {(["git", "ftp"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setDeployMode(mode)}
                  style={{ flex: 1, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", transition: "all 140ms ease", background: deployMode === mode ? "var(--primary)" : "transparent", color: deployMode === mode ? "#fff" : "var(--muted)" }}>
                  {mode === "git" ? "Deploy from GitHub" : "Manual Upload (FTP)"}
                </button>
              ))}
            </div>

            {/* Git deploy */}
            {deployMode === "git" && (
              <div className="stack-sm">
                {/* GitHub OAuth section */}
                <div style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-soft)" }}>
                  <p style={{ margin: "0 0 12px 0", fontWeight: 700, fontSize: "0.9rem" }}>Auto Build and Deploy</p>
                  <p style={{ margin: "0 0 14px 0", fontSize: "0.8rem", color: "var(--muted)" }}>
                    You can build and deploy using frontend, backend, and full-stack frameworks by connecting a Git Repository.
                  </p>
                  {ghConnected === null ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: "0.82rem" }}>
                      <Loader2 size={13} className="al-spin" /> Checking GitHub connection…
                    </div>
                  ) : !ghConnected ? (
                    <button type="button" onClick={handleConnectGitHub} disabled={ghConnecting}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#24292e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", opacity: ghConnecting ? 0.7 : 1 }}>
                      {ghConnecting ? <Loader2 size={15} className="al-spin" /> : <Github size={15} />}
                      Connect GitHub Account
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#15803d", borderRadius: 8, padding: "5px 12px", fontSize: "0.82rem", fontWeight: 600 }}>
                        <Github size={13} /> {ghLogin ?? "Connected"}
                      </div>
                      <button type="button" onClick={handleDisconnectGitHub}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", color: "var(--muted)", cursor: "pointer" }}>
                        Disconnect
                      </button>
                    </div>
                  )}

                  {/* Repo selector */}
                  {ghConnected && (
                    <div style={{ marginTop: 16 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>Repository</span>
                      <div style={{ position: "relative" }}>
                        <button type="button"
                          onClick={() => setGhRepoOpen((v) => !v)}
                          disabled={ghReposLoading}
                          style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ color: ghSelectedRepo ? "var(--text)" : "var(--muted)" }}>
                            {ghReposLoading ? <><Loader2 size={13} className="al-spin" style={{ marginRight: 6 }} />Loading repos…</> : ghSelectedRepo ? ghSelectedRepo.fullName : "Select a repository…"}
                          </span>
                          <ChevronDown size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                        </button>
                        {ghRepoOpen && (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 99, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
                              <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                              <input autoFocus type="text" placeholder="Search repos…" value={ghRepoSearch}
                                onChange={(e) => setGhRepoSearch(e.target.value)}
                                style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%", color: "var(--text)" }} />
                            </div>
                            <div style={{ maxHeight: 220, overflowY: "auto" }}>
                              {(ghRepos ?? []).filter((r) => r.fullName.toLowerCase().includes(ghRepoSearch.toLowerCase())).map((repo) => (
                                <button key={repo.id} type="button"
                                  onClick={() => void handleSelectGhRepo(repo)}
                                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", background: "none", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", color: "var(--text)" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-soft)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
                                  <Github size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{repo.fullName}</span>
                                  {repo.private && <span style={{ fontSize: "0.68rem", background: "#f1f5f9", color: "#64748b", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>Private</span>}
                                </button>
                              ))}
                              {(ghRepos ?? []).filter((r) => r.fullName.toLowerCase().includes(ghRepoSearch.toLowerCase())).length === 0 && (
                                <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.82rem", padding: "16px 0" }}>No repos found.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Branch selector — shown after repo picked */}
                      {ghSelectedRepo && (
                        <div style={{ marginTop: 10 }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>Branch</span>
                          {ghBranchesLoading ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--muted)" }}>
                              <Loader2 size={12} className="al-spin" /> Loading branches…
                            </div>
                          ) : (
                            <select value={gitBranch} onChange={(e) => setGitBranch(e.target.value)}
                              style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", color: "var(--text)", outline: "none" }}>
                              {ghBranches.length === 0 ? (
                                <option value={gitBranch}>{gitBranch}</option>
                              ) : ghBranches.map((b) => (
                                <option key={b.name} value={b.name}>{b.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 12, padding: 16, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-soft)" }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>Repository URL</span>
                    <input type="url" placeholder="https://github.com/youruser/xxxx.git" value={gitRepoUrl} onChange={(e) => setGitRepoUrl(e.target.value)}
                      disabled={isSavingGitConfig || isDeployingFromGit}
                      style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }} />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>Branch</span>
                      <input type="text" placeholder="main" value={gitBranch} onChange={(e) => setGitBranch(e.target.value)}
                        disabled={isSavingGitConfig || isDeployingFromGit}
                        style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }} />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>
                        Personal Token {site.gitHasPat ? <span style={{ color: "#16a34a", fontWeight: 400 }}>✓ saved</span> : <span style={{ fontWeight: 400 }}>(optional)</span>}
                      </span>
                      <input type="password" placeholder={site.gitHasPat ? "Leave blank to keep existing" : "ghp_... (for private repos)"}
                        value={gitPat} onChange={(e) => setGitPat(e.target.value)} disabled={isSavingGitConfig || isDeployingFromGit}
                        style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }} />
                    </label>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="secondary-button" onClick={handleSaveGitConfig}
                      disabled={isSavingGitConfig || isDeployingFromGit || !gitRepoUrl.trim()}
                      style={{ minHeight: 36, padding: "0 16px", borderRadius: 10, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {isSavingGitConfig ? <><Loader2 size={13} className="al-spin" /> Saving...</> : gitConfigSaved ? <><CheckCircle2 size={13} style={{ color: "#16a34a" }} /> Saved</> : "Save Connection"}
                    </button>
                  </div>
                  {gitConfigError && <div className="inline-message inline-message--error" style={{ marginTop: 4 }}>{gitConfigError}</div>}
                </div>
                <details style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-soft)" }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", padding: "10px 14px", userSelect: "none" }}>
                    Environment Variables
                  </summary>
                  <div style={{ padding: "0 14px 14px 14px", borderTop: "1px solid var(--border)" }}>
                    <p style={{ margin: "10px 0 8px 0", fontSize: "0.78rem", color: "var(--muted)" }}>
                      Variables are encrypted at rest and injected at deploy time. Existing values are not shown.
                    </p>
                    <EnvVarsEditor
                      siteId={site.id}
                      onLoad={() => onGetEnvVars(site.id)}
                      onSave={(items) => onSaveEnvVars(site.id, items)}
                    />
                  </div>
                </details>

                {/* Auto deploy on push */}
                <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-soft)", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Zap size={14} style={{ color: autoDeployEnabled ? "#f59e0b" : "var(--muted)" }} />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>Auto deploy on push</span>
                      {autoDeployEnabled && (
                        <span style={{ fontSize: "0.70rem", fontWeight: 700, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "1px 6px" }}>ENABLED</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAutoDeploy}
                      disabled={isTogglingWebhook || !site.gitRepoUrl}
                      style={{
                        minHeight: 30, padding: "0 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: "0.78rem", fontWeight: 600,
                        background: autoDeployEnabled ? "#fee2e2" : "var(--primary)",
                        color: autoDeployEnabled ? "#b91c1c" : "#fff",
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}
                    >
                      {isTogglingWebhook ? <Loader2 size={12} className="al-spin" /> : null}
                      {autoDeployEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                  {!site.gitRepoUrl && (
                    <p style={{ margin: "6px 0 0 22px", fontSize: "0.76rem", color: "var(--muted)" }}>Save a repository URL first.</p>
                  )}

                  {/* Webhook config shown after setup or when already enabled */}
                  {autoDeployEnabled && (
                    <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)" }}>
                      {webhookSetup ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.5 }}>
                            Add this webhook in GitHub: <strong>Settings → Webhooks → Add webhook</strong>.<br/>
                            Set Content type to <code>application/json</code>, trigger: <strong>Just the push event</strong>.
                          </p>
                          <div>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 3 }}>PAYLOAD URL</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <code style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, wordBreak: "break-all", flex: 1 }}>{webhookSetup.webhookUrl}</code>
                              <button type="button" onClick={() => copyToClipboard(webhookSetup.webhookUrl, "url")}
                                style={{ minWidth: 30, minHeight: 30, border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                                {copiedField === "url" ? <Check size={12} style={{ color: "#16a34a" }} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#b91c1c", display: "block", marginBottom: 3 }}>SECRET (shown once — copy now)</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <code style={{ fontSize: "0.72rem", background: "#fef2f2", padding: "4px 8px", borderRadius: 6, wordBreak: "break-all", flex: 1 }}>{webhookSetup.secret}</code>
                              <button type="button" onClick={() => copyToClipboard(webhookSetup.secret, "secret")}
                                style={{ minWidth: 30, minHeight: 30, border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                                {copiedField === "secret" ? <Check size={12} style={{ color: "#16a34a" }} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--muted)" }}>
                          Auto deploy is active. Push to <strong>{site.gitBranch ?? "main"}</strong> to trigger a deploy.<br/>
                          To see the webhook URL and secret again, disable and re-enable auto deploy.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {deployLog && (
                  <div style={{ background: "#0f172a", color: "#94a3b8", borderRadius: 12, padding: "12px 16px", fontFamily: "monospace", fontSize: "0.75rem", maxHeight: 220, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{deployLog}</div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="primary-button" onClick={handleGitDeploy}
                    disabled={isDeployingFromGit || site.hasActivePublishJob || !site.gitRepoUrl}
                    style={{ minHeight: 44, padding: "0 24px", borderRadius: 12, fontSize: "0.92rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {isDeployingFromGit || site.hasActivePublishJob ? (<><Loader2 size={15} className="al-spin" /> {site.hasActivePublishJob ? "Deploying..." : "Queuing..."}</>) : (<><Rocket size={15} /> Deploy from GitHub</>)}
                  </button>
                </div>
              </div>
            )}

            {/* FTP deploy */}
            {deployMode === "ftp" && (
              <div className="stack-sm">
                {isDotnet && (
                  <div style={{ padding: 18, borderRadius: 14, border: "1px solid #c7d2fe", borderLeft: "4px solid var(--primary)", background: "linear-gradient(180deg, #f5f7ff 0%, #eef2ff 100%)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: "0.98rem", color: "#1e293b" }}>{t("Publish from Visual Studio 2022", "Publish from Visual Studio 2022")}</strong>
                        <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "0.8rem" }}>{t("Download the profile and import it — VS handles the upload via Web Deploy.", "Download the profile and import it — VS handles the upload via Web Deploy.")}</p>
                      </div>
                      <button type="button" className="secondary-button" onClick={handleDownloadPublishProfile} disabled={isDownloadingProfile || isPublishing}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minHeight: "36px", borderRadius: "10px", fontSize: "0.82rem" }}>
                        {isDownloadingProfile ? <Loader2 size={14} className="al-spin" /> : <Download size={14} />}
                        <span>{t("Download profile", "Download profile")}</span>
                      </button>
                    </div>
                    <ol style={{ margin: "10px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
                      <li>{t("Download the {publish_settings} file above.", "Download the {publish_settings} file above.").split(/(\{publish_settings\})/).map((part, index) => part === "{publish_settings}" ? <code key={index}>.PublishSettings</code> : part)}</li>
                      <li>{(() => { const text = t("In Visual Studio 2022, right-click the project → Publish… → Import Profile, then pick the file.", "In Visual Studio 2022, right-click the project → Publish… → Import Profile, then pick the file."); const parts = text.split(/(Publish…|Import Profile)/); return parts.map((part, idx) => { if (part === "Publish…") return <strong key={idx}>Publish…</strong>; if (part === "Import Profile") return <strong key={idx}>Import Profile</strong>; return part; }); })()}</li>
                      <li>{(() => { const text = t("Click Publish in Visual Studio — it uploads via Web Deploy.", "Click Publish in Visual Studio — it uploads via Web Deploy."); const parts = text.split(/(Publish)/); return parts.map((part, idx) => part === "Publish" ? <strong key={idx}>Publish</strong> : part); })()}</li>
                      <li>{t("Back here, click Publish now below to write {web_config} and recycle the app pool.", "Back here, click Publish now below to write {web_config} and recycle the app pool.").split(/(\{web_config\})/).map((part, index) => part === "{web_config}" ? <code key={index}>web.config</code> : part)}</li>
                    </ol>
                  </div>
                )}
                {isNode && <NodeDeployGuide />}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "16px", borderRadius: "14px", background: "var(--surface-soft)", border: "1px solid var(--border)", fontSize: "0.85rem" }}>
                  <div><span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{t("Runtime", "Runtime")}</span><strong style={{ color: "var(--text)" }}>{t(getStackLabel(site, stackCatalog), getStackLabel(site, stackCatalog))}</strong></div>
                  <div><span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{t("Runtime status", "Runtime status")}</span><strong style={{ color: "var(--text)" }}>{t(site.runtimeStatus ?? "Unknown", site.runtimeStatus ?? "Unknown")}{site.runtimeMessage ? ` — ${t(site.runtimeMessage, site.runtimeMessage)}` : ""}</strong></div>
                  <div style={{ gridColumn: "span 2" }}><span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{t("Last publish", "Last publish")}</span><strong style={{ color: "var(--text)" }}>{formatDateTime(site.lastPublishedUtc)}{site.lastPublishStatus ? ` (${t(site.lastPublishStatus, site.lastPublishStatus)})` : ""}</strong></div>
                </div>

                {supportsStartupCommand && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>
                      {isNode ? t("Startup file (optional)", "Startup file (optional)") : t("Startup command (optional)", "Startup command (optional)")}
                    </span>
                    <input type="text"
                      placeholder={
                        isNode
                          ? t("server.js (auto-detected from package.json)", "server.js (auto-detected from package.json)")
                          : activeStack === "python"
                            ? t("gunicorn app:app (auto-detected)", "gunicorn app:app (auto-detected)")
                            : t("java -jar app.jar (auto-detected)", "java -jar app.jar (auto-detected)")
                      }
                      value={startupCommandInput} onChange={(e) => setStartupCommandInput(e.target.value)} disabled={isPublishing}
                      style={{ width: "100%", minHeight: "44px", padding: "0 16px", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--surface)", outline: "none", fontSize: "0.88rem" }} />
                    <span className="muted" style={{ fontSize: "0.76rem" }}>{t("Leave empty to auto-detect. Specify a command only if your entry point is non-standard.", "Leave empty to auto-detect. Specify a command only if your entry point is non-standard.")}</span>
                  </label>
                )}
                {isDotnet && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>{t("Entry DLL (optional)", "Entry DLL (optional)")}</span>
                    <input type="text" placeholder={t("Auto-detected, e.g. {dll}", "Auto-detected, e.g. {dll}").replace("{dll}", guessEntryDll(site))}
                      value={entryDllInput} onChange={(e) => setEntryDllInput(e.target.value)} disabled={isPublishing}
                      style={{ width: "100%", minHeight: "44px", padding: "0 16px", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--surface)", outline: "none", fontSize: "0.88rem" }} />
                    <span className="muted" style={{ fontSize: "0.76rem" }}>{t("Leave empty to auto-detect. Provide a filename only if your app uses a non-standard entry DLL.", "Leave empty to auto-detect. Provide a filename only if your app uses a non-standard entry DLL.")}</span>
                  </label>
                )}

                {site.publish && (
                  <details style={{ borderRadius: 14, border: "1px dashed var(--border)", background: "var(--surface-soft)", padding: "12px 16px", transition: "all 150ms ease" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{!isDotnet ? t("FTP upload details", "FTP upload details") : t("Advanced: manual FTP upload", "Advanced: manual FTP upload")}</summary>
                    <ol style={{ margin: "10px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
                      {isNode ? (<>
                        <li>{t("Upload your project files to the site root via FTP:", "Upload your project files to the site root via FTP:")}<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{site.publish.ftpHost}</strong></span><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{site.publish.ftpUser}</strong></span></div></li>
                        <li style={{ marginTop: 6 }}>{t("Include {package_json} — do not upload {node_modules} (it will be installed on the server).", "Include package.json — do not upload node_modules (it will be installed on the server).").split(/(\{package_json\}|\{node_modules\})/).map((part, index) => { if (part === "{package_json}") return <code key={index}>package.json</code>; if (part === "{node_modules}") return <code key={index}>node_modules</code>; return part; })}</li>
                        <li style={{ marginTop: 6 }}>{(() => { const text = t("Click Publish now to run npm install, generate web.config, and start the app.", "Click Publish now to run npm install, generate web.config, and start the app."); const parts = text.split(/(Publish now|npm install|web.config)/); return parts.map((part, idx) => { if (part === "Publish now") return <strong key={idx}>{t("Publish now", "Publish now")}</strong>; if (part === "npm install") return <code key={idx}>npm install</code>; if (part === "web.config") return <code key={idx}>web.config</code>; return part; }); })()}</li>
                      </>) : isDotnet ? (<>
                        <li>{t("Run {dotnet_command} locally.", "Run {dotnet_command} locally.").split(/(\{dotnet_command\})/).map((part, index) => part === "{dotnet_command}" ? <code key={index}>dotnet publish -c Release -o ./publish</code> : part)}</li>
                        <li>{t("Upload the contents of {publish_dir} to the site root via FTP:", "Upload the contents of {publish_dir} to the site root via FTP:")}<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{site.publish.ftpHost}</strong></span><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{site.publish.ftpUser}</strong></span></div></li>
                        <li>{t("Click Publish now to write {web_config} and recycle the app pool.", "Click Publish now to write web.config and recycle the app pool.").split(/(\{web_config\})/).map((part, index) => part === "{web_config}" ? <code key={index}>web.config</code> : part)}</li>
                      </>) : (<>
                        <li>{t("Upload your project files to the site root via FTP:", "Upload your project files to the site root via FTP:")}<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{site.publish.ftpHost}</strong></span><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{site.publish.ftpUser}</strong></span></div></li>
                        <li style={{ marginTop: 6 }}>{
                          activeStack === "python"
                            ? t("Include requirements.txt — do not upload your local virtualenv (dependencies install on the server).", "Include requirements.txt — do not upload your local virtualenv (dependencies install on the server).")
                            : activeStack === "php"
                              ? t("Include composer.json if you use Composer — the server runs composer install automatically.", "Include composer.json if you use Composer — the server runs composer install automatically.")
                              : t("Upload either a pre-built fat JAR, or the project source with its Maven/Gradle wrapper (the server builds it).", "Upload either a pre-built fat JAR, or the project source with its Maven/Gradle wrapper (the server builds it).")
                        }</li>
                        <li style={{ marginTop: 6 }}>{(() => { const text = t("Click Publish now to install dependencies and start the app.", "Click Publish now to install dependencies and start the app."); const parts = text.split(/(Publish now)/); return parts.map((part, idx) => part === "Publish now" ? <strong key={idx}>{t("Publish now", "Publish now")}</strong> : part); })()}</li>
                      </>)}</ol>
                  </details>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 8 }}>
                  {!onlyOneStack && isSiteStackConfigured(site) ? (
                    <button type="button" className="secondary-button" onClick={() => setPhase("select-stack")} disabled={isPublishing}
                      style={{ minHeight: "38px", padding: "0 14px", borderRadius: "10px", fontSize: "0.85rem" }}>{t("Change runtime", "Change runtime")}</button>
                  ) : <span />}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" className="secondary-button" onClick={onClose} disabled={isPublishing} style={{ minHeight: "42px", padding: "0 20px" }}>{t("Done", "Done")}</button>
                    <button type="button" className="primary-button" onClick={handleConfirmPublish} disabled={isPublishing || !canPublishSite(site, availableStacks)}
                      style={{ minHeight: "42px", padding: "0 22px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {isPublishing ? (
                        <span><Loader2 size={14} className="al-spin" />{t("Publishing...", "Publishing...")}</span>
                      ) : (
                        <span><Rocket size={14} />{t("Publish now", "Publish now")}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
