import { useCallback, useEffect, useState } from "react";
import { Outlet, NavLink, Link, useParams } from "react-router-dom";
import {
  Globe,
  Database,
  FileText,
  Shield,
  Headphones,
  Rocket,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { useLocalization } from "../lib/i18n";
import { getCustomerSession } from "../lib/customer-session";
import { getCustomerSubscriptions, type HostingSubscription } from "../lib/customer-api";

const sidebarNav = [
  { name: "Websites", path: "overview", icon: Globe, end: true },
  { name: "Databases", path: "databases", icon: Database },
  { name: "Files", path: "files", icon: FileText },
  { name: "Security", path: "security", icon: Shield },
  { name: "Deployments", path: "deployments", icon: Rocket },
];

export function SubscriptionLayout() {
  const { subId } = useParams();
  const { t } = useLocalization();
  const [subscriptions, setSubscriptions] = useState<HostingSubscription[]>([]);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) return;
    let cancelled = false;
    getCustomerSubscriptions(session)
      .then((list) => { if (!cancelled) setSubscriptions(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleAddSite = useCallback(() => {
    const event = new CustomEvent("al:open-add-site-modal");
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="al-shell">
      <aside className="al-sidebar">
        <div className="al-sidebar__brand">
          <Link to="/" className="al-sidebar__back" aria-label={t("Dashboard", "Dashboard")}>
            <ArrowLeft size={16} />
          </Link>
          <select
            className="al-sidebar__select"
            value={subId}
            onChange={(e) => {
              const path = e.target.value;
              if (path) window.location.href = `/subscription/${path}/overview`;
            }}
          >
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>

        <nav className="al-sidebar__nav">
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={`/subscription/${subId}/${item.path}`}
                end={item.end}
                className={({ isActive }) => `al-sidebar__link${isActive ? " is-active" : ""}`}
              >
                <Icon size={16} />
                <span>{t(item.name, item.name)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="al-sidebar__footer">
          <button type="button" className="al-sidebar__deploy-btn" onClick={handleAddSite}>
            <Plus size={14} />
            {t("Add Website", "Add Website")}
          </button>

          <div className="al-sidebar__footer-links">
            <Link to="/support" className="al-sidebar__footer-link">
              <Headphones size={16} />
              <span>{t("Support", "Support")}</span>
            </Link>
          </div>
        </div>
      </aside>

      <main className="al-main">
        {/* Mobile top bar */}
        <div className="al-mobile-bar">
          <div className="al-mobile-bar__row">
            <Link to="/" className="al-mobile-bar__back" aria-label={t("Back to dashboard", "Back to dashboard")}>
              <ArrowLeft size={18} />
            </Link>
            <select
              className="al-mobile-bar__select"
              value={subId}
              onChange={(e) => {
                const path = e.target.value;
                if (path) window.location.href = `/subscription/${path}/overview`;
              }}
            >
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <nav className="al-mobile-bar__nav">
            {sidebarNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={`/subscription/${subId}/${item.path}`}
                  end={item.end}
                  className={({ isActive }) => `al-mobile-bar__link${isActive ? " is-active" : ""}`}
                >
                  <Icon size={15} />
                  <span>{t(item.name, item.name)}</span>
                </NavLink>
              );
            })}
            <button type="button" className="al-mobile-bar__link al-mobile-bar__link--action" onClick={handleAddSite}>
              <Plus size={15} />
              <span>{t("Add", "Add")}</span>
            </button>
          </nav>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
