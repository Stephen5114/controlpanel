import { Outlet, NavLink, Link, useParams } from "react-router-dom";
import {
  Globe,
  Database,
  FileText,
  Shield,
  Headphones,
  Rocket,
  Plus,
} from "lucide-react";
import { useLocalization } from "../lib/i18n";

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

  return (
    <div className="al-shell">
      <aside className="al-sidebar">
        <div className="al-sidebar__brand">
          <h2 className="al-sidebar__title">{t("Hosting workspace", "Hosting workspace")}</h2>
          <p className="al-sidebar__subtitle">{t("Sites and resources", "Sites and resources")}</p>
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
          <button
            type="button"
            className="al-sidebar__deploy-btn"
            onClick={() => {
              const event = new CustomEvent("al:open-add-site-modal");
              window.dispatchEvent(event);
            }}
          >
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
        <Outlet />
      </main>
    </div>
  );
}
