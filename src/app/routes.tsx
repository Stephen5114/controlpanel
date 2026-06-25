import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { GuestGuard } from "./components/GuestGuard";
import { RootLayout } from "./layout/RootLayout";
import { SiteLayout } from "./layout/SiteLayout";

// Lazy-loaded page components (named exports wrapped for React.lazy)
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const AddonsPage = lazy(() => import("./pages/AddonsPage").then(m => ({ default: m.AddonsPage })));
const BillingPage = lazy(() => import("./pages/BillingPage").then(m => ({ default: m.BillingPage })));
const SupportPage = lazy(() => import("./pages/SupportPage").then(m => ({ default: m.SupportPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const LoginAsPage = lazy(() => import("./pages/LoginAsPage").then(m => ({ default: m.LoginAsPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const BuySubscriptionPage = lazy(() => import("./pages/BuySubscriptionPage").then(m => ({ default: m.BuySubscriptionPage })));
const TopupPage = lazy(() => import("./pages/TopupPage").then(m => ({ default: m.TopupPage })));
const DomainsPage = lazy(() => import("./pages/DomainsPage").then(m => ({ default: m.DomainsPage })));
const SubscriptionLayout = lazy(() => import("./layout/SubscriptionLayout").then(m => ({ default: m.SubscriptionLayout })));
const SubscriptionOverviewPage = lazy(() => import("./pages/SubscriptionOverviewPage").then(m => ({ default: m.SubscriptionOverviewPage })));
const SubscriptionDatabasesPage = lazy(() => import("./pages/SubscriptionDatabasesPage").then(m => ({ default: m.SubscriptionDatabasesPage })));
const SubscriptionFilesPage = lazy(() => import("./pages/SubscriptionFilesPage").then(m => ({ default: m.SubscriptionFilesPage })));
const SubscriptionSecurityPage = lazy(() => import("./pages/SubscriptionSecurityPage").then(m => ({ default: m.SubscriptionSecurityPage })));
const SiteDomainsPage = lazy(() => import("./pages/SiteDomainsPage").then(m => ({ default: m.SiteDomainsPage })));
const SiteSettingsPage = lazy(() => import("./pages/SiteSettingsPage").then(m => ({ default: m.SiteSettingsPage })));

function SiteSettingsRedirect() {
  const { subId, siteId } = useParams();
  return <Navigate to={`/subscription/${subId}/site/${siteId}/settings`} replace />;
}

function SubscriptionDatabasesRedirect() {
  const { subId } = useParams();
  return <Navigate to={`/subscription/${subId}/databases`} replace />;
}

export const router = createBrowserRouter([
  { path: "/login-as", element: <LoginAsPage /> },
  {
    element: <GuestGuard />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: "/",
        element: <RootLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "buy", element: <BuySubscriptionPage /> },
          { path: "topup", element: <TopupPage /> },
          { path: "domains", element: <DomainsPage /> },
          {
            path: "subscription/:subId",
            element: <SubscriptionLayout />,
            children: [
              { index: true, element: <SubscriptionOverviewPage /> },
              { path: "overview", element: <SubscriptionOverviewPage /> },
              { path: "databases", element: <SubscriptionDatabasesPage /> },
              { path: "files", element: <SubscriptionFilesPage /> },
              { path: "security", element: <SubscriptionSecurityPage /> },
              { path: "settings", element: <div className="empty-panel stack"><h2>Subscription Settings</h2><p>Change billing and limits here.</p></div> }
            ]
          },
          {
            path: "subscription/:subId/site/:siteId",
            element: <SiteLayout />,
            children: [
              { index: true, element: <SiteSettingsRedirect /> },
              { path: "overview", element: <SiteSettingsRedirect /> },
              { path: "domains", element: <SiteDomainsPage /> },
              { path: "databases", element: <SubscriptionDatabasesRedirect /> },
              { path: "settings", element: <SiteSettingsPage /> },
            ]
          },
          { path: "addons", element: <AddonsPage /> },
          { path: "services", element: <Navigate to="/addons" replace /> },
          { path: "billing", element: <BillingPage /> },
          { path: "support", element: <SupportPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
