import { Check, Zap } from "lucide-react";
import { useLocalization } from "../lib/i18n";

export function AuthMarketingPanel() {
  const { t } = useLocalization();

  return (
    <div className="auth-brand">
      <div className="auth-brand-inner">
        <div className="auth-brand-logo">
          <Zap size={22} fill="currentColor" />
        </div>
        <div className="auth-brand-name">{t("Vibe Hosting", "Vibe Hosting")}</div>
        <div className="auth-brand-tagline">
          {t("You vibe it. We host it. From prompt to production in minutes.", "You vibe it. We host it. From prompt to production in minutes.")}
        </div>
        <ul className="auth-brand-features">
          <li><Check size={18} /> {t("Deploy in seconds — .NET, Python, PHP & Spring Boot", "Deploy in seconds — .NET, Python, PHP & Spring Boot")}</li>
          <li><Check size={18} /> {t("Auto-managed quotas, storage, and scaling", "Auto-managed quotas, storage, and scaling")}</li>
          <li><Check size={18} /> {t("Self-service dashboard for all your sites", "Self-service dashboard for all your sites")}</li>
          <li><Check size={18} /> {t("Built for vibe coders and AI-first builders", "Built for vibe coders and AI-first builders")}</li>
        </ul>
      </div>
    </div>
  );
}
