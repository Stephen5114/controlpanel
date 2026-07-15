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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
        <Loader2 size={24} className="al-spin" />
      </div>
    );
  }

  return (
    <div className="ov-wrapper">
      <div className="ov-header">
        <div>
          <h1 className="ov-header__title">{t("Deployments", "Deployments")}</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
            {t("History, logs, and rollback", "History, logs, and rollback")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {sites.length > 1 && (
            <select
              value={selectedSiteId}
              onChange={(e) => handleSelectSite(e.target.value)}
              style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", color: "var(--text)", outline: "none" }}
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
        <div className="inline-message inline-message--error" style={{ marginBottom: 16 }}>{sitesError}</div>
      )}
      {actionMsg && (
        <div
          className={`inline-message${actionMsg.ok ? "" : " inline-message--error"}`}
          style={{ marginBottom: 16 }}
        >
          {actionMsg.text}
        </div>
      )}

      {sites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          {t("No websites yet. Create a website from the Websites page.", "No websites yet. Create a website from the Websites page.")}
        </div>
      ) : loadingDeploys ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
          <Loader2 size={20} className="al-spin" />
        </div>
      ) : deployments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          {t("No deployments yet for this site.", "No deployments yet for this site.")}
        </div>
      ) : (
        <div style={{ borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted)", width: 44 }}>#</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted)" }}>{t("When", "When")}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted)" }}>{t("Method", "Method")}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted)" }}>{t("Branch / SHA", "Branch / SHA")}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted)" }}>{t("Duration", "Duration")}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted)" }}>{t("Status", "Status")}</th>
                <th style={{ padding: "10px 14px", width: 72 }} />
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
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: isExpanded ? "rgba(0,0,0,0.02)" : "transparent", transition: "background 100ms ease" }}
                      onClick={() => void handleToggleExpand(dep)}
                    >
                      <td style={{ padding: "10px 14px", color: "var(--muted)", fontWeight: 500 }}>{dep.number}</td>
                      <td style={{ padding: "10px 14px" }}>{formatRelative(dep.createdUtc)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>
                          {methodLabel(dep.method)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text)" }}>
                        {dep.gitBranch ? (
                          <span>
                            {dep.gitBranch}
                            {dep.gitCommitSha && (
                              <span style={{ color: "var(--muted)" }}>@{dep.gitCommitSha.slice(0, 7)}</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                        {formatDuration(dep.startedUtc, dep.completedUtc)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: ss.bg, color: ss.color, borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {(dep.status === "running" || dep.status === "queued") && (
                            <Loader2 size={11} className="al-spin" />
                          )}
                          {dep.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                          {canRollback && (
                            <button
                              type="button"
                              title={t("Rollback to this deployment", "Rollback to this deployment")}
                              onClick={() => void handleRollback(dep)}
                              disabled={rollingBack !== null}
                              style={{ border: "1px solid var(--border)", background: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, color: "var(--muted)", fontSize: "0.75rem" }}
                            >
                              {rollingBack === dep.id
                                ? <Loader2 size={11} className="al-spin" />
                                : <RotateCcw size={11} />}
                            </button>
                          )}
                          <span style={{ color: "var(--muted)", display: "grid", placeItems: "center" }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.015)" }}>
                        <td colSpan={7} style={{ padding: "0 14px 14px 14px" }}>
                          {dep.gitCommitMessage && (
                            <p style={{ margin: "10px 0 6px 0", fontSize: "0.82rem" }}>
                              <span style={{ color: "var(--muted)" }}>Commit: </span>
                              <strong>{dep.gitCommitMessage}</strong>
                            </p>
                          )}
                          {dep.error && (
                            <div className="inline-message inline-message--error" style={{ margin: "10px 0 8px 0" }}>
                              {dep.error}
                            </div>
                          )}
                          {loadingLog ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "var(--muted)" }}>
                              <Loader2 size={13} className="al-spin" />
                              <span style={{ fontSize: "0.82rem" }}>{t("Loading log…", "Loading log…")}</span>
                            </div>
                          ) : expandedLog ? (
                            <pre style={{ margin: "10px 0 0 0", background: "#0f172a", color: "#94a3b8", borderRadius: 10, padding: "12px 14px", fontFamily: "monospace", fontSize: "0.73rem", maxHeight: 280, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                              {expandedLog}
                            </pre>
                          ) : (
                            <p style={{ margin: "10px 0 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
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
