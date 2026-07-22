import { Camera, ChevronDown, CreditCard, Gift, Globe2, Headphones, LayoutDashboard, Menu, Package, Server, Settings, X, Sun, Moon, Palette, Eye } from "lucide-react";
import { Logo } from "../components/Logo";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getBillingSummary, getCustomerAvatar, getCustomerProfile } from "../lib/customer-api";
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

function Sidebar({
  navigation, mobileOpen, onNavClick, theme, ThemeIcon, setThemeMenuOpen,
  avatarDropdownOpen, setAvatarDropdownOpen, username, avatarUrl, session,
  accountBalance, accountBalanceTone, handleSignOut, t
}: any) {
  const avatarInitial = (username ?? session?.email ?? "U").trim().charAt(0).toUpperCase() || "U";
  return (
    <aside className={`sidebar${mobileOpen ? " sidebar--open" : ""}`}>
      <div className="sidebar__header">
        <Logo compact />
      </div>

      <nav className="sidebar__nav">
        {navigation.map((item: any) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
              onClick={onNavClick}
            >
              <Icon size={18} />
              <span>{t(item.name, item.name)}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="account__avatar-wrapper" style={{ position: "relative" }} onClick={() => setAvatarDropdownOpen((v: boolean) => !v)}>
          <button className={`avatar${avatarUrl ? " avatar--custom" : " avatar--default"}`} type="button" aria-label={t("Account menu", "Account menu")}>
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="avatar__initial">{avatarInitial}</span>}
            <span className="avatar__edit-badge" aria-hidden="true"><Camera size={9} /></span>
          </button>
          <span className="account__avatar-name">{username ?? session?.email ?? "Signed in"}</span>
          {avatarDropdownOpen && (
            <div className="account__dropdown account__dropdown--sidebar">
              <div className="account__dropdown-header"></div>
              <div className={`account__dropdown-balance ${accountBalanceTone}`}>
                <span>{t("Balance", "Balance")}</span>
                <strong>{accountBalance ? formatCurrency(accountBalance.amount, accountBalance.currency) : "..."}</strong>
              </div>
              <div className="account__dropdown-divider" />
              <Link className="account__dropdown-item account__dropdown-item--icon" to="/settings" onClick={() => setAvatarDropdownOpen(false)}>
                <Camera size={15} /> {t("Change profile picture", "Change profile picture")}
              </Link>
              <button className="account__dropdown-item" onClick={() => { handleSignOut(); setAvatarDropdownOpen(false); }} type="button">
                {t("Sign out", "Sign out")}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// Default 20% first-year commission on the current $339.95/mo top VPS plan.
const MAX_AFFILIATE_MONTHLY_REWARD_USD = 68;

export function RootLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountBalance, setAccountBalance] = useState<{ amount: number; currency: string } | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
    if (theme === "warm") return Eye;
    return Sun;
  }, [theme]);

  const themeOptions = [
    { value: "white" as const, label: t("日间", "Day"), description: t("纯净白色，清晰简洁", "Clean white, crisp and minimal"), icon: Sun },
    { value: "dark" as const, label: t("夜间", "Night"), description: t("深色背景，减少眩光", "Dark background, reduced glare"), icon: Moon },
    { value: "warm" as const, label: t("护眼", "Warm"), description: t("暖色护眼，柔和舒适", "Warm tones, gentle on eyes"), icon: Eye },
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

    async function refreshProfile() {
      try {
        const profile = await getCustomerProfile(session!);
        if (cancelled) return;
        setUsername(profile.username);
        if (!profile.hasAvatar) {
          setAvatarUrl((current) => { if (current?.startsWith("blob:")) URL.revokeObjectURL(current); return profile.googleAvatarUrl; });
          return;
        }
        const response = await getCustomerAvatar(session!);
        const nextUrl = URL.createObjectURL(await response.blob());
        if (cancelled) { URL.revokeObjectURL(nextUrl); return; }
        setAvatarUrl((current) => { if (current) URL.revokeObjectURL(current); return nextUrl; });
      } catch {
        if (!cancelled) setAvatarUrl((current) => { if (current?.startsWith("blob:")) URL.revokeObjectURL(current); return null; });
      }
    }

    void refreshProfile();
    window.addEventListener("avatar-changed", refreshProfile);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshBalance);
      window.removeEventListener("balance-changed", refreshBalance);
      window.removeEventListener("avatar-changed", refreshProfile);
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

      <div className="app-layout">
        {/* Mobile overlay */}
        {mobileOpen ? (
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
        ) : null}

        {/* Sidebar */}
        <Sidebar
          navigation={navigation}
          mobileOpen={mobileOpen}
          onNavClick={() => setMobileOpen(false)}
          theme={theme}
          ThemeIcon={ThemeIcon}
          setThemeMenuOpen={setThemeMenuOpen}
          avatarDropdownOpen={avatarDropdownOpen}
          setAvatarDropdownOpen={setAvatarDropdownOpen}
          username={username}
          avatarUrl={avatarUrl}
          session={session}
          accountBalance={accountBalance}
          accountBalanceTone={accountBalanceTone}
          handleSignOut={handleSignOut}
          t={t}
        />

        {/* Main area: topbar + content */}
        <div className="main-area">
          <header className="topbar">
            <div className="brand">
              <button className="mobile-toggle" onClick={() => setMobileOpen((v) => !v)} type="button" aria-label={t("Toggle navigation", "Toggle navigation")}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <Logo compact />
            </div>

            <div className="account">
              <Link
                className="affiliate-nav-promo"
                to="/affiliate"
                title={t("Open Refer & Earn", "Open Refer & Earn")}
              >
                <span className="affiliate-nav-promo__icon"><Gift size={16} /></span>
                <span>{t("Refer & earn up to ${amount}/mo", "Refer & earn up to ${amount}/mo").replace("{amount}", String(MAX_AFFILIATE_MONTHLY_REWARD_USD))}</span>
              </Link>

              <button className="nav-lang-selector" onClick={() => setIsLangModalOpen(true)} type="button" title={t("Language", "Language")}>
                <Globe2 size={15} />
                <span>{currentLang}</span>
              </button>

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
            </div>
          </header>

          <main className="page">
            <Outlet />
          </main>
        </div>
      </div>

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
              <button className="btn-secondary" onClick={() => setIsLangModalOpen(false)} type="button">
                {t("Cancel", "Cancel")}
              </button>
              <button className="btn-primary" onClick={handleSaveLangSettings} type="button">
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
