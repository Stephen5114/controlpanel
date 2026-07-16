import { Link } from "react-router-dom";
import { useLocalization } from "../../lib/i18n";
import { Logo } from "../Logo";

export function LandingFooter() {
  const { t } = useLocalization();
  const year = 2026;

  return (
    <footer className="lp-footer">
      <div className="lp-footer__inner">
        <div>
          <Logo to="/landing" />
          <p className="lp-footer__brand-desc">
            {t(
              "Developer hosting platform — 5 minutes from code to live.国内直连，中文支持。",
              "Developer hosting platform — 5 minutes from code to live.国内直连，中文支持。"
            )}
          </p>
        </div>

        <div>
          <h4 className="lp-footer__col-title">{t("Product", "Product")}</h4>
          <ul className="lp-footer__links">
            <li><a href="#features" className="lp-footer__link">{t("Features", "Features")}</a></li>
            <li><a href="#pricing" className="lp-footer__link">{t("Pricing", "Pricing")}</a></li>
            <li><Link to="/status" className="lp-footer__link">{t("Status", "Status")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="lp-footer__col-title">{t("Resources", "Resources")}</h4>
          <ul className="lp-footer__links">
            <li><Link to="/login" className="lp-footer__link">{t("Sign In", "Sign In")}</Link></li>
            <li><Link to="/register" className="lp-footer__link">{t("Sign Up", "Sign Up")}</Link></li>
            <li><Link to="/support" className="lp-footer__link">{t("Support", "Support")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="lp-footer__col-title">{t("Company", "Company")}</h4>
          <ul className="lp-footer__links">
            <li><a href="mailto:hello@hostvibecoding.com" className="lp-footer__link">{t("Contact", "Contact")}</a></li>
            <li><span className="lp-footer__link">{t("Terms of Service", "Terms of Service")}</span></li>
            <li><span className="lp-footer__link">{t("Privacy Policy", "Privacy Policy")}</span></li>
          </ul>
        </div>
      </div>

      <div className="lp-footer__bottom">
        &copy; {year} Vibe Hosting. {t("All rights reserved.", "All rights reserved.")}
      </div>
    </footer>
  );
}
