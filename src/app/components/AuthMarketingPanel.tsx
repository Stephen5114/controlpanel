import { Check, Zap } from "lucide-react";

export function AuthMarketingPanel() {
  return (
    <div className="auth-brand">
      <div className="auth-brand-inner">
        <div className="auth-brand-logo">
          <Zap size={22} fill="currentColor" />
        </div>
        <div className="auth-brand-name">Vibe Hosting</div>
        <div className="auth-brand-tagline">
          You vibe it. We host it. From prompt to production in minutes.
        </div>
        <ul className="auth-brand-features">
          <li><Check size={18} /> Deploy in seconds â€” .NET, Python, PHP &amp; Spring Boot</li>
          <li><Check size={18} /> Auto-managed quotas, storage, and scaling</li>
          <li><Check size={18} /> Self-service dashboard for all your sites</li>
          <li><Check size={18} /> Built for vibe coders and AI-first builders</li>
        </ul>
      </div>
    </div>
  );
}
