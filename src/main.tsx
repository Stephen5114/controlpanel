import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { LocalizationProvider } from "./app/lib/i18n";
import { ThemeProvider } from "./app/lib/theme";
import "./styles/index.css";
import "driver.js/dist/driver.css";

function AuthLoadingFallback() {
  return (
    <div className="auth-brand auth-brand--loading">
      <div className="auth-brand-grid" />

      {/* SVG particles */}
      <svg className="auth-brand-particles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle r="0.5" fill="#93c5fd" opacity="0.8"><animateMotion dur="9s" repeatCount="indefinite" path="M8,82 L18,88 L6,76 L20,80 L10,72 L22,84 L30,68 Q40,52 46,36 L49,28 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.3;0.8;0.9;0.2;0.2" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="9s" repeatCount="indefinite"/></circle>
        <circle r="0.6" fill="#a855f7" opacity="0.85"><animateMotion dur="10s" repeatCount="indefinite" begin="4s" path="M5,72 L16,80 L8,68 L22,74 L12,66 L26,70 L34,56 Q42,42 47,30 L49,26 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.35;0.85;0.95;0.25;0.25" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="10s" begin="4s" repeatCount="indefinite"/></circle>
        <circle r="0.45" fill="#fbbf24" opacity="0.75"><animateMotion dur="13s" repeatCount="indefinite" begin="6s" path="M10,78 L4,72 L18,76 L10,66 L22,72 L14,62 L28,50 Q38,38 47,30 L49,27 L50,25"/><animate attributeName="opacity" values="0;0;0.55;0.3;0.75;0.9;0.2;0.2" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="13s" begin="6s" repeatCount="indefinite"/></circle>
        <circle r="0.55" fill="#c084fc" opacity="0.85"><animateMotion dur="11s" repeatCount="indefinite" begin="0.5s" path="M95,72 L84,80 L92,68 L78,74 L88,66 L74,70 L66,56 Q58,42 53,30 L51,26 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.35;0.85;0.95;0.25;0.25" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="11s" begin="0.5s" repeatCount="indefinite"/></circle>
        <circle r="0.5" fill="#3b82f6" opacity="0.8"><animateMotion dur="14s" repeatCount="indefinite" begin="5s" path="M90,78 L96,72 L82,76 L90,66 L78,72 L86,62 L72,50 Q62,38 53,30 L51,27 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.3;0.8;0.9;0.2;0.2" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="14s" begin="5s" repeatCount="indefinite"/></circle>
        <circle r="0.35" fill="#22c55e" opacity="0.7"><animateMotion dur="12s" repeatCount="indefinite" begin="2s" path="M88,86 L94,78 L80,84 L86,72 L74,78 L82,68 L68,54 Q58,40 53,32 L51,27 L50,25"/><animate attributeName="opacity" values="0;0;0.5;0.2;0.7;0.85;0.15;0.15" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="12s" begin="2s" repeatCount="indefinite"/></circle>
        <circle r="0.45" fill="#60a5fa" opacity="0.8"><animateMotion dur="8s" repeatCount="indefinite" begin="1.5s" path="M8,10 L18,6 L6,16 L16,12 L10,20 L20,14 L28,18 Q38,20 46,23 L49,24 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.35;0.8;0.9;0.2;0.2" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="8s" begin="1.5s" repeatCount="indefinite"/></circle>
        <circle r="0.5" fill="#a855f7" opacity="0.85"><animateMotion dur="11s" repeatCount="indefinite" begin="5s" path="M5,15 L14,8 L10,20 L22,10 L8,24 L18,16 L28,20 Q36,22 44,23 L49,24 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.35;0.85;0.95;0.25;0.25" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="11s" begin="5s" repeatCount="indefinite"/></circle>
        <circle r="0.35" fill="#fbbf24" opacity="0.7"><animateMotion dur="11s" repeatCount="indefinite" begin="7s" path="M12,8 L6,16 L20,12 L10,22 L24,10 L16,18 L26,14 Q34,18 44,22 L48,24 L50,25"/><animate attributeName="opacity" values="0;0;0.5;0.25;0.7;0.85;0.15;0.15" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="11s" begin="7s" repeatCount="indefinite"/></circle>
        <circle r="0.5" fill="#93c5fd" opacity="0.8"><animateMotion dur="8.5s" repeatCount="indefinite" begin="1s" path="M92,10 L82,6 L94,16 L84,12 L90,20 L80,14 L72,18 Q62,20 54,23 L51,24 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.35;0.8;0.9;0.2;0.2" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="8.5s" begin="1s" repeatCount="indefinite"/></circle>
        <circle r="0.35" fill="#22c55e" opacity="0.7"><animateMotion dur="11s" repeatCount="indefinite" begin="3s" path="M88,8 L94,16 L82,12 L90,22 L80,10 L86,20 L76,16 Q66,18 54,23 L51,24 L50,25"/><animate attributeName="opacity" values="0;0;0.5;0.25;0.7;0.85;0.15;0.15" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="11s" begin="3s" repeatCount="indefinite"/></circle>
        <circle r="0.45" fill="#c084fc" opacity="0.85"><animateMotion dur="10.5s" repeatCount="indefinite" begin="5.5s" path="M95,15 L86,8 L90,20 L78,10 L88,16 L80,24 L70,18 Q60,20 54,23 L51,24 L50,25"/><animate attributeName="opacity" values="0;0;0.6;0.35;0.85;0.95;0.25;0.25" keyTimes="0;0.15;0.3;0.5;0.65;0.8;0.9;1" dur="10.5s" begin="5.5s" repeatCount="indefinite"/></circle>
      </svg>

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

      {/* Connection overlay — rack 1 → rack 3 as loading progress */}
      <svg className="auth-brand-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle cx="50" cy="38" r="1" className="auth-brand-hub" />
        <path d="M 50 38 C 50 48, 30 48, 22 56" className="auth-brand-path" />
        <path d="M 50 38 L 50 56" className="auth-brand-path" />
        <path d="M 50 38 C 50 48, 70 48, 78 56" className="auth-brand-path" />
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--a"><animateMotion dur="2.5s" repeatCount="indefinite" path="M 50 38 C 50 48, 30 48, 22 56" /></circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--b"><animateMotion dur="3s" repeatCount="indefinite" begin="0.8s" path="M 50 38 C 50 48, 30 48, 22 56" /></circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--c"><animateMotion dur="2.2s" repeatCount="indefinite" begin="0.3s" path="M 50 38 L 50 56" /></circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--d"><animateMotion dur="2.8s" repeatCount="indefinite" begin="1.5s" path="M 50 38 C 50 48, 70 48, 78 56" /></circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--e"><animateMotion dur="3.2s" repeatCount="indefinite" begin="1s" path="M 50 38 C 50 48, 70 48, 78 56" /></circle>
        <circle cx="22" cy="56" r="0.75" className="auth-brand-node" />
        <circle cx="50" cy="56" r="0.75" className="auth-brand-node" />
        <circle cx="78" cy="56" r="0.75" className="auth-brand-node" />
      </svg>

      <div className="auth-brand-sync-pulse" />
      <div className="auth-brand-dataflow" />
      <div className="auth-brand-circuits" />
      <div className="auth-brand-orb auth-brand-orb--one" />
      <div className="auth-brand-orb auth-brand-orb--two" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<AuthLoadingFallback />}>
      <LocalizationProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </LocalizationProvider>
    </Suspense>
  </React.StrictMode>,
);
