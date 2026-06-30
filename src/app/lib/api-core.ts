import { clearCustomerSession } from "./customer-session";
import type { CustomerSession } from "./customer-api";
export type { CustomerSession } from "./customer-api";

// ── API infrastructure ──────────────────────────────────────────────────────

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function appendCacheBust(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}__ts=${Date.now()}`;
}

function resolveApiBaseCandidates() {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured) {
    return [trimTrailingSlash(configured)];
  }

  if (typeof window === "undefined") {
    return ["http://127.0.0.1:5032", "http://127.0.0.1:5132"];
  }

  const protocol = window.location.protocol === "https:" ? "https" : "http";
  const host = window.location.hostname || "127.0.0.1";

  return [
    `${protocol}://${host}:5032`,
    `${protocol}://${host}:5132`,
    "http://127.0.0.1:5032",
    "http://127.0.0.1:5132",
  ];
}

const API_BASE_URL_CANDIDATES = resolveApiBaseCandidates();
let activeApiBaseUrl = API_BASE_URL_CANDIDATES[0];

export function getActiveApiBaseUrl() {
  return activeApiBaseUrl;
}

type ApiErrorPayload = {
  message?: string;
};

const INVALID_CUSTOMER_SESSION_MESSAGES = new Set([
  "Customer not found.",
  "Customer not found or not active.",
  "Missing X-Customer-Id header.",
]);

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await parseJson<ApiErrorPayload>(response);
    if (payload.message) {
      return payload.message;
    }
  } catch {
    // Ignore parsing fallback.
  }

  return `Request failed: ${response.status}`;
}

function invalidateCustomerSession() {
  if (typeof window === "undefined") {
    return;
  }

  clearCustomerSession();

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function shouldInvalidateCustomerSession(path: string, response: Response, message: string) {
  if (path.startsWith("/api/auth/")) {
    return false;
  }

  return response.status === 401 || INVALID_CUSTOMER_SESSION_MESSAGES.has(message);
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const candidates = [activeApiBaseUrl, ...API_BASE_URL_CANDIDATES.filter((candidate) => candidate !== activeApiBaseUrl)];
  let lastConnectionError: Error | null = null;
  const method = (init?.method ?? "GET").toUpperCase();
  const shouldBypassCache = method === "GET" || method === "HEAD";
  const requestPath = shouldBypassCache ? appendCacheBust(path) : path;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  for (const baseUrl of candidates) {
    let response: Response;

    try {
      response = await fetch(`${baseUrl}${requestPath}`, {
        ...init,
        cache: shouldBypassCache ? "no-store" : init?.cache,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      lastConnectionError = new Error("Cannot connect to backend.");
      continue;
    }

    activeApiBaseUrl = baseUrl;

    if (!response.ok) {
      const message = await readErrorMessage(response);
      if (shouldInvalidateCustomerSession(path, response, message)) {
        invalidateCustomerSession();
        throw new Error("Your session has expired. Please sign in again.");
      }

      throw new Error(message);
    }

    return parseJson<T>(response);
  }

  throw lastConnectionError ?? new Error("Cannot connect to backend.");
}

export async function apiBinaryRequest(path: string, init?: RequestInit): Promise<Response> {
  const candidates = [activeApiBaseUrl, ...API_BASE_URL_CANDIDATES.filter((candidate) => candidate !== activeApiBaseUrl)];
  let lastConnectionError: Error | null = null;
  const method = (init?.method ?? "GET").toUpperCase();
  const shouldBypassCache = method === "GET" || method === "HEAD";
  const requestPath = shouldBypassCache ? appendCacheBust(path) : path;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  for (const baseUrl of candidates) {
    let response: Response;

    try {
      response = await fetch(`${baseUrl}${requestPath}`, {
        ...init,
        cache: shouldBypassCache ? "no-store" : init?.cache,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      lastConnectionError = new Error("Cannot connect to backend.");
      continue;
    }

    activeApiBaseUrl = baseUrl;

    if (!response.ok) {
      const message = await readErrorMessage(response);
      if (shouldInvalidateCustomerSession(path, response, message)) {
        invalidateCustomerSession();
        throw new Error("Your session has expired. Please sign in again.");
      }

      throw new Error(message);
    }

    return response;
  }

  throw lastConnectionError ?? new Error("Cannot connect to backend.");
}

export function withCustomerHeaders(session: CustomerSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.token}`,
    "X-Customer-Id": session.customerId,
  };
}
