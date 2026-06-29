import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { LocalizationProvider, detectInitialLang } from "./app/lib/i18n";
import { ThemeProvider } from "./app/lib/theme";
import "./styles/index.css";
import "driver.js/dist/driver.css";

const LOADING_TEXTS: Record<string, string> = {
  EN: "Loading...",
  ZH: "加载中...",
  ES: "Cargando...",
  JA: "読み込み中...",
};

function LoadingFallback() {
  const lang = detectInitialLang();
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontSize: "1.1rem", color: "#6b7280" }}>
      {LOADING_TEXTS[lang] ?? LOADING_TEXTS.EN}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <LocalizationProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </LocalizationProvider>
    </Suspense>
  </React.StrictMode>,
);
