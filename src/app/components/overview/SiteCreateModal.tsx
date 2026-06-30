import type { FormEvent } from "react";
import { useLocalization } from "../../lib/i18n";
import type { SubscriptionOverviewResponse } from "../../lib/customer-api";

interface SiteCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  alias: string;
  onAliasChange: (v: string) => void;
  isProvisioning: boolean;
  error: string | null;
  subscription: SubscriptionOverviewResponse["subscription"];
}

export function SiteCreateModal({
  isOpen, onClose, onSubmit, alias, onAliasChange, isProvisioning, error, subscription,
}: SiteCreateModalProps) {
  const { t } = useLocalization();

  if (!isOpen) return null;

  return (
    <div className="al-modal-backdrop">
      <div className="card stack al-modal-card">
        <div className="al-modal-card__head">
          <h2>{t("Add New Site", "Add New Site")}</h2>
          <button className="text-button" onClick={onClose} disabled={isProvisioning}>{t("Close", "Close")}</button>
        </div>
        <p className="muted">
          {t("This site will be provisioned under {name}. You have {slots} remaining deployment slots.", "This site will be provisioned under {name}. You have {slots} remaining deployment slots.")
            .replace("{name}", subscription.name)
            .replace("{slots}", String(subscription.siteQuota - subscription.usedSites))}
        </p>
        {error ? <div className="inline-message inline-message--error">{error}</div> : null}
        <form className="stack-sm" onSubmit={onSubmit}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{t("Project Alias", "Project Alias")}</span>
            <input
              type="text"
              autoFocus
              placeholder={t("e.g. My Awesome Blog", "e.g. My Awesome Blog")}
              value={alias}
              onChange={(e) => onAliasChange(e.target.value)}
              disabled={isProvisioning}
            />
          </label>
          <button type="submit" className="primary-button" disabled={isProvisioning}>
            {isProvisioning ? t("Provisioning site...", "Provisioning site...") : t("Create Project & Site", "Create Project & Site")}
          </button>
        </form>
      </div>
    </div>
  );
}
