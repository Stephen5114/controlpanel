import { Link } from "react-router-dom";
import { useLocalization } from "../lib/i18n";

interface LogoProps {
  compact?: boolean;
  className?: string;
  to?: string;
}

export function Logo({ compact = false, className = "", to = "/" }: LogoProps) {
  const { t } = useLocalization();

  return (
    <Link to={to} className={`logo ${className}`.trim()} aria-label={t("Vibe Hosting Home", "Vibe Hosting Home")}>
      <svg
        className="logo-mark"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        width={compact ? 28 : 32}
        height={compact ? 28 : 32}
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path d="M4 32L20 4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 4L36 32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 6L14 20h8l-6 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span className="logo-text">
          <span className="logo-text-brand">Vibe</span>
          <span className="logo-text-accent">Hosting</span>
        </span>
      )}
    </Link>
  );
}
