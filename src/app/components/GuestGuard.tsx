import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../lib/customer-session";

export function GuestGuard() {
  if (isAuthenticated()) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}
