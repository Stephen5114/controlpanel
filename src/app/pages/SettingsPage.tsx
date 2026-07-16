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
      <div className="st-tabs-bar">
        <button
          onClick={() => setActiveTab("profile")}
          className={`st-tab-btn${activeTab === "profile" ? " st-tab-btn--active" : ""}`}
          type="button"
        >
          {t("Profile", "Profile")}
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`st-tab-btn${activeTab === "security" ? " st-tab-btn--active" : ""}`}
          type="button"
        >
          {t("Security & Password", "Security & Password")}
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="st-section-wrap">
          <article className="card st-card">
            <div className="section-head st-head-spacer">
              <div>
                <h3 className="st-section-title">{t("Profile Information", "Profile Information")}</h3>
                <p className="muted st-section-desc">{t("Your account registration details", "Your account registration details")}</p>
              </div>
            </div>

            <div className="st-info-grid">
              <div className="st-info-row">
                <span className="st-info-label">
                  <User size={18} className="st-info-icon" />
                  <strong className="st-info-label-text">{t("Username", "Username")}</strong>
                </span>
                <span className="st-info-value">{profile?.username || "-"}</span>
              </div>

              <div className="st-info-row">
                <span className="st-info-label">
                  <Mail size={18} className="st-info-icon" />
                  <strong className="st-info-label-text">{t("Email", "Email")}</strong>
                </span>
                <span className="st-info-value">{profile?.email}</span>
              </div>

              <div className="st-info-row">
                <span className="st-info-label">
                  <Shield size={18} className="st-info-icon" />
                  <strong className="st-info-label-text">{t("Account Status", "Account Status")}</strong>
                </span>
                <span className={`badge ${profile?.status === "active" ? "badge--success" : "badge--warning"} st-info-badge`}>
                  {profile?.status === "active" ? t("Active", "Active") : profile?.status}
                </span>
              </div>

              <div className="st-info-row">
                <span className="st-info-label">
                  <Calendar size={18} className="st-info-icon" />
                  <strong className="st-info-label-text">{t("Member Since", "Member Since")}</strong>
                </span>
                <span className="st-info-value">{formatDate(profile?.createdUtc, t)}</span>
              </div>
            </div>
          </article>
        </div>
      )}

      {activeTab === "security" && (
        <div className="st-section-wrap--narrow">
          <article className="card st-card">
            <div className="section-head st-head-spacer--lg">
              <div>
                <h3 className="st-section-title--lg">{t("Security Settings", "Security Settings")}</h3>
                <p className="muted st-section-desc--sm">{t("Update your account security password", "Update your account security password")}</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="st-pw-form">
              <div className="st-pw-field-wrap">
                <AuthPasswordField
                  label={t("Current Password", "Current Password")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("Enter current password", "Enter current password")}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="st-pw-field-wrap">
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

              <div className="st-pw-field-wrap">
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
                <div className={`inline-message ${pwMessage.type === "error" ? "inline-message--error" : "inline-message--success"} st-pw-msg`}>
                  {pwMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="primary-button st-pw-submit-btn"
                disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
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
