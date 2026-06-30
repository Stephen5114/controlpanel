import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { LocalizationProvider } from "./app/lib/i18n";
import { ThemeProvider } from "./app/lib/theme";

import "./styles/index.css";
import "./styles/auth-loading.css";
import "./styles/ui-controls.css";
import "driver.js/dist/driver.css";
function AuthLoadingFallback() {
  return (
    <div className="auth-brand auth-brand--loading">
      {/* Sequential connection: rack 1 → rack 2 → rack 3 */}
      <svg className="auth-brand-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Path rack1→rack2 with animated draw */}
        <path d="M 22 56 L 50 56" className="auth-brand-path auth-brand-path--load" />
        {/* Path rack2→rack3 with animated draw */}
        <path d="M 50 56 L 78 56" className="auth-brand-path auth-brand-path--load auth-brand-path--load-2" />
        {/* Data packets */}
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--a">
          <animateMotion dur="1.5s" repeatCount="indefinite" path="M 22 56 L 50 56" />
        </circle>
        <circle r="0.6" className="auth-brand-pkt auth-brand-pkt--c">
          <animateMotion dur="1.5s" repeatCount="indefinite" path="M 50 56 L 78 56" />
        </circle>
        {/* Nodes light up sequentially */}
        <circle cx="22" cy="56" r="0.75" className="auth-brand-node auth-brand-node--rack1" />
        <circle cx="50" cy="56" r="0.75" className="auth-brand-node auth-brand-node--rack2" />
        <circle cx="78" cy="56" r="0.75" className="auth-brand-node auth-brand-node--rack3" />
      </svg>

      {/* Server racks with connection states */}
      <div className="auth-brand-racks">
        <div className="auth-brand-rack auth-brand-rack--1">
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--b" /></div>
        </div>
        <div className="auth-brand-rack auth-brand-rack--2">
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--b" /></div>
        </div>
        <div className="auth-brand-rack auth-brand-rack--3">
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /><span className="auth-brand-led auth-brand-led--g" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--b" /><span className="auth-brand-led auth-brand-led--b" /></div>
          <div className="auth-brand-blade"><span className="auth-brand-led auth-brand-led--g" /></div>
        </div>
      </div>

      <div className="auth-brand-dataflow" />

      {/* Loading indicator */}
      <div className="auth-brand-loading">
        <div className="auth-brand-loading-text">Loading</div>
        <div className="auth-brand-loading-bar">
          <div className="auth-brand-loading-bar-fill" />
        </div>
      </div>
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
