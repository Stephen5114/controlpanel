import { useCallback, useState, useEffect } from "react";
import {
  Loader2, CheckCircle2, RefreshCw, Rocket, X, Download,
  Terminal, Cpu, Lock, Globe,
} from "lucide-react";
import type { StackCatalogEntry, SubscriptionWebsite } from "../../lib/customer-api";
import { useLocalization } from "../../lib/i18n";
import { NodeDeployGuide } from "./NodeDeployGuide";
import { getStackLabel, isSiteStackConfigured, guessEntryDll, canPublishSite, formatDateTime } from "./utils";

interface PublishDialogProps {
  site: SubscriptionWebsite;
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
  onGetDeployLog: (siteId: string) => Promise<{ success: boolean; data?: { logText: string } }>;
}

function estimateDeployProgress(log: string | null): number {
  if (!log) return 8;
  const lower = log.toLowerCase();
  if (lower.includes("succeeded") || lower.includes("complete") || lower.includes("finished")) return 95;
  if (lower.includes("restart") || lower.includes("recycle") || lower.includes("iisreset")) return 82;
  if (lower.includes("web.config") || lower.includes("configur")) return 68;
  if (lower.includes("build") || lower.includes("compil")) return 54;
  if (lower.includes("npm install") || lower.includes("install")) return 38;
  if (lower.includes("clone") || lower.includes("fetch") || lower.includes("pull")) return 22;
  return 12;
}

export function PublishDialog({
  site, stackCatalog, availableStacks, onlyOneStack,
  onClose, onStackChange, onUpdateStack, onPublish,
  onDownloadProfile, onSaveGitConfig, onGitDeploy, onGetDeployLog,
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
  const [isDeployingFromGit, setIsDeployingFromGit] = useState(false);

  // Poll deploy log while publish job is active
  useEffect(() => {
    if (!site.hasActivePublishJob) return;
    const intervalId = window.setInterval(async () => {
      try {
        const result = await onGetDeployLog(site.id);
        if (result.success && result.data?.logText) {
          setDeployLog(result.data.logText);
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
      const nodeStartupChanged = effectiveStack === "node" && startupCommandInput.trim();

      if (needsStackConfig || nodeStartupChanged) {
        const stackResponse = await onUpdateStack(site.id,
          needsStackConfig ? stackChoice : effectiveStack,
          needsStackConfig ? (versionChoice || null) : (site.stackVersion ?? null),
          effectiveStack === "node" && startupCommandInput.trim() ? startupCommandInput.trim() : null,
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

      const response = await onPublish(site.id, effectiveStack === "node" ? null : (entryDllInput.trim() ? entryDllInput.trim() : null));
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
        effectiveStack === "node"
          ? "Publish queued. The server will install dependencies and configure the site."
          : "Publish queued. Visual Studio's upload will finalize shortly.",
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

  const activeStack = isSiteStackConfigured(site) ? site.stack : stackChoice;
  const isNode = activeStack === "node";

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
        {!publishError && site.hasActivePublishJob && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#1e40af" }}>
              <Loader2 size={14} className="al-spin" />
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{t("Publishing... the agent is preparing your web container.", "Publishing... the agent is preparing your web container.")}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "#bfdbfe", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${estimateDeployProgress(deployLog)}%`, background: "linear-gradient(90deg, #2563eb, #60a5fa)", borderRadius: 999, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.68rem", color: "#3b82f6" }}>
              {(["Queued", "Cloning", "Installing", "Building", "Deploying", "Done"] as const).map((step, i, arr) => {
                const stepPct = i === 0 ? 0 : (i / (arr.length - 1)) * 95;
                const progress = estimateDeployProgress(deployLog);
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
                else if (entry.slug === "netcore") StackIcon = Cpu;
                else if (entry.slug === "node") StackIcon = Terminal;
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
                {!isNode && (
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

                {isNode ? (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>{t("Startup file (optional)", "Startup file (optional)")}</span>
                    <input type="text" placeholder={t("server.js (auto-detected from package.json)", "server.js (auto-detected from package.json)")}
                      value={startupCommandInput} onChange={(e) => setStartupCommandInput(e.target.value)} disabled={isPublishing}
                      style={{ width: "100%", minHeight: "44px", padding: "0 16px", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--surface)", outline: "none", fontSize: "0.88rem" }} />
                    <span className="muted" style={{ fontSize: "0.76rem" }}>{t("Leave empty to auto-detect from package.json. Specify a filename if your entry point is non-standard.", "Leave empty to auto-detect from package.json. Specify a filename if your entry point is non-standard.")}</span>
                  </label>
                ) : (
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
                    <summary style={{ cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{isNode ? t("FTP upload details", "FTP upload details") : t("Advanced: manual FTP upload", "Advanced: manual FTP upload")}</summary>
                    <ol style={{ margin: "10px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
                      {isNode ? (<>
                        <li>{t("Upload your project files to the site root via FTP:", "Upload your project files to the site root via FTP:")}<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{site.publish.ftpHost}</strong></span><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{site.publish.ftpUser}</strong></span></div></li>
                        <li style={{ marginTop: 6 }}>{t("Include {package_json} — do not upload {node_modules} (it will be installed on the server).", "Include package.json — do not upload node_modules (it will be installed on the server).").split(/(\{package_json\}|\{node_modules\})/).map((part, index) => { if (part === "{package_json}") return <code key={index}>package.json</code>; if (part === "{node_modules}") return <code key={index}>node_modules</code>; return part; })}</li>
                        <li style={{ marginTop: 6 }}>{(() => { const text = t("Click Publish now to run npm install, generate web.config, and start the app.", "Click Publish now to run npm install, generate web.config, and start the app."); const parts = text.split(/(Publish now|npm install|web.config)/); return parts.map((part, idx) => { if (part === "Publish now") return <strong key={idx}>{t("Publish now", "Publish now")}</strong>; if (part === "npm install") return <code key={idx}>npm install</code>; if (part === "web.config") return <code key={idx}>web.config</code>; return part; }); })()}</li>
                      </>) : (<>
                        <li>{t("Run {dotnet_command} locally.", "Run {dotnet_command} locally.").split(/(\{dotnet_command\})/).map((part, index) => part === "{dotnet_command}" ? <code key={index}>dotnet publish -c Release -o ./publish</code> : part)}</li>
                        <li>{t("Upload the contents of {publish_dir} to the site root via FTP:", "Upload the contents of {publish_dir} to the site root via FTP:")}<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{site.publish.ftpHost}</strong></span><span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{site.publish.ftpUser}</strong></span></div></li>
                        <li>{t("Click Publish now to write {web_config} and recycle the app pool.", "Click Publish now to write web.config and recycle the app pool.").split(/(\{web_config\})/).map((part, index) => part === "{web_config}" ? <code key={index}>web.config</code> : part)}</li>
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
