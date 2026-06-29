import { Check, Zap } from "lucide-react";
import { useLocalization } from "../lib/i18n";

export function AuthMarketingPanel() {
  const { t } = useLocalization();

  return (
    <div className="auth-brand">
      {/* Server cluster background — pure CSS-driven */}
      <div className="auth-brand-grid" />

      {/* Management Host — a stylized host computer/server */}
      <div className="auth-brand-host">
        <div className="auth-brand-host-monitor">
          <div className="auth-brand-host-screen">
            <div className="auth-brand-host-screen-header">
              <span className="auth-brand-host-dot" />
              <span className="auth-brand-host-dot auth-brand-host-dot--b" />
              <span className="auth-brand-host-dot auth-brand-host-dot--g" />
            </div>
            <div className="auth-brand-host-lines">
              <span className="auth-brand-host-line auth-brand-host-line--1" />
              <span className="auth-brand-host-line auth-brand-host-line--2" />
              <span className="auth-brand-host-line auth-brand-host-line--3" />
              <span className="auth-brand-host-line auth-brand-host-line--4" />
              <span className="auth-brand-host-line auth-brand-host-line--5" />
            </div>
          </div>
        </div>
        <div className="auth-brand-host-stand">
          <div className="auth-brand-host-stand-base" />
        </div>
        <div className="auth-brand-host-leds">
          <span className="auth-brand-host-led auth-brand-host-led--green" />
          <span className="auth-brand-host-led auth-brand-host-led--blue" />
          <span className="auth-brand-host-led auth-brand-host-led--green auth-brand-host-led--blink" />
        </div>
      </div>

      {/* Feature badges — below host, before racks */}
      <div className="auth-brand-badges">
        <div className="auth-brand-badge"><span className="auth-brand-badge-dot" />{t("Auto SSL", "Auto SSL")}</div>
        <div className="auth-brand-badge"><span className="auth-brand-badge-dot auth-brand-badge-dot--g" />{t("Global CDN", "Global CDN")}</div>
        <div className="auth-brand-badge"><span className="auth-brand-badge-dot auth-brand-badge-dot--b" />{t("99.99% Uptime", "99.99% Uptime")}</div>
        <div className="auth-brand-badge">{t("One-Click Deploy", "One-Click Deploy")}</div>
      </div>

      {/* Server racks */}
      <div className="auth-brand-racks">
        <div className="auth-brand-rack">
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--b" /></div>
        </div>
        <div className="auth-brand-rack">
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--b" /></div>
        </div>
        <div className="auth-brand-rack">
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--b" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /></div>
        </div>
      </div>

      {/* SVG connection overlay — hub & spokes from host to racks */}
      <svg className="auth-brand-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Hub node at host base */}
        <circle cx="50" cy="38" r="1" className="auth-brand-hub" />

        {/* Paths from hub to each rack */}
        <path d="M 50 38 C 50 48, 30 48, 22 56" className="auth-brand-path" />
        <path d="M 50 38 L 50 56" className="auth-brand-path" />
        <path d="M 50 38 C 50 48, 70 48, 78 56" className="auth-brand-path" />

        {/* Animated packets along paths */}
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--a">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M 50 38 C 50 48, 30 48, 22 56" />
        </circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--b">
          <animateMotion dur="3s" repeatCount="indefinite" begin="0.8s" path="M 50 38 C 50 48, 30 48, 22 56" />
        </circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--c">
          <animateMotion dur="2.2s" repeatCount="indefinite" begin="0.3s" path="M 50 38 L 50 56" />
        </circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--d">
          <animateMotion dur="2.8s" repeatCount="indefinite" begin="1.5s" path="M 50 38 C 50 48, 70 48, 78 56" />
        </circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--e">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="1s" path="M 50 38 C 50 48, 70 48, 78 56" />
        </circle>

        {/* Rack endpoint nodes */}
        <circle cx="22" cy="56" r="0.75" className="auth-brand-node" />
        <circle cx="50" cy="56" r="0.75" className="auth-brand-node" />
        <circle cx="78" cy="56" r="0.75" className="auth-brand-node" />
      </svg>

      <div className="auth-brand-sync-pulse" />
      <div className="auth-brand-dataflow" />
      <div className="auth-brand-circuits" />
      <div className="auth-brand-orb auth-brand-orb--one" />
      <div className="auth-brand-orb auth-brand-orb--two" />

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
