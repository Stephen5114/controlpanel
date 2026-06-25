import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { GuestGuard } from "./components/GuestGuard";
import { RootLayout } from "./layout/RootLayout";
import { SiteLayout } from "./layout/SiteLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { AddonsPage } from "./pages/AddonsPage";
import { BillingPage } from "./pages/BillingPage";
import { SupportPage } from "./pages/SupportPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { LoginAsPage } from "./pages/LoginAsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { BuySubscriptionPage } from "./pages/BuySubscriptionPage";
import { TopupPage } from "./pages/TopupPage";
import { DomainsPage } from "./pages/DomainsPage";
import { SubscriptionLayout } from "./layout/SubscriptionLayout";
import { SubscriptionOverviewPage } from "./pages/SubscriptionOverviewPage";
import { SubscriptionDatabasesPage } from "./pages/SubscriptionDatabasesPage";
import { SubscriptionFilesPage } from "./pages/SubscriptionFilesPage";
import { SubscriptionSecurityPage } from "./pages/SubscriptionSecurityPage";
import { SiteDomainsPage } from "./pages/SiteDomainsPage";
import { SiteSettingsPage } from "./pages/SiteSettingsPage";

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
