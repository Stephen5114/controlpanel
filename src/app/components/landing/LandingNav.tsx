import { ArrowRight, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useLocalization, LANGUAGES } from "../../lib/i18n";
import { Logo } from "../Logo";

export function LandingNav() {
  const { t, currentLang, setLang } = useLocalization();
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [langOpen]);

  return (
    <nav className="lp-nav">
      <div className="lp-nav__inner">
        <Logo to="/landing" />

        <ul className="lp-nav__links">
          <li><a href="#features" className="lp-nav__link">{t("Features", "Features")}</a></li>
          <li><a href="#pricing" className="lp-nav__link">{t("Pricing", "Pricing")}</a></li>
          <li><a href="/status" className="lp-nav__link">{t("Status", "Status")}</a></li>
          <li>
            <Link to="/login" className="lp-nav__link">{t("Sign in", "Sign in")}</Link>
          </li>
          <li>
            <Link to="/register" className="lp-nav__cta">
              {t("Get Started", "Get Started")}
              <ArrowRight size={16} />
            </Link>
          </li>
          <li ref={menuRef} className="lp-nav-lang">
            <button className="lp-nav-lang__btn" onClick={() => setLangOpen(o => !o)} type="button" aria-label={t("Language", "Language")}>
              <Globe2 size={15} />
              <span>{currentLang}</span>
            </button>
            {langOpen && (
              <div className="lp-nav-lang__menu">
                {Object.entries(LANGUAGES).map(([key, lang]) => (
                  <button
                    key={key}
                    className={`lp-nav-lang__option${currentLang === key ? " is-active" : ""}`}
                    onClick={() => { setLang(key); setLangOpen(false); }}
                    type="button"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
