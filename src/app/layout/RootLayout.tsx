import { ChevronDown, CreditCard, Gift, Globe2, Headphones, LayoutDashboard, Menu, Package, Server, Settings, User, X, Zap, Sun, Moon, Palette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getBillingSummary, getCustomerProfile } from "../lib/customer-api";
import { clearCustomerSession, getCustomerSession } from "../lib/customer-session";
import { getActiveLocale, useLocalization, LANGUAGES } from "../lib/i18n";
import { useTheme } from "../lib/theme";

const navigation = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
  { name: "Addons", path: "/addons", icon: Package },
  { name: "Domains", path: "/domains", icon: Globe2 },
  { name: "VPS", path: "/vps", icon: Server },
  { name: "Billing", path: "/billing", icon: CreditCard },
  { name: "Affiliate", path: "/affiliate", icon: Gift },
  { name: "Support", path: "/support", icon: Headphones },
  { name: "Settings", path: "/settings", icon: Settings },
];

// Default 20% first-year commission on the current $339.95/mo top VPS plan.
const MAX_AFFILIATE_MONTHLY_REWARD_USD = 68;

export function RootLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountBalance, setAccountBalance] = useState<{ amount: number; currency: string } | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const navigate = useNavigate();
  const session = getCustomerSession();
  
  const { currentLang, setLang, t } = useLocalization();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [tempLang, setTempLang] = useState(currentLang);

  const { theme, setTheme } = useTheme();

  const ThemeIcon = useMemo(() => {
    if (theme === "dark") return Moon;
    if (theme === "classic") return Palette;
    return Sun;
  }, [theme]);

  const themeOptions = [
    { value: "day" as const, label: t("Day", "Day"), description: t("Bright cream and orange", "Bright cream and orange"), icon: Sun },
    { value: "dark" as const, label: t("Dark", "Dark"), description: t("Warm charcoal with soft contrast", "Warm charcoal with soft contrast"), icon: Moon },
    { value: "classic" as const, label: t("Classic", "Classic"), description: t("Oatmeal and terracotta", "Oatmeal and terracotta"), icon: Palette },
  ];

  useEffect(() => {
    setTempLang(currentLang);
  }, [currentLang]);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    if (!avatarDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".account__avatar-wrapper")) {
        setAvatarDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [avatarDropdownOpen]);

  useEffect(() => {
    if (!themeMenuOpen) return;
    function handleThemeClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".theme-selector")) setThemeMenuOpen(false);
    }
    document.addEventListener("click", handleThemeClick);
    return () => document.removeEventListener("click", handleThemeClick);
  }, [themeMenuOpen]);

  const handleSaveLangSettings = () => {
    setLang(tempLang);
    setIsLangModalOpen(false);
  };

  const accountBalanceTone = useMemo(() => {
    if (!accountBalance) return "is-loading";
    if (accountBalance.amount < 0) return "is-negative";
    if (accountBalance.amount > 0) return "is-positive";
    return "is-neutral";
  }, [accountBalance]);

  useEffect(() => {
    let cancelled = false;

    if (!session) {
      setAccountBalance(null);
      return () => { cancelled = true; };
    }

    function refreshBalance() {
      void getBillingSummary(session!)
        .then((summary) => {
          if (cancelled) return;
          setAccountBalance({ amount: summary.creditBalance, currency: summary.currency });
        })
        .catch(() => {
          if (cancelled) return;
          setAccountBalance(null);
        });
    }

    refreshBalance();
    // Background poll every 30s as fallback
    const timer = window.setInterval(refreshBalance, 30_000);
    // Refresh immediately when the tab regains focus (e.g. returning from Stripe)
    window.addEventListener("focus", refreshBalance);
    // Refresh immediately when another part of the app signals a balance change
    window.addEventListener("balance-changed", refreshBalance);

    void getCustomerProfile(session)
      .then((profile) => {
        if (cancelled) return;
        setUsername(profile.username);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshBalance);
      window.removeEventListener("balance-changed", refreshBalance);
    };
  }, [session?.customerId, session?.token]);

  function handleSignOut() {
    clearCustomerSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      {session?.impersonated ? (
        <div className="staff-impersonation-banner">
          {t("You are viewing this customer as staff", "You are viewing this customer as staff")}{session.staffEmail ? ` (${session.staffEmail})` : ""}. {t("Actions are audited.", "Actions are audited.")}
        </div>
      ) : null}
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">
            <Zap size={16} fill="currentColor" />
          </div>
          <div>
            <div className="brand__title">Vibe Hosting</div>
            <div className="brand__subtitle">{t("Control Panel", "Control Panel")}</div>
          </div>
        </div>

        <nav className="topnav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `topnav__link${isActive ? " is-active" : ""}`}
              >
                <Icon size={16} />
                <span>{t(item.name, item.name)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="account">
          <button className="mobile-toggle" onClick={() => setMobileOpen((value) => !value)} type="button">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link
            className="affiliate-nav-promo"
            to="/affiliate"
            title={t("Open Refer & Earn", "Open Refer & Earn")}
          >
            <span className="affiliate-nav-promo__icon"><Gift size={16} /></span>
            <span>{t("Refer & earn up to ${amount}/mo", "Refer & earn up to ${amount}/mo").replace("{amount}", String(MAX_AFFILIATE_MONTHLY_REWARD_USD))}</span>
          </Link>

          <div className="theme-selector">
            <button
              className="theme-toggle-btn"
              onClick={() => setThemeMenuOpen((open) => !open)}
              type="button"
              aria-haspopup="menu"
              aria-expanded={themeMenuOpen}
              title={t("Choose theme", "Choose theme")}
            >
              <span className={`theme-toggle-btn__preview theme-toggle-btn__preview--${theme}`}><ThemeIcon size={14} /></span>
              <span>{t(theme === "day" ? "Day" : theme === "dark" ? "Dark" : "Classic", theme === "day" ? "Day" : theme === "dark" ? "Dark" : "Classic")}</span>
              <ChevronDown className="theme-toggle-btn__chevron" size={14} />
            </button>

            {themeMenuOpen ? (
              <div className="theme-menu" role="menu">
                <div className="theme-menu__heading">
                  <strong>{t("Appearance", "Appearance")}</strong>
                  <span>{t("Choose how your panel looks", "Choose how your panel looks")}</span>
                </div>
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      className={`theme-menu__option${theme === option.value ? " is-active" : ""}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={theme === option.value}
                      onClick={() => { setTheme(option.value); setThemeMenuOpen(false); }}
                    >
                      <span className={`theme-menu__swatch theme-menu__swatch--${option.value}`}><Icon size={15} /></span>
                      <span className="theme-menu__copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                      <span className="theme-menu__check" aria-hidden="true">{theme === option.value ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button className="nav-lang-selector" onClick={() => setIsLangModalOpen(true)} type="button">
            <Globe2 size={15} />
            <span>{currentLang}</span>
          </button>

          <div className="account__avatar-wrapper" style={{ position: "relative" }}>
            <button className="avatar" onClick={() => setAvatarDropdownOpen((v) => !v)} type="button" aria-label={t("Account menu", "Account menu")}>
              <User size={18} />
            </button>
            {avatarDropdownOpen && (
              <div className="account__dropdown">
                <div className="account__dropdown-header">
                  <div className="account__dropdown-name">{username ?? session?.email ?? "Signed in"}</div>
                </div>
                <div className={`account__dropdown-balance ${accountBalanceTone}`}>
                  <span>{t("Balance", "Balance")}</span>
                  <strong>{accountBalance ? formatCurrency(accountBalance.amount, accountBalance.currency) : "..."}</strong>
                </div>
                <div className="account__dropdown-divider" />
                <button className="account__dropdown-item" onClick={() => { handleSignOut(); setAvatarDropdownOpen(false); }} type="button">
                  {t("Sign out", "Sign out")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <nav className="mobile-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `mobile-nav__link${isActive ? " is-active" : ""}`}
              >
                <Icon size={16} />
                <span>{t(item.name, item.name)}</span>
              </NavLink>
            );
          })}
        </nav>
      ) : null}

      <main className="page">
        <Outlet />
      </main>

      {isLangModalOpen && (
        <div className="lang-modal-overlay" onClick={() => setIsLangModalOpen(false)}>
          <div className="lang-modal-box" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="lang-modal-title">{t("Language Options", "Language Options")}</h3>
              <p className="lang-modal-subtitle">
                {t("Choose your preferred language.", "Choose your preferred language.")}
              </p>
            </div>

            <div className="lang-modal-section">
              <label className="lang-modal-label">{t("Select Language", "Select Language")}</label>
              <select
                className="lang-modal-select"
                value={tempLang}
                onChange={(e) => setTempLang(e.target.value)}
              >
                {Object.entries(LANGUAGES).map(([key, lang]) => (
                  <option key={key} value={key}>
                    {lang.label} ({key})
                  </option>
                ))}
              </select>
            </div>

            <div className="lang-modal-actions">
              <button className="btn-secondary" onClick={() => setIsLangModalOpen(false)}>
                {t("Cancel", "Cancel")}
              </button>
              <button className="btn-primary" onClick={handleSaveLangSettings}>
                {t("Save Changes", "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(getActiveLocale(), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
