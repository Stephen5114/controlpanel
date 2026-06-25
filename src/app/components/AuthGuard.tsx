import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../lib/customer-session";

export function AuthGuard() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Outlet />;
}
