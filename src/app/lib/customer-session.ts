import type { CustomerSession } from "./customer-api";

const SESSION_KEY = "customer-control-panel.session";

export function getCustomerSession(): CustomerSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as Partial<CustomerSession>;
    if (!session.customerId || !session.email || !session.token) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session as CustomerSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveCustomerSession(session: CustomerSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function clearCustomerSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return !!getCustomerSession();
}
