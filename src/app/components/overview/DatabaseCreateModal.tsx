import type { FormEvent } from "react";
import { useLocalization } from "../../lib/i18n";

interface DatabaseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  name: string;
  onNameChange: (v: string) => void;
  isProvisioning: boolean;
  error: string | null;
}

export function DatabaseCreateModal({
  isOpen, onClose, onSubmit, name, onNameChange, isProvisioning, error,
}: DatabaseCreateModalProps) {
  const { t } = useLocalization();

  if (!isOpen) return null;

  return (
    <div className="al-modal-backdrop">
      <div className="card stack al-modal-card">
        <div className="al-modal-card__head">
          <h2>{t("Create Database", "Create Database")}</h2>
          <button className="text-button" onClick={onClose} disabled={isProvisioning}>{t("Close", "Close")}</button>
        </div>
        <p className="muted">{t("The backend enforces this subscription's real database quota and queues provisioning on the remote agent.", "The backend enforces this subscription's real database quota and queues provisioning on the remote agent.")}</p>
        {error ? <div className="inline-message inline-message--error">{error}</div> : null}
        <form className="stack-sm" onSubmit={onSubmit}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{t("Database Alias", "Database Alias")}</span>
            <input
              type="text"
              autoFocus
              placeholder={t("e.g. main_db", "e.g. main_db")}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={isProvisioning}
              required
            />
          </label>
          <button type="submit" className="primary-button" disabled={isProvisioning}>
            {isProvisioning ? t("Provisioning database...", "Provisioning database...") : t("Create Database", "Create Database")}
          </button>
        </form>
      </div>
    </div>
  );
}
