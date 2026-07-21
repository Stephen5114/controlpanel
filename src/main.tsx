import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { LocalizationProvider } from "./app/lib/i18n";
import { ThemeProvider } from "./app/lib/theme";

import "./styles/index.css";
import "./styles/auth.css";
import "./styles/ui-controls.css";
import "./styles/dashboard.css";
import "./styles/billing.css";
import "./styles/databases.css";
import "./styles/domains.css";
import "./styles/domain-bind.css";
import "./styles/files.css";
import "./styles/support.css";
import "./styles/subscription-overview.css";
import "./styles/vps.css";
import "./styles/affiliate.css";
import "./styles/publish-dialog.css";
import "./styles/buy-subscription.css";
import "./styles/env-vars-editor.css";
import "./styles/deployments.css";
import "./styles/settings.css";
import "./styles/subscription-databases.css";
import "./styles/site-settings.css";
import "./styles/topup.css";
import "./styles/node-deploy-guide.css";

import "./styles/landing.css";
import "./styles/status.css";
import "driver.js/dist/driver.css";

// A customer can keep an older index bundle open while a new release is
// being deployed. If one of that bundle's lazy chunks is no longer available,
// reload once so the browser receives the current hashed asset manifest.
const chunkReloadKey = "cp-chunk-reload-at";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const previousReload = Number(sessionStorage.getItem(chunkReloadKey) ?? "0");
  if (Date.now() - previousReload > 15_000) {
    sessionStorage.setItem(chunkReloadKey, String(Date.now()));
    window.location.reload();
  }
});
window.setTimeout(() => sessionStorage.removeItem(chunkReloadKey), 20_000);

function AuthLoadingFallback() {
  return (
    <div className="auth-brand auth-brand--loading">
      <div className="auth-brand-loading">
        <svg
          className="logo-mark"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          width={56}
          height={56}
          style={{ color: "#818cf8" }}
        >
          <defs>
            <linearGradient id="logo-grad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <path d="M4 32L20 4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 4L36 32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 6L14 20h8l-6 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

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
