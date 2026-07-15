import { Check } from "lucide-react";
import { useLocalization } from "../lib/i18n";

export function AuthMarketingPanel() {
  const { t } = useLocalization();

  return (
    <aside className="auth-brand">
      <div className="auth-brand-inner">
        <svg className="auth-brand-sketch" viewBox="0 0 180 118" aria-hidden="true">
          <path d="M22 89c19-63 111-86 141-27 20 40-29 59-70 48C55 101 8 120 22 89Z" />
          <path d="M45 76h91M56 55h68M70 35h42M53 76v18M126 76v18M71 55v21M110 55v21" />
          <circle cx="62" cy="66" r="3" />
          <circle cx="78" cy="66" r="3" />
          <path d="M95 66h21M30 34c10 3 17-3 19-14M133 24c-3 10 2 17 13 20" />
        </svg>

        <p className="auth-brand-kicker">VIBE HOSTING</p>
        <h1 className="auth-brand-tagline">
          {t("Hosting that stays out of your way.", "Hosting that stays out of your way.")}
        </h1>
        <p className="auth-brand-intro">
          {t(
            "Web hosting, VPS and domains with clear pricing and real support when you need it.",
            "Web hosting, VPS and domains with clear pricing and real support when you need it.",
          )}
        </p>
        <ul className="auth-brand-features">
          <li><Check size={18} /> {t("Everything managed from one account", "Everything managed from one account")}</li>
          <li><Check size={18} /> {t("Straightforward monthly pricing", "Straightforward monthly pricing")}</li>
          <li><Check size={18} /> {t("Support from people who know hosting", "Support from people who know hosting")}</li>
        </ul>
      </div>
    </aside>
  );
}
