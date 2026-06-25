import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Settings2 } from "lucide-react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { getCustomerSites, type HostedSite } from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { formatRegionLabel } from "../lib/display";

const siteNavigation = [
  { name: "Site Domains", path: "domains", icon: Globe },
  { name: "Settings", path: "settings", icon: Settings2 },
];

export type SiteLayoutContext = {
  site: HostedSite | null;
};

export function SiteLayout() {
  const { subId, siteId } = useParams();
  const [site, setSite] = useState<HostedSite | null>(null);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !siteId) {
      return;
    }

    getCustomerSites(session)
      .then((sites) => {
        const found = sites.find((item) => item.id === siteId) ?? null;
        setSite(found);
      })
      .catch(() => {
        // Ignore lookup failures so the shell can render with route fallbacks.
      });
  }, [siteId]);

  const shortId = siteId ? `${siteId.slice(0, 8)}...` : "";

  return (
    <div className="site-layout">
      <aside className="site-sidebar">
        <Link
          to={`/subscription/${subId}/overview`}
          className="back-link"
        >
          <ArrowLeft size={16} />
          <span>Back to Subscription</span>
        </Link>

        <div className="site-context">
          <h3>{site?.siteName ?? "Site Management"}</h3>
          {site ? (
            <>
              <p className="site-context__domain">{site.domain}</p>
              <div className="site-context__meta">
                <span>{site.hostingPlanName}</span>
                <span>{formatRegionLabel(site.regionSlug)}</span>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>{shortId}</p>
          )}
        </div>

        <nav className="site-nav">
          {siteNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/subscription/${subId}/site/${siteId}/${item.path}`}
                className={({ isActive }) => `site-nav__link${isActive ? " is-active" : ""}`}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="site-content">
        <Outlet context={{ site } satisfies SiteLayoutContext} />
      </div>
    </div>
  );
}
