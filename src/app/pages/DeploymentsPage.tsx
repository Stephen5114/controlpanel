import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { getCustomerSession } from "../lib/customer-session";
import {
  getSubscriptionWebsites,
  listDeployments,
  getDeployment,
  triggerRollback,
  type SubscriptionWebsite,
  type Deployment,
} from "../lib/customer-api";
import { useLocalization } from "../lib/i18n";

function formatDuration(startedUtc: string | null, completedUtc: string | null): string {
  if (!startedUtc || !completedUtc) return "—";
  const ms = new Date(completedUtc).getTime() - new Date(startedUtc).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatRelative(utc: string | null): string {
  if (!utc) return "—";
  const s = Math.floor((Date.now() - new Date(utc).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function methodLabel(method: string): string {
  const map: Record<string, string> = { git_deploy: "Git", ftp: "FTP", webhook: "Webhook", rollback: "Rollback" };
  return map[method] ?? method;
}

type StatusStyle = { bg: string; color: string };
function statusStyle(status: string): StatusStyle {
  if (status === "succeeded") return { bg: "#dcfce7", color: "#15803d" };
  if (status === "failed" || status === "rolled_back") return { bg: "#fee2e2", color: "#b91c1c" };
  if (status === "running" || status === "queued") return { bg: "#dbeafe", color: "#1d4ed8" };
  return { bg: "var(--surface-soft)", color: "var(--muted)" };
}

export function DeploymentsPage() {
  const { t } = useLocalization();
  const { subId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sites, setSites] = useState<SubscriptionWebsite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingDeploys, setLoadingDeploys] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const expandFetchIdRef = useRef<string | null>(null);

  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Load sites
  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId) { setLoadingSites(false); return; }
    getSubscriptionWebsites(session, subId)
      .then((list) => {
        setSites(list);
        const initialSite = searchParams.get("site") ?? list[0]?.id ?? "";
        setSelectedSiteId(initialSite);
      })
      .catch(() => setSitesError("Failed to load sites."))
      .finally(() => setLoadingSites(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId]);

  const loadDeployments = useCallback(async (siteId: string, silent = false) => {
    const session = getCustomerSession();
    if (!session || !subId || !siteId) return;
    if (!silent) setLoadingDeploys(true);
    try {
      const list = await listDeployments(session, subId, siteId, 0, 30);
      setDeployments(Array.isArray(list) ? list : []);
    } catch {
      if (!silent) setDeployments([]);
    } finally {
      if (!silent) setLoadingDeploys(false);
    }
  }, [subId]);

  useEffect(() => {
    if (!selectedSiteId) return;
    setDeployments([]);
    setExpandedId(null);
    setExpandedLog(null);
    void loadDeployments(selectedSiteId);
  }, [selectedSiteId, loadDeployments]);

  // Sync site selection to search param
  const handleSelectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSearchParams({ site: siteId }, { replace: true });
  };

  // Poll while any deploy is in-flight
  const hasActive = deployments.some((d) => d.status === "running" || d.status === "queued");
  useEffect(() => {
    if (!hasActive || !selectedSiteId) return;
    const id = window.setInterval(() => void loadDeployments(selectedSiteId, true), 3000);
    return () => window.clearInterval(id);
  }, [hasActive, selectedSiteId, loadDeployments]);

  const handleToggleExpand = async (dep: Deployment) => {
    if (expandedId === dep.id) {
      setExpandedId(null);
      setExpandedLog(null);
      return;
    }
    setExpandedId(dep.id);
    setExpandedLog(null);
    const session = getCustomerSession();
    if (!session || !subId) return;
    const fetchId = dep.id;
    expandFetchIdRef.current = fetchId;
    setLoadingLog(true);
    try {
      const full = await getDeployment(session, subId, selectedSiteId, dep.id);
      if (expandFetchIdRef.current === fetchId) {
        setExpandedLog(full.logText ?? null);
      }
    } catch {
      if (expandFetchIdRef.current === fetchId) setExpandedLog(null);
    } finally {
      if (expandFetchIdRef.current === fetchId) setLoadingLog(false);
    }
  };

  const handleRollback = async (dep: Deployment) => {
    const session = getCustomerSession();
    if (!session || !subId) return;
    setRollingBack(dep.id);
    setActionMsg(null);
    try {
      const result = await triggerRollback(session, subId, selectedSiteId, dep.id);
      if (result.success) {
        setActionMsg({ text: `Rollback to #${dep.number} queued.`, ok: true });
        void loadDeployments(selectedSiteId, true);
      } else {
        setActionMsg({ text: result.message || "Rollback failed.", ok: false });
      }
    } catch (e) {
      setActionMsg({ text: e instanceof Error ? e.message : "Rollback failed.", ok: false });
    } finally {
      setRollingBack(null);
    }
  };

  if (loadingSites) {
    return (
      <div className="dep-loading-center">
        <Loader2 size={24} className="al-spin" />
      </div>
    );
  }

  return (
    <div className="ov-wrapper">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2>{t("Deployments", "Deployments")}</h2>
        <div className="dep-header-actions">
          {sites.length > 1 && (
            <select
              value={selectedSiteId}
              onChange={(e) => handleSelectSite(e.target.value)}
              className="dep-site-select"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.siteName || s.domain}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="ov-btn ov-btn--secondary ov-btn--sm"
            onClick={() => void loadDeployments(selectedSiteId)}
            disabled={loadingDeploys || !selectedSiteId}
          >
            {loadingDeploys ? <Loader2 size={13} className="al-spin" /> : <RefreshCw size={13} />}
            {t("Refresh", "Refresh")}
          </button>
        </div>
      </div>

      {sitesError && (
        <div className="inline-message inline-message--error dep-msg-spacer">{sitesError}</div>
      )}
      {actionMsg && (
        <div
          className={`inline-message${actionMsg.ok ? "" : " inline-message--error"} dep-msg-spacer`}
        >
          {actionMsg.text}
        </div>
      )}

      {sites.length === 0 ? (
        <div className="dep-empty-state">
          {t("No websites yet. Create a website from the Websites page.", "No websites yet. Create a website from the Websites page.")}
        </div>
      ) : loadingDeploys ? (
        <div className="dep-loading-small">
          <Loader2 size={20} className="al-spin" />
        </div>
      ) : deployments.length === 0 ? (
        <div className="dep-empty-state">
          {t("No deployments yet for this site.", "No deployments yet for this site.")}
        </div>
      ) : (
        <div className="dep-table-wrap">
          <table className="dep-table">
            <thead>
              <tr className="dep-thead-tr">
                <th className="dep-th dep-th--narrow">#</th>
                <th className="dep-th">{t("When", "When")}</th>
                <th className="dep-th">{t("Method", "Method")}</th>
                <th className="dep-th">{t("Branch / SHA", "Branch / SHA")}</th>
                <th className="dep-th">{t("Duration", "Duration")}</th>
                <th className="dep-th">{t("Status", "Status")}</th>
                <th className="dep-th--action" />
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep) => {
                const ss = statusStyle(dep.status);
                const isExpanded = expandedId === dep.id;
                const canRollback = dep.status === "succeeded" && dep.method !== "rollback";
                return (
                  <Fragment key={dep.id}>
                    <tr
                      className={`dep-tr${isExpanded ? " dep-tr--expanded" : ""}`}
                      onClick={() => void handleToggleExpand(dep)}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void handleToggleExpand(dep); } }}
                    >
                      <td className="dep-td dep-td--num">{dep.number}</td>
                      <td className="dep-td">{formatRelative(dep.createdUtc)}</td>
                      <td className="dep-td">
                        <span className="dep-method-badge">
                          {methodLabel(dep.method)}
                        </span>
                      </td>
                      <td className="dep-td dep-td--mono">
                        {dep.gitBranch ? (
                          <span>
                            {dep.gitBranch}
                            {dep.gitCommitSha && (
                              <span className="dep-sha-muted">@{dep.gitCommitSha.slice(0, 7)}</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="dep-td dep-td--muted">
                        {formatDuration(dep.startedUtc, dep.completedUtc)}
                      </td>
                      <td className="dep-td">
                        <span className="dep-status-badge" style={{ background: ss.bg, color: ss.color }}>
                          {(dep.status === "running" || dep.status === "queued") && (
                            <Loader2 size={11} className="al-spin" />
                          )}
                          {dep.status}
                        </span>
                      </td>
                      <td className="dep-td dep-actions-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="dep-actions-row">
                          {canRollback && (
                            <button
                              type="button"
                              aria-label={t("Rollback to this deployment", "Rollback to this deployment")}
                              onClick={() => void handleRollback(dep)}
                              disabled={rollingBack !== null}
                              className="dep-rollback-btn"
                            >
                              {rollingBack === dep.id
                                ? <Loader2 size={11} className="al-spin" />
                                : <RotateCcw size={11} />}
                            </button>
                          )}
                          <span className="dep-expand-icon">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="dep-expanded-tr">
                        <td colSpan={7} className="dep-expanded-td">
                          {dep.gitCommitMessage && (
                            <p className="dep-commit-msg">
                              <span className="dep-commit-label">Commit: </span>
                              <strong>{dep.gitCommitMessage}</strong>
                            </p>
                          )}
                          {dep.error && (
                            <div className="inline-message inline-message--error dep-error-msg">
                              {dep.error}
                            </div>
                          )}
                          {loadingLog ? (
                            <div className="dep-log-loading">
                              <Loader2 size={13} className="al-spin" />
                              <span className="dep-log-loading-text">{t("Loading log…", "Loading log…")}</span>
                            </div>
                          ) : expandedLog ? (
                            <pre className="dep-log-pre">
                              {expandedLog}
                            </pre>
                          ) : (
                            <p className="dep-no-log">
                              {t("No log available.", "No log available.")}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
