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
  AlertTriangle, Trash2, KeyRound, Sparkles,
  Eye, EyeOff, X, ChevronDown, MoreHorizontal
} from "lucide-react";
import { getActiveLocale, useLocalization } from "../lib/i18n";

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
  while (chars.length < 16) chars.push(all[Math.floor(Math.random() * all.length)]);
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
function isDeleting(s: string) { return s.trim().toLowerCase() === "deleting"; }

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
  const port = db.port || (db.engine === "postgres" ? 5432 : 3306);
  if (db.engine === "postgres") {
    return `Host=${db.serverHost};Port=${port};Database=${db.databaseName};Username=${db.dbUser};Password=${pw};`;
  }
  return `Server=${db.serverHost};Port=${port};Database=${db.databaseName};Uid=${db.dbUser};Pwd=${pw};`;
}

function engineLabel(engine: string) {
  return engine === "postgres" ? "PostgreSQL" : "MySQL";
}

function engineColor(engine: string) {
  return engine === "postgres" ? "#336791" : "#00758f";
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
  const [newEngine, setNewEngine] = useState<"mysql" | "postgres">("mysql");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordModalDatabase, setPasswordModalDatabase] = useState<HostedDatabase | null>(null);
  const [rotatePasswordValue, setRotatePasswordValue] = useState(() => generateStrongDatabasePassword());
  const [rotatePasswordError, setRotatePasswordError] = useState<string | null>(null);
  const [rotatingPassword, setRotatingPassword] = useState(false);
  const [pendingPasswordRotations, setPendingPasswordRotations] = useState<Record<string, { password: string; databaseName: string }>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showRotatePassword, setShowRotatePassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedRotatePassword, setCopiedRotatePassword] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

  const guessedPrefix = useMemo(() => {
    if (databases.length > 0) {
      const dbNames = databases.filter(d => !d.isOptimistic).map(d => d.databaseName);
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
    setNewEngine("mysql");
    setNewName("");
    setShowPassword(false);
    setIsModalOpen(true);
  }

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

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (!expandedMenuId) return;
    const handler = () => setExpandedMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [expandedMenuId]);

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
      dbPassword: password, databaseSpaceMb: spaceMb,
      dbUser: "Allocating...", serverHost: "Waiting for node...",
      provisioningStatus: "creating", lastProvisionError: null,
      createdUtc: new Date().toISOString(), siteId: null, siteName: null,
      engine: newEngine, port: 0, isOptimistic: true,
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
      setNewName(""); setNewPassword(generateStrongDatabasePassword());
      setNewSpaceMb("512"); setNewEngine("mysql");
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
      setDatabases(prev => prev.map(d => d.id === database.id ? { ...d, provisioningStatus: "deleting" } : d));
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
    setExpandedMenuId(null);
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
    setRotatingPassword(true); setRotatePasswordError(null); setError(null);
    try {
      await rotateHostedDatabasePassword(session, subId, passwordModalDatabase.id, { databasePassword: password });
      setPendingPasswordRotations(prev => ({
        ...prev,
        [passwordModalDatabase.id]: { password, databaseName: passwordModalDatabase.databaseName },
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

  const engineCards = [
    {
      key: "postgres" as const,
      label: "PostgreSQL",
      version: "16", port: "auto",
      desc: t("Great for Django / modern apps", "Great for Django / modern apps"),
      color: "#336791", glow: "rgba(51,103,145,0.15)", bg: "rgba(51,103,145,0.06)",
      svg: (
        <svg viewBox="0 0 48 48" width="22" height="22">
          <ellipse cx="24" cy="10" rx="18" ry="6" fill="#fff" stroke="#336791" strokeWidth="2.5" />
          <path d="M42,10v8c0,3.3-8.1,6-18,6S6,21.3,6,18v-8" fill="none" stroke="#336791" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42,20v8c0,3.3-8.1,6-18,6S6,31.3,6,28v-8" fill="none" stroke="#336791" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42,30v8c0,3.3-8.1,6-18,6S6,41.3,6,38v-8" fill="none" stroke="#336791" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="21" r="3" fill="#336791"/><circle cx="28" cy="21" r="3" fill="#336791"/>
        </svg>
      )
    },
    {
      key: "mysql" as const,
      label: "MySQL",
      version: "8.0", port: "3306",
      desc: t("Great for PHP / Node.js apps", "Great for PHP / Node.js apps"),
      color: "#00758f", glow: "rgba(0,117,143,0.15)", bg: "rgba(0,117,143,0.06)",
      svg: (
        <svg viewBox="0 0 48 48" width="22" height="22">
          <ellipse cx="24" cy="10" rx="18" ry="6" fill="#fff" stroke="#00758f" strokeWidth="2.5" />
          <path d="M42,10v8c0,3.3-8.1,6-18,6S6,21.3,6,18v-8" fill="none" stroke="#00758f" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42,20v8c0,3.3-8.1,6-18,6S6,31.3,6,28v-8" fill="none" stroke="#00758f" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42,30v8c0,3.3-8.1,6-18,6S6,41.3,6,38v-8" fill="none" stroke="#00758f" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14,28 C16,22 24,16 34,20 C28,18 20,20 18,25 C20,22 25,21 30,22 C22,23 18,26 14,28" fill="#f29111"/>
        </svg>
      )
    },
  ];

  return (
    <>
      {/* ── Page header ── */}
      <div className="db2-header">
        <div className="db2-header__left">
          <h1 className="db2-header__title">{t("Databases", "Databases")}</h1>
          <div className="db2-header__stats">
            <span className="db2-stat db2-stat--green">
              <span className="db2-stat__dot" />
              {healthyCount} {t("live", "live")}
            </span>
            {pendingCount > 0 && (
              <span className="db2-stat db2-stat--amber">
                <RefreshCw size={11} className="db2-stat__spin" />
                {pendingCount} {t("provisioning", "provisioning")}
              </span>
            )}
            <span className="db2-stat db2-stat--muted">
              {ordered.length} {t("total", "total")}
            </span>
          </div>
        </div>
        <div className="db2-header__actions">
          <button type="button" className="al-hero__btn al-hero__btn--secondary" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCw size={15} /> {t("Refresh", "Refresh")}
          </button>
          <button type="button" className="al-hero__btn al-hero__btn--primary" onClick={openCreateModal}>
            <Plus size={15} /> {t("New Database", "New Database")}
          </button>
        </div>
      </div>

      {/* ── Notifications ── */}
      {error && <div className="inline-message inline-message--error">{error}</div>}
      {successMessage && <div className="inline-message inline-message--success">{successMessage}</div>}
      {hasPending && <div className="inline-message"><RefreshCw size={13} className="sdb-spin-icon" />{t("Provisioning in progress — refreshing automatically.", "Provisioning in progress — refreshing automatically.")}</div>}

      {/* ── List ── */}
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
        <div className="db2-list">
          {ordered.map(db => {
            const connStr = buildConnStr(db);
            const color = engineColor(db.engine);
            const isMenuOpen = expandedMenuId === db.id;
            const isPendingRotation = !!pendingPasswordRotations[db.id];

            return (
              <div key={db.id} className="db2-card">
                {/* Card header */}
                <div className="db2-card__head">
                  <div className="db2-card__identity">
                    <div className="db2-card__db-icon" style={{ background: `${color}14`, color }}>
                      <Database size={16} />
                    </div>
                    <div className="db2-card__name-block">
                      <span className="db2-card__name">{db.databaseName}</span>
                      <span className="db2-card__engine-tag" style={{ background: `${color}12`, color }}>
                        {engineLabel(db.engine)}
                      </span>
                    </div>
                  </div>
                  <div className="db2-card__head-right">
                    <span className={`db2-badge ${isHealthy(db.provisioningStatus) ? "db2-badge--live" : isPending(db.provisioningStatus) ? "db2-badge--pending" : "db2-badge--error"}`}>
                      {isHealthy(db.provisioningStatus) && <span className="db2-badge__dot" />}
                      {isPending(db.provisioningStatus) && <RefreshCw size={10} className="db2-badge__spin" />}
                      {isFailed(db.provisioningStatus) && <AlertTriangle size={10} />}
                      {statusLabel(db.provisioningStatus, t)}
                    </span>

                    {/* Actions menu */}
                    <div className="db2-menu-wrap" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="db2-menu-btn"
                        onClick={() => setExpandedMenuId(isMenuOpen ? null : db.id)}
                        disabled={db.isOptimistic}
                        aria-label={t("Actions", "Actions")}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {isMenuOpen && (
                        <div className="db2-menu">
                          <button
                            type="button"
                            className="db2-menu__item"
                            onClick={() => openRotatePasswordModal(db)}
                            disabled={isDeleting(db.provisioningStatus) || isPendingRotation}
                          >
                            {isPendingRotation ? <RefreshCw size={14} /> : <KeyRound size={14} />}
                            {isPendingRotation ? t("Updating password...", "Updating password...") : t("Change Password", "Change Password")}
                          </button>
                          <div className="db2-menu__divider" />
                          <button
                            type="button"
                            className="db2-menu__item db2-menu__item--danger"
                            onClick={() => void handleDeleteDatabase(db)}
                            disabled={db.isOptimistic || isDeleting(db.provisioningStatus)}
                          >
                            <Trash2 size={14} />
                            {isDeleting(db.provisioningStatus) ? t("Deleting...", "Deleting...") : t("Delete Database", "Delete Database")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                <div className="db2-card__meta">
                  <div className="db2-meta-item">
                    <span className="db2-meta-item__label">{t("Host", "Host")}</span>
                    <span className="db2-meta-item__value">{db.serverHost === "Waiting for node..." ? <span className="db2-muted-italic">{t("Allocating...", "Allocating...")}</span> : db.serverHost}</span>
                  </div>
                  <div className="db2-meta-sep" />
                  <div className="db2-meta-item">
                    <span className="db2-meta-item__label">{t("User", "User")}</span>
                    <span className="db2-meta-item__value">{db.dbUser === "Allocating..." ? <span className="db2-muted-italic">{t("Allocating...", "Allocating...")}</span> : db.dbUser}</span>
                  </div>
                  <div className="db2-meta-sep" />
                  <div className="db2-meta-item">
                    <span className="db2-meta-item__label">{t("Size", "Size")}</span>
                    <span className="db2-meta-item__value">{db.databaseSpaceMb} MB</span>
                  </div>
                  <div className="db2-meta-sep" />
                  <div className="db2-meta-item">
                    <span className="db2-meta-item__label">{t("Created", "Created")}</span>
                    <span className="db2-meta-item__value">{new Date(db.createdUtc).toLocaleDateString(getActiveLocale())}</span>
                  </div>
                  {db.siteName && (
                    <>
                      <div className="db2-meta-sep" />
                      <div className="db2-meta-item">
                        <span className="db2-meta-item__label">{t("Site", "Site")}</span>
                        <span className="db2-meta-item__value">{db.siteName}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Error */}
                {db.lastProvisionError && (
                  <div className="db2-card__error">
                    <AlertTriangle size={13} />
                    {db.lastProvisionError}
                  </div>
                )}

                {/* Connection string */}
                <div className="db2-card__conn">
                  <div className="db2-card__conn-label">
                    <span>{t("Connection String", "Connection String")}</span>
                    <button
                      type="button"
                      className={`db2-copy-btn ${copiedId === db.id ? "db2-copy-btn--copied" : ""}`}
                      onClick={() => void handleCopy(connStr, db.id)}
                      aria-label={copiedId === db.id ? t("Copied!", "Copied!") : t("Copy connection string", "Copy connection string")}
                    >
                      {copiedId === db.id ? <><CheckCircle2 size={13} /> {t("Copied", "Copied")}</> : <><Copy size={13} /> {t("Copy", "Copy")}</>}
                    </button>
                  </div>
                  <code className="db2-card__conn-code">{connStr}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Database Modal ── */}
      {isModalOpen && (
        <div className="db2-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="db2-modal" onClick={e => e.stopPropagation()}>
            <div className="db2-modal__head">
              <div>
                <h2 className="db2-modal__title">{t("Create Database", "Create Database")}</h2>
                <p className="db2-modal__sub">{t("Choose an engine, name your database, and set a password.", "Choose an engine, name your database, and set a password.")}</p>
              </div>
              <button type="button" className="al-modal-close" onClick={() => setIsModalOpen(false)} disabled={submitting} aria-label="Close"><X size={16} /></button>
            </div>

            {modalError && <div className="inline-message inline-message--error">{modalError}</div>}

            <form className="stack-sm" onSubmit={e => void handleCreate(e)}>
              {/* Engine */}
              <div>
                <span className="db2-form-label">{t("Engine", "Engine")}</span>
                <div className="al-engine-grid">
                  {engineCards.map(eng => {
                    const active = newEngine === eng.key;
                    return (
                      <button
                        key={eng.key}
                        type="button"
                        onClick={() => setNewEngine(eng.key)}
                        disabled={submitting}
                        className={`al-engine-card ${active ? "al-engine-card--active" : ""}`}
                        style={{ "--active-bg": eng.bg, "--active-color": eng.color, "--active-glow": eng.glow, "--icon-bg": active ? "#fff" : "#f1f5f9" } as React.CSSProperties}
                      >
                        <div className="al-engine-icon-wrapper">{eng.svg}</div>
                        <span className="sdb-eng-name" style={{ color: active ? eng.color : "var(--text)" }}>{eng.label}</span>
                        <span className="sdb-eng-version">v{eng.version} · Port {eng.port}</span>
                        <p className="sdb-eng-desc">{eng.desc}</p>
                        {active && <div className="al-engine-badge-selected" style={{ "--active-color": eng.color } as any}>✓ {t("Selected", "Selected")}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <label className="sdb-form-field">
                <span className="db2-form-label">{t("Database Name", "Database Name")}</span>
                <div className="al-input-group" style={{ "--focused-color": newEngine === "postgres" ? "#336791" : "#00758f", "--focused-glow": newEngine === "postgres" ? "rgba(51,103,145,0.15)" : "rgba(0,117,143,0.15)" } as any}>
                  {guessedPrefix && <span className="al-input-prefix">{guessedPrefix}</span>}
                  <input
                    type="text" className="al-input-field" autoFocus
                    placeholder={t("e.g. main_db", "e.g. main_db")}
                    value={newName} onChange={e => setNewName(e.target.value)}
                    disabled={submitting} required
                  />
                </div>
                <span className="db2-form-hint">{t("Letters, numbers, and underscores only. Prefix is added automatically.", "Letters, numbers, and underscores only. Prefix is added automatically.")}</span>
              </label>

              {/* Password */}
              <label className="sdb-form-field">
                <span className="db2-form-label">{t("Password", "Password")}</span>
                <div className="al-password-wrapper" style={{ "--focused-color": newEngine === "postgres" ? "#336791" : "#00758f", "--focused-glow": newEngine === "postgres" ? "rgba(51,103,145,0.15)" : "rgba(0,117,143,0.15)" } as any}>
                  <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={submitting} required minLength={12} className="al-password-input" />
                  <div className="al-password-actions">
                    <button type="button" className="al-password-action-btn" title={showPassword ? t("Hide", "Hide") : t("Show", "Show")} onClick={() => setShowPassword(!showPassword)} disabled={submitting}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button type="button" className="al-password-action-btn" title={copiedPassword ? t("Copied!", "Copied!") : t("Copy", "Copy")} onClick={() => void handleCopyPassword(newPassword, setCopiedPassword)} disabled={submitting}>{copiedPassword ? <CheckCircle2 size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}</button>
                    <button type="button" className="al-password-action-btn" title={t("Regenerate", "Regenerate")} onClick={() => setNewPassword(generateStrongDatabasePassword())} disabled={submitting}><Sparkles size={15} /></button>
                  </div>
                </div>
                <span className="db2-form-hint">{t("Min 12 chars — uppercase, lowercase, numbers, and symbols.", "Min 12 chars — uppercase, lowercase, numbers, and symbols.")}</span>
              </label>

              {/* Storage */}
              <div className="sdb-form-field">
                <div className="sdb-storage-row">
                  <span className="db2-form-label sdb-storage-label">{t("Storage", "Storage")}</span>
                  <span className="sdb-storage-value" style={{ color: newEngine === "postgres" ? "#336791" : "#00758f" }}>{newSpaceMb} MB</span>
                </div>
                {planDiskLimitMb > 0 && (
                  <div className="al-disk-bar">
                    <div className="al-disk-segment al-disk-segment--used" style={{ width: `${(totalAllocatedSpaceMb / planDiskLimitMb) * 100}%` }} />
                    <div className="al-disk-segment" style={{ width: `${(Number(newSpaceMb) / planDiskLimitMb) * 100}%`, backgroundColor: newEngine === "postgres" ? "#336791" : "#00758f" }} />
                    <div className="al-disk-segment al-disk-segment--free" style={{ width: `${Math.max(0, 100 - ((totalAllocatedSpaceMb + Number(newSpaceMb)) / planDiskLimitMb) * 100)}%` }} />
                  </div>
                )}
                <input type="range" min={128} max={maxSpaceMb} step={128} value={Math.min(Number(newSpaceMb), maxSpaceMb)} onChange={e => setNewSpaceMb(e.target.value)} disabled={submitting} className="al-slider" style={{ "--slider-color": newEngine === "postgres" ? "#336791" : "#00758f" } as any} />
                <div className="sdb-range-labels">
                  <span>128 MB</span>
                  <span>
                    {maxSpaceMb >= 1024 ? `${(maxSpaceMb / 1024).toFixed(maxSpaceMb % 1024 === 0 ? 0 : 1)} GB` : `${maxSpaceMb} MB`}
                    {planDiskLimitMb > 0 && <span className="sdb-range-remaining">{t("remaining", "remaining")}</span>}
                  </span>
                </div>
              </div>

              <div className="db2-modal__footer">
                <button type="button" className="al-hero__btn al-hero__btn--secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>{t("Cancel", "Cancel")}</button>
                <button type="submit" className="primary-button sdb-submit-btn" style={{ background: newEngine === "postgres" ? "#336791" : "#00758f" }} disabled={submitting}>
                  {submitting ? t("Creating...", "Creating...") : `${t("Create", "Create")} ${engineLabel(newEngine)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {passwordModalDatabase && (
        <div className="db2-overlay" onClick={() => !rotatingPassword && setPasswordModalDatabase(null)}>
          <div className="db2-modal sdb-modal--narrow" onClick={e => e.stopPropagation()}>
            <div className="db2-modal__head">
              <div>
                <h2 className="db2-modal__title">{t("Change Password", "Change Password")}</h2>
                <p className="db2-modal__sub sdb-modal-desc">
                  <span className="sdb-engine-chip" style={{ background: `${engineColor(passwordModalDatabase.engine)}12`, color: engineColor(passwordModalDatabase.engine) }}>
                    {engineLabel(passwordModalDatabase.engine)}
                  </span>
                  {" "}{passwordModalDatabase.databaseName}
                </p>
              </div>
              <button type="button" className="al-modal-close" onClick={() => setPasswordModalDatabase(null)} disabled={rotatingPassword} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="muted sdb-pw-desc">{t("The new password will be applied on the database server. Your connection string updates automatically once complete.", "The new password will be applied on the database server. Your connection string updates automatically once complete.")}</p>
            {rotatePasswordError && <div className="inline-message inline-message--error">{rotatePasswordError}</div>}
            <form className="stack-sm" onSubmit={e => void handleRotatePassword(e)}>
              <label className="sdb-form-field">
                <span className="db2-form-label">{t("New Password", "New Password")}</span>
                <div className="al-password-wrapper" style={{ "--focused-color": passwordModalDatabase.engine === "postgres" ? "#336791" : "#00758f", "--focused-glow": passwordModalDatabase.engine === "postgres" ? "rgba(51,103,145,0.15)" : "rgba(0,117,143,0.15)" } as any}>
                  <input type={showRotatePassword ? "text" : "password"} value={rotatePasswordValue} onChange={e => setRotatePasswordValue(e.target.value)} disabled={rotatingPassword} required minLength={12} className="al-password-input" />
                  <div className="al-password-actions">
                    <button type="button" className="al-password-action-btn" onClick={() => setShowRotatePassword(!showRotatePassword)} disabled={rotatingPassword} aria-label={showRotatePassword ? "Hide password" : "Show password"}>{showRotatePassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button type="button" className="al-password-action-btn" onClick={() => void handleCopyPassword(rotatePasswordValue, setCopiedRotatePassword)} disabled={rotatingPassword} aria-label={copiedRotatePassword ? "Copied" : "Copy password"}>{copiedRotatePassword ? <CheckCircle2 size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}</button>
                    <button type="button" className="al-password-action-btn" onClick={() => setRotatePasswordValue(generateStrongDatabasePassword())} disabled={rotatingPassword} aria-label="Regenerate password"><Sparkles size={15} /></button>
                  </div>
                </div>
                <span className="db2-form-hint">{t("Min 12 chars — uppercase, lowercase, numbers, and symbols.", "Min 12 chars — uppercase, lowercase, numbers, and symbols.")}</span>
              </label>
              <div className="db2-modal__footer">
                <button type="button" className="al-hero__btn al-hero__btn--secondary" onClick={() => setPasswordModalDatabase(null)} disabled={rotatingPassword}>{t("Cancel", "Cancel")}</button>
                <button type="submit" className="primary-button sdb-submit-btn" style={{ background: passwordModalDatabase.engine === "postgres" ? "#336791" : "#00758f" }} disabled={rotatingPassword}>
                  {rotatingPassword ? t("Saving...", "Saving...") : t("Save Password", "Save Password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
