import { useState, type FormEvent } from "react";
import { Key, X, Eye, EyeOff, Copy, CheckCircle2, Loader2, Lock } from "lucide-react";
import { useLocalization } from "../../lib/i18n";
import type { SubscriptionWebsite } from "../../lib/customer-api";

interface FtpCredentialsModalProps {
  site: SubscriptionWebsite;
  onClose: () => void;
  onCopy: (value: string, key: string) => Promise<void>;
  onChangePassword: (e: FormEvent) => Promise<void>;
}

export function FtpCredentialsModal({ site, onClose, onCopy, onChangePassword }: FtpCredentialsModalProps) {
  const { t } = useLocalization();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [changePwMode, setChangePwMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  if (!site.publish) return null;

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);
    if (newPassword !== confirmPassword) {
      setChangeError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 12) {
      setChangeError("Password must be at least 12 characters.");
      return;
    }
    setChanging(true);
    try {
      const result = await onChangePassword(e);
      // onChangePassword handles the actual API call and state updates in parent
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : "Failed to change FTP password.");
    } finally {
      setChanging(false);
    }
  };

  const credRows = [
    { key: "host",  label: t("Host", "Host"),     value: site.publish.ftpHost,     secret: false },
    { key: "user",  label: t("Username", "Username"),  value: site.publish.ftpUser,     secret: false },
    { key: "pass",  label: t("Password", "Password"),  value: site.publish.ftpPassword, secret: true  },
    { key: "port",  label: t("Port", "Port"),      value: "21",                          secret: false },
    { key: "proto", label: t("Protocol", "Protocol"),  value: t("FTP (Passive Mode)", "FTP (Passive Mode)"),          secret: false },
  ] as const;

  return (
    <div className="al-modal-backdrop" onClick={onClose}>
      <div
        className="card al-modal-card ftp-cred-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ftp-cred__head">
          <div className="ftp-cred__head-left">
            <div className="ftp-cred__icon"><Key size={18} /></div>
            <div>
              <h2 className="ftp-cred__title">{t("FTP Credentials", "FTP Credentials")}</h2>
              <p className="ftp-cred__sub">{site.siteName} · {site.domain}</p>
            </div>
          </div>
          <button type="button" className="ftp-cred__close" onClick={onClose} aria-label={t("Close", "Close")}><X size={18} /></button>
        </div>

        <div className="ftp-cred__rows">
          {credRows.map(({ key, label, value, secret }) => {
            const isCopied = copied === key;
            const shown = secret ? (passwordVisible ? value : "••••••••••••") : value;
            return (
              <div key={key} className="ftp-cred__row">
                <span className="ftp-cred__label">{label}</span>
                <code className="ftp-cred__value">{shown}</code>
                <div className="ftp-cred__actions">
                  {secret && (
                    <button type="button" className="ftp-cred__btn" onClick={() => setPasswordVisible((v) => !v)}
                      title={passwordVisible ? t("Hide password", "Hide password") : t("Show password", "Show password")}>
                      {passwordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <button type="button" className={`ftp-cred__btn ${isCopied ? "ftp-cred__btn--copied" : ""}`}
                    onClick={() => void handleCopy(value, key)}
                    title={isCopied ? t("Copied!", "Copied!") : t("Copy", "Copy")}>
                    {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ftp-cred__connect">
          <span className="ftp-cred__connect-label">{t("Quick connect string", "Quick connect string")}</span>
          <div className="ftp-cred__connect-row">
            <code className="ftp-cred__connect-val">ftp://{site.publish.ftpUser}@{site.publish.ftpHost}</code>
            <button type="button" className={`ftp-cred__btn ${copied === "quick" ? "ftp-cred__btn--copied" : ""}`}
              onClick={() => void handleCopy(`ftp://${site.publish!.ftpUser}@${site.publish!.ftpHost}`, "quick")}
              title={t("Copy", "Copy")}>
              {copied === "quick" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="ftp-cred__tip">
          <strong>{t("Recommended client:", "Recommended client:")}</strong>{" "}
          {t("FileZilla (free) — use File → Site Manager and set Protocol to FTP with Passive transfer mode.", "FileZilla (free) — use File → Site Manager and set Protocol to FTP with Passive transfer mode.")}
          {" "}
          {(() => {
            const text = t("Do not upload {node_modules}; include {package_json} and the server installs dependencies automatically.", "Do not upload {node_modules}; include {package_json} and the server installs dependencies automatically.");
            const parts = text.split(/(\{node_modules\}|\{package_json\})/);
            return parts.map((part, index) => {
              if (part === "{node_modules}") return <code key={index}>node_modules</code>;
              if (part === "{package_json}") return <code key={index}>package.json</code>;
              return part;
            });
          })()}
        </div>

        <div className="ftp-cred__change-pw">
          {!changePwMode ? (
            <div className="ftp-cred__change-pw-row">
              {changeSuccess && (
                <span className="ftp-cred__change-pw-ok">
                  <CheckCircle2 size={13} /> {t(changeSuccess, changeSuccess)}
                </span>
              )}
              <button type="button" className="ftp-cred__change-pw-btn"
                onClick={() => { setChangePwMode(true); setChangeSuccess(null); }}>
                <Lock size={13} /> {t("Change FTP Password", "Change FTP Password")}
              </button>
            </div>
          ) : (
            <form className="ftp-cred__change-pw-form" onSubmit={handleChangePassword}>
              <p className="ftp-cred__change-pw-hint">
                {t("New password must be ≥ 12 chars with uppercase, lowercase, number and symbol.", "New password must be ≥ 12 chars with uppercase, lowercase, number and symbol.")}
              </p>
              {changeError && <p className="ftp-cred__change-pw-err">{changeError}</p>}
              <input type="password" className="ftp-cred__change-pw-input"
                placeholder={t("New password", "New password")} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} disabled={changing} autoFocus required />
              <input type="password" className="ftp-cred__change-pw-input"
                placeholder={t("Confirm password", "Confirm password")} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} disabled={changing} required />
              <div className="ftp-cred__change-pw-actions">
                <button type="button" className="ftp-cred__change-pw-cancel"
                  onClick={() => { setChangePwMode(false); setChangeError(null); setNewPassword(""); setConfirmPassword(""); }}
                  disabled={changing}>{t("Cancel", "Cancel")}</button>
                <button type="submit" className="ftp-cred__change-pw-submit" disabled={changing}>
                  {changing ? <Loader2 size={13} className="spin" /> : <Lock size={13} />}
                  {changing ? t("Updating…", "Updating…") : t("Update Password", "Update Password")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
