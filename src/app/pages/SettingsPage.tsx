import { User, Mail, Calendar, Shield, Lock, RefreshCw, Camera, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  changePassword,
  deleteCustomerAvatar,
  getCustomerAvatar,
  getCustomerProfile,
  uploadCustomerAvatar,
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function replaceAvatarUrl(nextUrl: string | null) {
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    avatarObjectUrlRef.current = nextUrl;
    setAvatarUrl(nextUrl);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const session = getCustomerSession();
      if (!session) return;
      try {
        const result = await getCustomerProfile(session);
        if (!cancelled) setProfile(result);
        if (result.hasAvatar) {
          try {
            const response = await getCustomerAvatar(session);
            const objectUrl = URL.createObjectURL(await response.blob());
            if (cancelled) URL.revokeObjectURL(objectUrl);
            else replaceAvatarUrl(objectUrl);
          } catch {
            if (!cancelled) replaceAvatarUrl(result.googleAvatarUrl);
          }
        } else if (!cancelled) {
          replaceAvatarUrl(result.googleAvatarUrl);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("Failed to load profile.", "Failed to load profile."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
  }, []);

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    const supportedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setAvatarMessage({ type: "error", text: t("Please choose a PNG, JPG, or WebP image.", "Please choose a PNG, JPG, or WebP image.") });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: t("The avatar must be 2 MB or smaller.", "The avatar must be 2 MB or smaller.") });
      return;
    }

    const session = getCustomerSession();
    if (!session) return;
    setAvatarSaving(true);
    setAvatarMessage(null);
    try {
      await uploadCustomerAvatar(session, file);
      const response = await getCustomerAvatar(session);
      replaceAvatarUrl(URL.createObjectURL(await response.blob()));
      setProfile((current) => current ? { ...current, hasAvatar: true, avatarUpdatedUtc: new Date().toISOString() } : current);
      setAvatarMessage({ type: "success", text: t("Avatar updated.", "Avatar updated.") });
      window.dispatchEvent(new Event("avatar-changed"));
    } catch (err) {
      setAvatarMessage({ type: "error", text: err instanceof Error ? err.message : t("Failed to update avatar.", "Failed to update avatar.") });
    } finally {
      setAvatarSaving(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleDeleteAvatar() {
    const session = getCustomerSession();
    if (!session) return;
    setAvatarSaving(true);
    setAvatarMessage(null);
    try {
      await deleteCustomerAvatar(session);
      replaceAvatarUrl(profile?.googleAvatarUrl ?? null);
      setProfile((current) => current ? { ...current, hasAvatar: false, avatarUpdatedUtc: new Date().toISOString() } : current);
      setAvatarMessage({ type: "success", text: t("Default avatar restored.", "Default avatar restored.") });
      window.dispatchEvent(new Event("avatar-changed"));
    } catch (err) {
      setAvatarMessage({ type: "error", text: err instanceof Error ? err.message : t("Failed to remove avatar.", "Failed to remove avatar.") });
    } finally {
      setAvatarSaving(false);
    }
  }

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
        <section className="page-hero page-hero--inline">
          <div>
            <p className="eyebrow">{t("Settings", "Settings")}</p>
            <h1>{t("Account settings", "Account settings")}</h1>
          </div>
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
        <section className="page-hero page-hero--inline">
          <div>
            <p className="eyebrow">{t("Settings", "Settings")}</p>
            <h1>{t("Account settings", "Account settings")}</h1>
          </div>
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
      <section className="page-hero page-hero--inline">
        <div>
          <p className="eyebrow">{t("Settings", "Settings")}</p>
          <h1>{t("Account settings", "Account settings")}</h1>
          <p className="page-copy">{t("Manage your profile and security.", "Manage your profile and security.")}</p>
        </div>
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
          <article className="card">
            <div className="section-head st-head-spacer--lg">
              <div>
                <h3 className="st-section-title--lg">{t("Profile Information", "Profile Information")}</h3>
                <p className="muted st-section-desc--sm">{t("Your account registration details", "Your account registration details")}</p>
              </div>
            </div>

            <div className="st-avatar-editor">
              <div className="st-avatar-preview" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="st-avatar-initial">{(profile?.username || profile?.email || "U").trim().charAt(0).toUpperCase()}</span>}
              </div>
              <div className="st-avatar-content">
                <strong>{t("Profile picture", "Profile picture")}</strong>
                <span className="muted">{t("PNG, JPG, or WebP. Maximum 2 MB.", "PNG, JPG, or WebP. Maximum 2 MB.")}</span>
                <div className="st-avatar-actions">
                  <input
                    ref={avatarInputRef}
                    className="st-avatar-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
                  />
                  <button className="secondary-button secondary-button--compact" type="button" disabled={avatarSaving} onClick={() => avatarInputRef.current?.click()}>
                    {avatarSaving ? <RefreshCw size={15} className="spin" /> : <Camera size={15} />}
                    {avatarUrl ? t("Change picture", "Change picture") : t("Upload picture", "Upload picture")}
                  </button>
                  {profile?.hasAvatar && (
                    <button className="secondary-button secondary-button--compact secondary-button--danger" type="button" disabled={avatarSaving} onClick={() => void handleDeleteAvatar()}>
                      <Trash2 size={15} /> {t("Remove", "Remove")}
                    </button>
                  )}
                </div>
                {avatarMessage && (
                  <div className={`inline-message ${avatarMessage.type === "error" ? "inline-message--error" : "inline-message--success"} st-avatar-message`}>
                    {avatarMessage.text}
                  </div>
                )}
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
          <article className="card">
            {profile?.usesGoogleSignIn ? (
              <div className="st-google-security">
                <div className="st-google-security__icon" aria-hidden="true"><Shield size={24} /></div>
                <div>
                  <h3 className="st-section-title--lg">{t("Google sign-in account", "Google sign-in account")}</h3>
                  <p className="muted st-google-security__copy">
                    {t("This account is verified by Google and does not use a control panel password. Choose Continue with Google whenever you sign in.", "This account is verified by Google and does not use a control panel password. Choose Continue with Google whenever you sign in.")}
                  </p>
                  <a className="secondary-button st-google-security__link" href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">
                    {t("Manage Google account security", "Manage Google account security")}
                  </a>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
