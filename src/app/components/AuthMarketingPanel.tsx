import { Check } from "lucide-react";
import { Logo } from "./Logo";
import { useLocalization } from "../lib/i18n";

export function AuthMarketingPanel() {
  const { t } = useLocalization();

  return (
    <aside className="auth-brand">
      {/* Top ambient glow — matches official website */}
      <div className="auth-brand-glow" />

      <div className="auth-brand-inner">
        <Logo />

        <h1 className="auth-brand-tagline">
          {t("Hosting that stays out of your way.", "Hosting that stays out of your way.")}
        </h1>

        <p className="auth-brand-desc">
          {t(
            "Web hosting, VPS and domains with clear pricing and real support when you need it.",
            "Web hosting, VPS and domains with clear pricing and real support when you need it.",
          )}
        </p>

        <ul className="auth-brand-features">
          <li>
            <span className="auth-brand-feature-icon">
              <Check size={14} />
            </span>
            {t("Everything managed from one account", "Everything managed from one account")}
          </li>
          <li>
            <span className="auth-brand-feature-icon">
              <Check size={14} />
            </span>
            {t("Straightforward monthly pricing", "Straightforward monthly pricing")}
          </li>
          <li>
            <span className="auth-brand-feature-icon">
              <Check size={14} />
            </span>
            {t("Support from people who know hosting", "Support from people who know hosting")}
          </li>
        </ul>
      </div>

      {/* Bottom info pills */}
      <div className="auth-brand-badges">
        <span className="auth-brand-badge">
          <span className="auth-brand-badge-dot" />
          99.9% Uptime
        </span>
        <span className="auth-brand-badge">
          <span className="auth-brand-badge-dot auth-brand-badge-dot--g" />
          SSL Auto
        </span>
        <span className="auth-brand-badge">
          <span className="auth-brand-badge-dot auth-brand-badge-dot--p" />
          1-Click Deploy
        </span>
      </div>
    </aside>
  );
}
