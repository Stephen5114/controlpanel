import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { getCustomerSession } from "../lib/customer-session";
import {
  getHostedDatabases, createHostedDatabase, deleteHostedDatabase, rotateHostedDatabasePassword,
  getSubscriptionOverview,
  type HostedDatabase
} from "../lib/customer-api";
import {
  Database, Plus, Copy, CheckCircle2, RefreshCw,
  Server, AlertTriangle, Trash2, KeyRound, Sparkles,
  Eye, EyeOff, X
} from "lucide-react";
import { useLocalization } from "../lib/i18n";

type DisplayDatabase = HostedDatabase & { isOptimistic?: boolean };
const DATABASE_PASSWORD_SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?";

function generateStrongDatabasePassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = DATABASE_PASSWORD_SYMBOLS;
  const all = uppercase + lowercase + digits + symbols;
  const chars = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  while (chars.length < 16) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

function isStrongDatabasePassword(password: string) {
  return password.length >= 12
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && [...password].some(char => DATABASE_PASSWORD_SYMBOLS.includes(char));
}

function isPending(s: string) {
  const n = s.trim().toLowerCase();
  return n === "pending" || n === "creating" || n === "provisioning" || n === "deleting";
}
function isHealthy(s: string) { const n = s.trim().toLowerCase(); return n === "active" || n === "succeeded"; }
function isFailed(s: string) { const n = s.trim().toLowerCase(); return n === "failed" || n === "error"; }
function statusLabel(s: string, t: (key: string, def: string) => string) {
  const n = s.trim().toLowerCase();
  if (n === "creating" || n === "pending" || n === "provisioning") return t("Provisioning", "Provisioning");
  if (n === "deleting") return t("Deleting", "Deleting");
  if (n === "active" || n === "succeeded") return t("Live", "Live");
  if (n === "failed" || n === "error") return t("Failed", "Failed");
  return s;
}

function buildConnStr(db: HostedDatabase) {
  const pw = db.dbPassword || "********";
  if (db.engine === "mysql") {
    return `Server=${db.serverHost};Port=3306;Database=${db.databaseName};Uid=${db.dbUser};Pwd=${pw};`;
  }
  return `Server=${db.serverHost};Database=${db.databaseName};User Id=${db.dbUser};Password=${pw};TrustServerCertificate=True;`;
}

function engineLabel(engine: string, t?: (key: string, def: string) => string) {
  const label = engine === "mysql" ? "MySQL" : "SQL Server";
  return t ? t(label, label) : label;
}

export function SubscriptionDatabasesPage() {
  const { t } = useLocalization();
  const { subId } = useParams();
  const [databases, setDatabases] = useState<DisplayDatabase[]>([]);
  const [diskQuotaMb, setDiskQuotaMb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState(() => generateStrongDatabasePassword());
  const [newSpaceMb, setNewSpaceMb] = useState("512");
  const [newEngine, setNewEngine] = useState<"sqlserver" | "mysql">("sqlserver");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordModalDatabase, setPasswordModalDatabase] = useState<HostedDatabase | null>(null);
  const [rotatePasswordValue, setRotatePasswordValue] = useState(() => generateStrongDatabasePassword());
  const [rotatePasswordError, setRotatePasswordError] = useState<string | null>(null);
  const [rotatingPassword, setRotatingPassword] = useState(false);
  const [pendingPasswordRotations, setPendingPasswordRotations] = useState<Record<string, { password: string; databaseName: string }>>({});

  // Custom states and helpers for optimized database panel
  const [showPassword, setShowPassword] = useState(false);
  const [showRotatePassword, setShowRotatePassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedRotatePassword, setCopiedRotatePassword] = useState(false);

  const guessedPrefix = useMemo(() => {
    if (databases.length > 0) {
      const dbNames = databases
        .filter(d => !d.isOptimistic)
        .map(d => d.databaseName);
      for (const name of dbNames) {
        const idx = name.indexOf('_');
        if (idx > 0) return name.substring(0, idx + 1);
      }
    }
    return "";
  }, [databases]);

  async function handleCopyPassword(val: string, setCopiedState: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 1600);
    } catch { /* */ }
  }

  const totalAllocatedSpaceMb = useMemo(() =>
    databases
      .filter(d => !isFailed(d.provisioningStatus) && d.provisioningStatus !== "deleting")
      .reduce((sum, d) => sum + d.databaseSpaceMb, 0),
    [databases]
  );
  const planDiskLimitMb = diskQuotaMb > 0 ? diskQuotaMb : 0;
  const remainingSpaceMb = planDiskLimitMb > 0 ? Math.max(0, planDiskLimitMb - totalAllocatedSpaceMb) : 10240;
  const maxSpaceMb = Math.max(128, remainingSpaceMb);

  function openCreateModal() {
    setModalError(null);
    setNewPassword(generateStrongDatabasePassword());
    setNewSpaceMb(String(Math.min(512, maxSpaceMb)));
    setNewEngine("sqlserver");
    setNewName("");
    setShowPassword(false);
    setIsModalOpen(true);
  }

  // Listen for sidebar "Deploy Site" button (reused as "create db" trigger)
  useEffect(() => {
    const handler = () => openCreateModal();
    window.addEventListener("al:open-add-db-modal", handler);
    return () => window.removeEventListener("al:open-add-db-modal", handler);
  }, []);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId) { setLoading(false); return; }
    let active = true;

    async function load() {
      try {
        if (!refreshTick) setLoading(true);
        setError(null);
        const [data, overview] = await Promise.all([
          getHostedDatabases(session!, subId!),
          getSubscriptionOverview(session!, subId!).catch(() => null),
        ]);
        if (!active) return;
        if (overview) setDiskQuotaMb(overview.subscription.planDiskLimitMb);
        setDatabases(prev => {
          const optimistic = prev.filter(d => d.isOptimistic);
          const merged: DisplayDatabase[] = [...data];
          for (const opt of optimistic) {
            const i = merged.findIndex(d => d.databaseName === opt.databaseName);
            if (i >= 0) {
              const keep = isPending(merged[i].provisioningStatus);
              merged[i] = { ...merged[i], provisioningStatus: keep ? "creating" : merged[i].provisioningStatus, isOptimistic: keep };
            } else merged.unshift(opt);
          }
          return merged;
        });
        setPendingPasswordRotations(prev => {
          const next = { ...prev };
          let changed = false;

          for (const [databaseId, pending] of Object.entries(prev)) {
            const live = data.find(item => item.id === databaseId);
            if (!live) continue;

            if (live.dbPassword === pending.password) {
              delete next[databaseId];
              changed = true;
              setSuccessMessage(t("Database password updated for {name}.", "Database password updated for {name}.").replace("{name}", pending.databaseName));
              continue;
            }

            if (live.lastProvisionError) {
              delete next[databaseId];
              changed = true;
              setError(live.lastProvisionError);
            }
          }

          return changed ? next : prev;
        });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : t("Failed to load databases.", "Failed to load databases."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [subId, refreshTick]);

  const hasPending = useMemo(
    () => databases.some(d => isPending(d.provisioningStatus)) || Object.keys(pendingPasswordRotations).length > 0,
    [databases, pendingPasswordRotations]
  );

  useEffect(() => {
    if (!hasPending) return;
    const id = window.setInterval(() => setRefreshTick(t => t + 1), 3000);
    return () => window.clearInterval(id);
  }, [hasPending]);

  useEffect(() => {
    if (!copiedId) return;
    const t = window.setTimeout(() => setCopiedId(null), 1600);
    return () => window.clearTimeout(t);
  }, [copiedId]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 3600);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const ordered = useMemo(() =>
    [...databases].sort((a, b) => {
      if (isPending(a.provisioningStatus) !== isPending(b.provisioningStatus)) return isPending(a.provisioningStatus) ? -1 : 1;
      if (isFailed(a.provisioningStatus) !== isFailed(b.provisioningStatus)) return isFailed(a.provisioningStatus) ? -1 : 1;
      return b.createdUtc.localeCompare(a.createdUtc);
    }),
    [databases]
  );

  const healthyCount = ordered.filter(d => isHealthy(d.provisioningStatus)).length;
  const pendingCount = ordered.filter(d => isPending(d.provisioningStatus)).length;

  async function handleCopy(value: string, key: string) {
    try { await navigator.clipboard.writeText(value); setCopiedId(key); } catch { /* */ }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const session = getCustomerSession();
    const cleanName = newName.trim();
    const alias = guessedPrefix && cleanName.startsWith(guessedPrefix)
      ? cleanName.substring(guessedPrefix.length)
      : cleanName;
    const password = newPassword.trim();
    const spaceMb = Number.parseInt(newSpaceMb, 10);
    if (!session || !subId || !alias || !password || Number.isNaN(spaceMb)) return;
    setSubmitting(true); setModalError(null);

    if (!isStrongDatabasePassword(password)) {
      setModalError(t("Database password must be at least 12 characters and include uppercase, lowercase, number, and symbol.", "Database password must be at least 12 characters and include uppercase, lowercase, number, and symbol."));
      setSubmitting(false);
      return;
    }

    if (spaceMb < 128) {
      setModalError(t("Database space must be at least 128 MB.", "Database space must be at least 128 MB."));
      setSubmitting(false);
      return;
    }

    const optId = `opt-db-${crypto.randomUUID()}`;
    const optDb: DisplayDatabase = {
      id: optId, subscriptionId: subId, databaseName: alias,
      dbPassword: password,
      databaseSpaceMb: spaceMb,
      dbUser: "Allocating...", serverHost: "Waiting for node...",
      provisioningStatus: "creating", lastProvisionError: null,
      createdUtc: new Date().toISOString(), siteId: null, siteName: null,
      engine: newEngine, isOptimistic: true,
    };

    setDatabases(prev => [optDb, ...prev]);
    setIsModalOpen(false);

    try {
      const result = await createHostedDatabase(session, subId, {
        databaseName: alias,
        databasePassword: password,
        databaseSpaceMb: spaceMb,
        engine: newEngine,
      });
      if (result.database) {
        setDatabases(prev => prev.map(d => d.id === optId
          ? { ...d, ...result.database!, provisioningStatus: "creating", isOptimistic: true }
          : d
        ));
      }
      setNewName("");
      setNewPassword(generateStrongDatabasePassword());
      setNewSpaceMb("512");
      setNewEngine("sqlserver");
      setRefreshTick(t => t + 1);
    } catch (err) {
      setDatabases(prev => prev.filter(d => d.id !== optId));
      setModalError(err instanceof Error ? err.message : t("Failed to create database.", "Failed to create database."));
      setIsModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDatabase(database: HostedDatabase) {
    const session = getCustomerSession();
    if (!session || !subId) return;
    if (!window.confirm(t("Delete database {name}?", 'Delete database "{name}"?').replace("{name}", database.databaseName))) return;

    try {
      await deleteHostedDatabase(session, subId, database.id);
      setDatabases(prev => prev.map(d => d.id === database.id
        ? { ...d, provisioningStatus: "deleting" }
        : d
      ));
      setRefreshTick(t => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to delete database.", "Failed to delete database."));
    }
  }

  function openRotatePasswordModal(database: HostedDatabase) {
    setRotatePasswordError(null);
    setRotatePasswordValue(generateStrongDatabasePassword());
    setShowRotatePassword(false);
    setPasswordModalDatabase(database);
  }

  async function handleRotatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const session = getCustomerSession();
    if (!session || !subId || !passwordModalDatabase) return;

    const password = rotatePasswordValue.trim();
    if (!isStrongDatabasePassword(password)) {
      setRotatePasswordError(t("Database password must be at least 12 characters and include uppercase, lowercase, number, and symbol.", "Database password must be at least 12 characters and include uppercase, lowercase, number, and symbol."));
      return;
    }

    setRotatingPassword(true);
    setRotatePasswordError(null);
    setError(null);

    try {
      await rotateHostedDatabasePassword(session, subId, passwordModalDatabase.id, {
        databasePassword: password,
      });
      setPendingPasswordRotations(prev => ({
        ...prev,
        [passwordModalDatabase.id]: {
          password,
          databaseName: passwordModalDatabase.databaseName,
        },
      }));
      setSuccessMessage(t("Password update queued for {name}.", "Password update queued for {name}.").replace("{name}", passwordModalDatabase.databaseName));
      setPasswordModalDatabase(null);
      setRefreshTick(t => t + 1);
    } catch (err) {
      setRotatePasswordError(err instanceof Error ? err.message : t("Failed to update database password.", "Failed to update database password."));
    } finally {
      setRotatingPassword(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="al-hero">
        <div className="al-hero__text">
          <h1>{t("Database Ledger", "Database Ledger")}</h1>
          <p>{t("Manage SQL databases across this subscription. {healthyCount} live, {pendingCount} provisioning.", "Manage SQL databases across this subscription. {healthyCount} live, {pendingCount} provisioning.").replace("{healthyCount}", String(healthyCount)).replace("{pendingCount}", String(pendingCount))}</p>
        </div>
        <div className="al-hero__actions">
          <button type="button" className="al-hero__btn al-hero__btn--secondary" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCw size={16} /> {t("Refresh", "Refresh")}
          </button>
          <button type="button" className="al-hero__btn al-hero__btn--primary" onClick={openCreateModal}>
            <Plus size={16} /> {t("Create Database", "Create Database")}
          </button>
        </div>
      </section>

      {/* Stats row */}
      <section className="al-metrics" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="al-metric-card">
          <div className="al-metric-card__header">
            <div className="al-metric-card__icon al-metric-card__icon--green"><Database size={20} /></div>
            <span className="al-metric-card__badge al-metric-card__badge--green">{t("Live", "Live")}</span>
          </div>
          <p className="al-metric-card__label">{t("Healthy Databases", "Healthy Databases")}</p>
          <h2 className="al-metric-card__value">{healthyCount}</h2>
        </div>
        <div className="al-metric-card">
          <div className="al-metric-card__header">
            <div className="al-metric-card__icon al-metric-card__icon--amber"><RefreshCw size={20} /></div>
          </div>
          <p className="al-metric-card__label">{t("Provisioning", "Provisioning")}</p>
          <h2 className="al-metric-card__value">{pendingCount}</h2>
        </div>
        <div className="al-metric-card">
          <div className="al-metric-card__header">
            <div className="al-metric-card__icon al-metric-card__icon--blue"><Server size={20} /></div>
          </div>
          <p className="al-metric-card__label">{t("Total Databases", "Total Databases")}</p>
          <h2 className="al-metric-card__value">{ordered.length}</h2>
        </div>
      </section>

      {error && <div className="inline-message inline-message--error">{error}</div>}
      {successMessage && <div className="inline-message inline-message--success">{successMessage}</div>}
      {hasPending && <div className="inline-message">{t("Provisioning jobs are running. Auto-refreshing until complete.", "Provisioning jobs are running. Auto-refreshing until complete.")}</div>}

      {/* Database list */}
      {loading ? (
        <div className="empty-panel">{t("Loading databases...", "Loading databases...")}</div>
      ) : ordered.length === 0 ? (
        <div className="al-db-empty">
          <div className="al-db-empty__icon"><Database size={32} /></div>
          <h3>{t("No databases yet", "No databases yet")}</h3>
          <p>{t("Create your first SQL database for this subscription.", "Create your first SQL database for this subscription.")}</p>
          <button type="button" className="al-hero__btn al-hero__btn--primary" onClick={openCreateModal}>
            <Plus size={16} /> {t("Create First Database", "Create First Database")}
          </button>
        </div>
      ) : (
        <div className="al-db-list">
          {ordered.map(db => {
            const connStr = buildConnStr(db);
            return (
              <div key={db.id} className="al-db-card">
                <div className="al-db-card__header">
                  <div className="al-db-card__identity">
                    <div className="al-db-card__icon"><Database size={18} /></div>
                    <div>
                      <strong>{db.databaseName}</strong>
                      <span className="al-db-card__server">{db.serverHost === "Waiting for node..." ? t("Waiting for node...", "Waiting for node...") : db.serverHost}</span>
                    </div>
                  </div>
                  <div className="al-db-card__header-actions">
                    <span className={`al-db-card__badge ${isHealthy(db.provisioningStatus) ? "al-db-card__badge--live" : isPending(db.provisioningStatus) ? "al-db-card__badge--pending" : "al-db-card__badge--error"}`}>
                      {statusLabel(db.provisioningStatus, t)}
                    </span>
                    <button
                      type="button"
                      className="al-db-card__action-btn"
                      onClick={() => openRotatePasswordModal(db)}
                      disabled={db.isOptimistic || db.provisioningStatus === "deleting" || Boolean(pendingPasswordRotations[db.id])}
                    >
                      {pendingPasswordRotations[db.id] ? <RefreshCw size={15} /> : <KeyRound size={15} />}
                      {pendingPasswordRotations[db.id] ? t("Updating...", "Updating...") : t("Change password", "Change password")}
                    </button>
                    <button
                      type="button"
                      className="al-db-card__action-btn al-db-card__action-btn--danger"
                      onClick={() => void handleDeleteDatabase(db)}
                      disabled={db.isOptimistic || db.provisioningStatus === "deleting"}
                    >
                      <Trash2 size={15} />
                      {db.provisioningStatus === "deleting" ? t("Deleting...", "Deleting...") : t("Delete database", "Delete database")}
                    </button>
                  </div>
                </div>

                <div className="al-db-card__meta">
                  <div><span>{t("Engine", "Engine")}</span><strong>{engineLabel(db.engine, t)}</strong></div>
                  <div><span>{t("User", "User")}</span><strong>{db.dbUser === "Allocating..." ? t("Allocating...", "Allocating...") : db.dbUser}</strong></div>
                  <div><span>{t("Space", "Space")}</span><strong>{db.databaseSpaceMb} {t("MB", "MB")}</strong></div>
                  <div><span>{t("Scope", "Scope")}</span><strong>{db.siteName ?? t("Shared across subscription", "Shared across subscription")}</strong></div>
                  <div><span>{t("Created", "Created")}</span><strong>{new Date(db.createdUtc).toLocaleDateString()}</strong></div>
                </div>

                {db.lastProvisionError && (
                  <div className="al-db-card__error"><AlertTriangle size={14} /> {db.lastProvisionError}</div>
                )}

                <div className="al-db-card__conn">
                  <div className="al-db-card__conn-head">
                    <span>{t("Connection String", "Connection String")}</span>
                    <button type="button" className="al-gear-btn" onClick={() => void handleCopy(connStr, db.id)} title={t("Copy", "Copy")}>
                      {copiedId === db.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <code>{connStr}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div className="card stack" style={{ width: "100%", maxWidth: "520px", padding: "32px", animation: "slide-up 0.2s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{t("Create Database", "Create Database")}</h2>
              <button type="button" className="al-modal-close" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                <X size={16} />
              </button>
            </div>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.82rem", lineHeight: 1.45 }}>{t("Select an engine and enter a name — password is auto-generated.", "Select an engine and enter a name — password is auto-generated.")}</p>
            {modalError && <div className="inline-message inline-message--error">{modalError}</div>}
            <form className="stack-sm" onSubmit={e => void handleCreate(e)}>

              {/* Engine selector */}
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 8, color: "var(--text)" }}>{t("Database Engine", "Database Engine")}</span>
                <div className="al-engine-grid">
                  {([
                    {
                      key: "sqlserver" as const,
                      label: t("SQL Server", "SQL Server"),
                      version: "2022",
                      port: "1433",
                      desc: t("Great for .NET / Windows apps", "Great for .NET / Windows apps"),
                      color: "#0078d4",
                      glow: "rgba(0, 120, 212, 0.15)",
                      bg: "rgba(0, 120, 212, 0.05)",
                      svg: (
                        <svg viewBox="0 0 48 48" width="22" height="22">
                          <path d="M24,4C14.1,4,6,6.7,6,10v28c0,3.3,8.1,6,18,6s18-2.7,18-6V10C42,6.7,33.9,4,24,4z" fill="#0078d4" opacity="0.1" />
                          <path d="M42,10v8c0,3.3-8.1,6-18,6S6,21.3,6,18v-8" fill="none" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M42,20v8c0,3.3-8.1,6-18,6S6,31.3,6,28v-8" fill="none" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M42,30v8c0,3.3-8.1,6-18,6S6,41.3,6,38v-8" fill="none" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" />
                          <ellipse cx="24" cy="10" rx="18" ry="6" fill="#ffffff" stroke="#0078d4" strokeWidth="2.5" />
                          <g transform="translate(16, 17)">
                            <rect x="0" y="0" width="7" height="7" fill="#f25022" />
                            <rect x="9" y="0" width="7" height="7" fill="#7fba00" />
                            <rect x="0" y="9" width="7" height="7" fill="#00a4ef" />
                            <rect x="9" y="9" width="7" height="7" fill="#ffb900" />
                          </g>
                        </svg>
                      )
                    },
                    {
                      key: "mysql" as const,
                      label: t("MySQL", "MySQL"),
                      version: "8.0",
                      port: "3306",
                      desc: t("Great for PHP / Node.js apps", "Great for PHP / Node.js apps"),
                      color: "#00758f",
                      glow: "rgba(0, 117, 143, 0.15)",
                      bg: "rgba(0, 117, 143, 0.05)",
                      svg: (
                        <svg viewBox="0 0 48 48" width="22" height="22">
                          <path d="M24,4C14.1,4,6,6.7,6,10v28c0,3.3,8.1,6,18,6s18-2.7,18-6V10C42,6.7,33.9,4,24,4z" fill="#f29111" opacity="0.1" />
                          <path d="M42,10v8c0,3.3-8.1,6-18,6S6,21.3,6,18v-8" fill="none" stroke="#00758f" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M42,20v8c0,3.3-8.1,6-18,6S6,31.3,6,28v-8" fill="none" stroke="#00758f" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M42,30v8c0,3.3-8.1,6-18,6S6,41.3,6,38v-8" fill="none" stroke="#00758f" strokeWidth="2.5" strokeLinecap="round" />
                          <ellipse cx="24" cy="10" rx="18" ry="6" fill="#ffffff" stroke="#00758f" strokeWidth="2.5" />
                          <path d="M14,28 C16,22 24,16 34,20 C28,18 20,20 18,25 C20,22 25,21 30,22 C22,23 18,26 14,28" fill="#f29111" />
                          <path d="M24,20 C26,17 30,15 35,16 C31,16 28,18 27,20 Z" fill="#00758f" />
                        </svg>
                      )
                    },
                  ]).map(eng => {
                    const active = newEngine === eng.key;
                    const cardStyle = {
                      "--active-bg": eng.bg,
                      "--active-color": eng.color,
                      "--active-glow": eng.glow,
                      "--icon-bg": active ? "#ffffff" : "#f1f5f9"
                    } as React.CSSProperties;

                    return (
                      <button
                        key={eng.key}
                        type="button"
                        onClick={() => setNewEngine(eng.key)}
                        disabled={submitting}
                        className={`al-engine-card ${active ? "al-engine-card--active" : ""}`}
                        style={cardStyle}
                      >
                        <div className="al-engine-icon-wrapper">
                          {eng.svg}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: active ? eng.color : "var(--text)", display: "block", marginBottom: 2 }}>
                          {eng.label}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8, display: "block" }}>
                          {t("v{version} · Port {port}", "v{version} · Port {port}").replace("{version}", eng.version).replace("{port}", eng.port)}
                        </span>
                        <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{eng.desc}</p>
                        {active && (
                          <div className="al-engine-badge-selected" style={{ "--active-color": eng.color } as any}>
                            ✓ {t("Selected", "Selected")}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Database name */}
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{t("Database Name", "Database Name")}</span>
                <div className="al-input-group" style={{ "--focused-color": newEngine === "sqlserver" ? "#0078d4" : "#00758f", "--focused-glow": newEngine === "sqlserver" ? "rgba(0, 120, 212, 0.15)" : "rgba(0, 117, 143, 0.15)" } as any}>
                  {guessedPrefix && (
                    <span className="al-input-prefix">{guessedPrefix}</span>
                  )}
                  <input
                    type="text"
                    className="al-input-field"
                    autoFocus
                    placeholder={t("e.g. main_db", "e.g. main_db")}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                  {t("Letters, numbers, and underscores only. The prefix shown above is handled automatically.", "Letters, numbers, and underscores only. The prefix shown above is handled automatically.")}
                </span>
              </label>

              {/* Password */}
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{t("Password", "Password")}</span>
                <div className="al-password-wrapper" style={{ "--focused-color": newEngine === "sqlserver" ? "#0078d4" : "#00758f", "--focused-glow": newEngine === "sqlserver" ? "rgba(0, 120, 212, 0.15)" : "rgba(0, 117, 143, 0.15)" } as any}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={submitting}
                    required
                    minLength={12}
                    className="al-password-input"
                  />
                  <div className="al-password-actions">
                    <button
                      type="button"
                      className="al-password-action-btn"
                      title={showPassword ? t("Hide password", "Hide password") : t("Show password", "Show password")}
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={submitting}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      className="al-password-action-btn"
                      title={copiedPassword ? t("Copied!", "Copied!") : t("Copy password", "Copy password")}
                      onClick={() => void handleCopyPassword(newPassword, setCopiedPassword)}
                      disabled={submitting}
                    >
                      {copiedPassword ? <CheckCircle2 size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                    </button>
                    <button
                      type="button"
                      className="al-password-action-btn"
                      title={t("Regenerate password", "Regenerate password")}
                      onClick={() => setNewPassword(generateStrongDatabasePassword())}
                      disabled={submitting}
                    >
                      <Sparkles size={15} />
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                  {t("At least 12 characters including uppercase, lowercase, numbers, and symbols.", "At least 12 characters including uppercase, lowercase, numbers, and symbols.")}
                </span>
              </label>

              {/* Storage */}
              <label style={{ display: "grid", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{t("Storage Space", "Storage Space")}</span>
                  <span style={{ fontSize: "0.88rem", color: newEngine === "sqlserver" ? "#0078d4" : "#00758f", fontWeight: 700 }}>{newSpaceMb} {t("MB", "MB")}</span>
                </div>
                
                {/* Visual storage progress bar */}
                {planDiskLimitMb > 0 && (
                  <div className="al-disk-bar">
                    <div
                      className="al-disk-segment al-disk-segment--used"
                      style={{ width: `${(totalAllocatedSpaceMb / planDiskLimitMb) * 100}%` }}
                      title={t("Allocated by other DBs: {allocated} MB", "Allocated by other DBs: {allocated} MB").replace("{allocated}", String(totalAllocatedSpaceMb))}
                    />
                    <div
                      className="al-disk-segment"
                      style={{
                        width: `${(Number(newSpaceMb) / planDiskLimitMb) * 100}%`,
                        backgroundColor: newEngine === "sqlserver" ? "#0078d4" : "#00758f"
                      }}
                      title={t("Selected size: {size} MB", "Selected size: {size} MB").replace("{size}", newSpaceMb)}
                    />
                    <div
                      className="al-disk-segment al-disk-segment--free"
                      style={{ width: `${Math.max(0, 100 - ((totalAllocatedSpaceMb + Number(newSpaceMb)) / planDiskLimitMb) * 100)}%` }}
                      title={t("Available free: {free} MB", "Available free: {free} MB").replace("{free}", String(Math.max(0, planDiskLimitMb - totalAllocatedSpaceMb - Number(newSpaceMb))))}
                    />
                  </div>
                )}

                <input
                  type="range"
                  min={128}
                  max={maxSpaceMb}
                  step={128}
                  value={Math.min(Number(newSpaceMb), maxSpaceMb)}
                  onChange={e => setNewSpaceMb(e.target.value)}
                  disabled={submitting}
                  className="al-slider"
                  style={{ "--slider-color": newEngine === "sqlserver" ? "#0078d4" : "#00758f" } as any}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <span>128 {t("MB", "MB")}</span>
                  <span>
                    {maxSpaceMb >= 1024 ? t("{size} GB", "{size} GB").replace("{size}", (maxSpaceMb / 1024).toFixed(maxSpaceMb % 1024 === 0 ? 0 : 1)) : t("{size} MB", "{size} MB").replace("{size}", String(maxSpaceMb))}
                    {planDiskLimitMb > 0 && <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>{t("remaining", "remaining")}</span>}
                  </span>
                </div>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: "12px" }}>
                <button type="button" className="al-hero__btn al-hero__btn--secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>{t("Cancel", "Cancel")}</button>
                <button type="submit" className="primary-button" style={{ background: newEngine === "sqlserver" ? "#0078d4" : "#00758f" }} disabled={submitting}>
                  {submitting ? t("Provisioning...", "Provisioning...") : (newEngine === "sqlserver" ? t("Create SQL Server Database", "Create SQL Server Database") : t("Create MySQL Database", "Create MySQL Database"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordModalDatabase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: "16px" }}>
          <div className="card stack" style={{ width: "100%", maxWidth: "480px", padding: "32px", animation: "slide-up 0.2s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>{t("Change Database Password", "Change Database Password")}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {t(engineLabel(passwordModalDatabase.engine), engineLabel(passwordModalDatabase.engine))} · {passwordModalDatabase.databaseName}
                  </span>
                </div>
              </div>
              <button type="button" className="al-modal-close" onClick={() => setPasswordModalDatabase(null)} disabled={rotatingPassword}>
                <X size={16} />
              </button>
            </div>
            <p className="muted" style={{ fontSize: "0.8rem", lineHeight: 1.45, marginTop: 0 }}>{t("The new password will be applied asynchronously on the database server. Your connection string will update automatically once complete.", "The new password will be applied asynchronously on the database server. Your connection string will update automatically once complete.")}</p>
            {rotatePasswordError && <div className="inline-message inline-message--error">{rotatePasswordError}</div>}
            <form className="stack-sm" onSubmit={e => void handleRotatePassword(e)}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{t("New Password", "New Password")}</span>
                <div className="al-password-wrapper" style={{ "--focused-color": passwordModalDatabase.engine === "sqlserver" ? "#0078d4" : "#00758f", "--focused-glow": passwordModalDatabase.engine === "sqlserver" ? "rgba(0, 120, 212, 0.15)" : "rgba(0, 117, 143, 0.15)" } as any}>
                  <input
                    type={showRotatePassword ? "text" : "password"}
                    value={rotatePasswordValue}
                    onChange={e => setRotatePasswordValue(e.target.value)}
                    disabled={rotatingPassword}
                    required
                    minLength={12}
                    className="al-password-input"
                  />
                  <div className="al-password-actions">
                    <button
                      type="button"
                      className="al-password-action-btn"
                      title={showRotatePassword ? t("Hide password", "Hide password") : t("Show password", "Show password")}
                      onClick={() => setShowRotatePassword(!showRotatePassword)}
                      disabled={rotatingPassword}
                    >
                      {showRotatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      className="al-password-action-btn"
                      title={copiedRotatePassword ? t("Copied!", "Copied!") : t("Copy password", "Copy password")}
                      onClick={() => void handleCopyPassword(rotatePasswordValue, setCopiedRotatePassword)}
                      disabled={rotatingPassword}
                    >
                      {copiedRotatePassword ? <CheckCircle2 size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                    </button>
                    <button
                      type="button"
                      className="al-password-action-btn"
                      title={t("Regenerate password", "Regenerate password")}
                      onClick={() => setRotatePasswordValue(generateStrongDatabasePassword())}
                      disabled={rotatingPassword}
                    >
                      <Sparkles size={15} />
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{t("At least 12 characters including uppercase, lowercase, numbers, and symbols.", "At least 12 characters including uppercase, lowercase, numbers, and symbols.")}</span>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: "12px" }}>
                <button type="button" className="al-hero__btn al-hero__btn--secondary" onClick={() => setPasswordModalDatabase(null)} disabled={rotatingPassword}>{t("Cancel", "Cancel")}</button>
                <button type="submit" className="primary-button" style={{ background: passwordModalDatabase.engine === "sqlserver" ? "#0078d4" : "#00758f" }} disabled={rotatingPassword}>
                  {rotatingPassword ? t("Updating...", "Updating...") : t("Save Password", "Save Password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
