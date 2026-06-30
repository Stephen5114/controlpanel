import { apiRequest, withCustomerHeaders } from "./api-core";
import type {
  SubscriptionSummary,
  SubscriptionWebsite,
  HostedSite,
  SubscriptionNodeHealth,
  SubscriptionFilesSite,
  SubscriptionFilesResponse,
  SubscriptionOverviewResponse,
  SubscriptionSecurityResponse,
  SubscriptionAlert,
  SubscriptionSecuritySite,
  HostedDatabase,
  HostingSubscription,
} from "./customer-api";
import type { CustomerSession } from "./api-core";
import { getCustomerSites } from "./api-sites";
import { buildSubscriptionId } from "./subscription-utils";

// ── Subscription management ─────────────────────────────────────────────────

export function getCustomerSubscriptions(session: CustomerSession): Promise<HostingSubscription[]> {
  return apiRequest<HostingSubscription[]>("/api/subscriptions", {
    headers: withCustomerHeaders(session),
  });
}

export async function getSubscriptionSites(session: CustomerSession, subscriptionId: string): Promise<HostedSite[]> {
  const allSites = await getCustomerSites(session);
  const [planSlug, regionSlug] = subscriptionId.split("_");
  return allSites.filter(s => s.hostingPlanSlug === planSlug && s.regionSlug === regionSlug);
}

export function getSubscriptionWebsites(session: CustomerSession, subscriptionId: string) {
  return apiRequest<SubscriptionWebsite[]>(`/api/subscriptions/${subscriptionId}/websites`, {
    headers: withCustomerHeaders(session),
  });
}

export function getSubscriptionOverview(session: CustomerSession, subscriptionId: string) {
  return apiRequest<SubscriptionOverviewResponse>(`/api/subscriptions/${subscriptionId}/overview`, {
    headers: withCustomerHeaders(session),
  });
}

export function getSubscriptionFiles(session: CustomerSession, subscriptionId: string) {
  return apiRequest<SubscriptionFilesResponse>(`/api/subscriptions/${subscriptionId}/files`, {
    headers: withCustomerHeaders(session),
  });
}

export function getSubscriptionSecurity(session: CustomerSession, subscriptionId: string) {
  return apiRequest<SubscriptionSecurityResponse>(`/api/subscriptions/${subscriptionId}/security`, {
    headers: withCustomerHeaders(session),
  });
}

export function createSubscriptionSite(
  session: CustomerSession,
  subscriptionId: string,
  payload: { siteName: string; domain: string },
) {
  return apiRequest<{ success: boolean; message: string; site?: HostedSite }>(`/api/subscriptions/${subscriptionId}/create-site`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      SiteName: payload.siteName,
      Domain: payload.domain,
    }),
  });
}

// ── Databases ───────────────────────────────────────────────────────────────

export function getHostedDatabases(session: CustomerSession, subscriptionId: string) {
  return apiRequest<HostedDatabase[]>(`/api/subscriptions/${subscriptionId}/databases`, {
    headers: withCustomerHeaders(session),
  });
}

export function createHostedDatabase(
  session: CustomerSession,
  subscriptionId: string,
  payload: { databaseName: string; databasePassword?: string; databaseSpaceMb?: number; hostedSiteId?: string; engine?: string }
) {
  return apiRequest<{ success: boolean; message: string; database?: HostedDatabase }>(`/api/subscriptions/${subscriptionId}/databases`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      DatabaseName: payload.databaseName,
      DatabasePassword: payload.databasePassword,
      DatabaseSpaceMb: payload.databaseSpaceMb,
      HostedSiteId: payload.hostedSiteId,
      Engine: payload.engine ?? "sqlserver",
    }),
  });
}

export function deleteHostedDatabase(session: CustomerSession, subscriptionId: string, databaseId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/subscriptions/${subscriptionId}/databases/${databaseId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function rotateHostedDatabasePassword(
  session: CustomerSession,
  subscriptionId: string,
  databaseId: string,
  payload: { databasePassword: string },
) {
  return apiRequest<{ success: boolean; message: string }>(`/api/subscriptions/${subscriptionId}/databases/${databaseId}/password`, {
    method: "PUT",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      DatabasePassword: payload.databasePassword,
    }),
  });
}
