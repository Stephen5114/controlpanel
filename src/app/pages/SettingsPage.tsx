import { User, Mail, Calendar, Shield, Lock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  changePassword,
  getCustomerProfile,
  type CustomerProfile,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { AuthPasswordField } from "../components/AuthPasswordField";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { getActiveLocale, useLocalization } from "../lib/i18n";

function formatDate(value: string | null | undefined, t?: (key: string, def: string) => string) {
  const dash = t?.("-", "-");
  if (!value) return dash;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dash;
  return new Intl.DateTimeFormat(getActiveLocale(), { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function SettingsPage() {
  const { t } = useLocalization();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const session = getCustomerSession();
      if (!session) return;
      try {
        const result = await getCustomerProfile(session);
        if (!cancelled) setProfile(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("Failed to load profile.", "Failed to load profile."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: t("New passwords do not match.", "New passwords do not match.") });
      return;
    }
    const session = getCustomerSession();
    if (!session) return;
    setPwSaving(true);
    setPwMessage(null);
    try {
      const result = await changePassword(session, { currentPassword, newPassword });
      setPwMessage({ type: "success", text: result.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMessage({ type: "error", text: err instanceof Error ? err.message : t("Failed to change password.", "Failed to change password.") });
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="stack">
        <section className="page-hero">
          <p className="eyebrow">{t("Settings", "Settings")}</p>
          <h1>{t("Account settings", "Account settings")}</h1>
        </section>
        <section className="content-grid">
          <article className="card span-3">
            <div className="inline-message">{t("Loading account information...", "Loading account information...")}</div>
          </article>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <section className="page-hero">
          <p className="eyebrow">{t("Settings", "Settings")}</p>
          <h1>{t("Account settings", "Account settings")}</h1>
        </section>
        <section className="content-grid">
          <article className="card span-3">
            <div className="inline-message inline-message--error">{error}</div>
          </article>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="page-hero">
        <p className="eyebrow">{t("Settings", "Settings")}</p>
        <h1>{t("Account settings", "Account settings")}</h1>
        <p className="page-copy">{t("Manage your profile and security.", "Manage your profile and security.")}</p>
      </section>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "16px"
        }}
      >
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "profile" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "profile" ? "var(--primary)" : "var(--muted)",
            fontSize: "0.95rem",
            fontWeight: 700,
            padding: "12px 4px",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          type="button"
        >
          {t("Profile", "Profile")}
        </button>
        <button
          onClick={() => setActiveTab("security")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "security" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "security" ? "var(--primary)" : "var(--muted)",
            fontSize: "0.95rem",
            fontWeight: 700,
            padding: "12px 4px",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          type="button"
        >
          {t("Security & Password", "Security & Password")}
        </button>
      </div>

      {activeTab === "profile" && (
        <div style={{ maxWidth: "720px" }}>
          <article className="card" style={{ background: "var(--surface)" }}>
            <div className="section-head" style={{ marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{t("Profile Information", "Profile Information")}</h3>
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: "2px" }}>{t("Your account registration details", "Your account registration details")}</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "16px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)"
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <User size={18} style={{ color: "var(--muted)" }} />
                  <strong style={{ fontWeight: 600, color: "var(--text)" }}>{t("Username", "Username")}</strong>
                </span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>{profile?.username || "-"}</span>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "16px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)"
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <Mail size={18} style={{ color: "var(--muted)" }} />
                  <strong style={{ fontWeight: 600, color: "var(--text)" }}>{t("Email", "Email")}</strong>
                </span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>{profile?.email}</span>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "16px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)"
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <Shield size={18} style={{ color: "var(--muted)" }} />
                  <strong style={{ fontWeight: 600, color: "var(--text)" }}>{t("Account Status", "Account Status")}</strong>
                </span>
                <span className={`badge ${profile?.status === "active" ? "badge--success" : "badge--warning"}`} style={{ padding: "6px 14px" }}>
                  {profile?.status === "active" ? t("Active", "Active") : profile?.status}
                </span>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "16px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)"
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <Calendar size={18} style={{ color: "var(--muted)" }} />
                  <strong style={{ fontWeight: 600, color: "var(--text)" }}>{t("Member Since", "Member Since")}</strong>
                </span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>{formatDate(profile?.createdUtc, t)}</span>
              </div>
            </div>
          </article>
        </div>
      )}

      {activeTab === "security" && (
        <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <article className="card" style={{ background: "var(--surface)" }}>
            <div className="section-head" style={{ marginBottom: "24px" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t("Security Settings", "Security Settings")}</h3>
                <p className="muted" style={{ fontSize: "0.88rem", marginTop: "2px" }}>{t("Update your account security password", "Update your account security password")}</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="stack-sm" style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gap: "4px" }}>
                <AuthPasswordField
                  label={t("Current Password", "Current Password")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("Enter current password", "Enter current password")}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div style={{ display: "grid", gap: "4px" }}>
                <AuthPasswordField
                  label={t("New Password", "New Password")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("Enter new password", "Enter new password")}
                  autoComplete="new-password"
                  required
                />
              </div>

              <PasswordRequirements password={newPassword} />

              <div style={{ display: "grid", gap: "4px" }}>
                <AuthPasswordField
                  label={t("Confirm New Password", "Confirm New Password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("Confirm new password", "Confirm new password")}
                  autoComplete="new-password"
                  required
                />
              </div>

              {pwMessage && (
                <div className={`inline-message ${pwMessage.type === "error" ? "inline-message--error" : "inline-message--success"}`} style={{ marginTop: "8px" }}>
                  {pwMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="primary-button"
                disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "center" }}
              >
                {pwSaving ? (
                  <><RefreshCw size={16} className="spin" /> {t("Changing...", "Changing...")}</>
                ) : (
                  <><Lock size={16} /> {t("Change password", "Change password")}</>
                )}
              </button>
            </form>
          </article>
        </div>
      )}
    </div>
  );
}
