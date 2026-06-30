import type {
  ServerNode,
  SubscriptionSummary,
  SubscriptionWebsite,
  HostedSite,
  PublishCredentials,
  HostedSiteHostnameSummary,
  StackCatalogEntry,
  StackCatalogResponse,
  UpdateSiteStackResult,
  PublishSiteResult,
  GitConfig,
  DeployLog,
  SubscriptionNodeHealth,
  SubscriptionFilesSite,
  SubscriptionFilesResponse,
  SiteFileBreadcrumb,
  SiteFileEntry,
  SiteFileBrowserResponse,
  SiteFileOperationResponse,
  SiteFileContentResponse,
  SiteFileContentSaveResponse,
  SubscriptionSecurityResponse,
  SubscriptionAlert,
  SubscriptionSecuritySite,
  HostedDatabase,
  CustomerAlert,
  SubscriptionOverviewResponse,
  HostingPlanDefinition,
  RegionDefinition,
  HostingCatalogResponse,
  CustomerProfile,
} from "./api-types";
import { apiRequest, apiBinaryRequest, withCustomerHeaders } from "./api-core";
import type { CustomerSession } from "./api-core";

// ── HostingCatalog ──────────────────────────────────────────────────────────

export function getHostingCatalog() {
  return apiRequest<HostingCatalogResponse>("/api/catalog");
}

// ── Customer profile / alerts / server ──────────────────────────────────────

export function getAssignedServer(session: CustomerSession) {
  return apiRequest<ServerNode>("/api/me/server", {
    headers: withCustomerHeaders(session),
  });
}

export function getCustomerProfile(session: CustomerSession) {
  return apiRequest<CustomerProfile>("/api/me/profile", {
    headers: withCustomerHeaders(session),
  });
}

export function getCustomerAlerts(session: CustomerSession) {
  return apiRequest<CustomerAlert[]>("/api/me/alerts", {
    headers: withCustomerHeaders(session),
  });
}

export function saveCustomerPreferences(
  session: CustomerSession,
  payload: { planSlug: string; regionSlug: string },
) {
  return apiRequest<{ success: boolean; message: string; profile: CustomerProfile }>("/api/me/preferences", {
    method: "PUT",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      PlanSlug: payload.planSlug,
      RegionSlug: payload.regionSlug,
    }),
  });
}

export function changePassword(
  session: CustomerSession,
  payload: { currentPassword: string; newPassword: string },
) {
  return apiRequest<{ success: boolean; message: string }>("/api/me/change-password", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      CurrentPassword: payload.currentPassword,
      NewPassword: payload.newPassword,
    }),
  });
}

// ── Customer sites ──────────────────────────────────────────────────────────

export function getCustomerSites(session: CustomerSession) {
  return apiRequest<HostedSite[]>("/api/sites", {
    headers: withCustomerHeaders(session),
  });
}

// ── Stack catalog ───────────────────────────────────────────────────────────

export function getStackCatalog() {
  return apiRequest<StackCatalogResponse>("/api/stacks");
}

// ── Site CRUD ───────────────────────────────────────────────────────────────

export function createHostedSite(
  session: CustomerSession,
  payload: { siteName: string; domain: string; planSlug?: string; regionSlug?: string }
) {
  return apiRequest<{ success: boolean; message: string; site?: HostedSite }>("/api/sites", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      SiteName: payload.siteName,
      Domain: payload.domain,
      PlanSlug: payload.planSlug,
      RegionSlug: payload.regionSlug,
    }),
  });
}

export function deleteHostedSite(session: CustomerSession, siteId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/sites/${siteId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function changeSiteFtpPassword(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  payload: { ftpPassword: string },
) {
  return apiRequest<{ success: boolean; message: string }>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/ftp-password`, {
    method: "PUT",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      FtpPassword: payload.ftpPassword,
    }),
  });
}

// ── Stack management ────────────────────────────────────────────────────────

export function updateSiteStack(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  payload: { stack: string; version?: string | null; startupCommand?: string | null },
) {
  return apiRequest<{ success: boolean; message: string; data: UpdateSiteStackResult | null }>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/stack`,
    {
      method: "PUT",
      headers: withCustomerHeaders(session),
      body: JSON.stringify({
        Stack: payload.stack,
        Version: payload.version ?? null,
        StartupCommand: payload.startupCommand ?? null,
      }),
    },
  );
}

// ── Publish ─────────────────────────────────────────────────────────────────

export async function downloadPublishProfile(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
) {
  const response = await apiBinaryRequest(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/publish-profile`,
    {
      headers: withCustomerHeaders(session),
    },
  );

  return {
    fileName: getResponseFileName(response),
    blob: await response.blob(),
  };
}

function getResponseFileName(response: Response) {
  const disposition = response.headers.get("Content-Disposition");
  if (!disposition) {
    return "download";
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = disposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] ?? "download";
}

export function publishSite(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  payload: { entryDll?: string | null } = {},
) {
  return apiRequest<{ success: boolean; message: string; data: PublishSiteResult | null }>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/publish`,
    {
      method: "POST",
      headers: withCustomerHeaders(session),
      body: JSON.stringify({
        EntryDll: payload.entryDll ?? null,
      }),
    },
  );
}

// ── Git config / deploy ─────────────────────────────────────────────────────

export function saveGitConfig(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  config: { repoUrl: string; branch: string; pat?: string | null },
) {
  return apiRequest<{ success: boolean; message: string; data: GitConfig | null }>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/git-config`,
    {
      method: "PUT",
      headers: withCustomerHeaders(session),
      body: JSON.stringify({ RepoUrl: config.repoUrl, Branch: config.branch, Pat: config.pat ?? null }),
    },
  );
}

export function getGitConfig(session: CustomerSession, subscriptionId: string, siteId: string) {
  return apiRequest<{ success: boolean; data: GitConfig | null }>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/git-config`,
    { headers: withCustomerHeaders(session) },
  );
}

export function triggerGitDeploy(session: CustomerSession, subscriptionId: string, siteId: string) {
  return apiRequest<{ success: boolean; message: string; data: { jobId: string; lastPublishStatus: string } | null }>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/git-deploy`,
    { method: "POST", headers: withCustomerHeaders(session) },
  );
}

export function getDeployLog(session: CustomerSession, subscriptionId: string, siteId: string) {
  return apiRequest<{ success: boolean; data: DeployLog | null }>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/deploy-log`,
    { headers: withCustomerHeaders(session) },
  );
}

// ── File management ─────────────────────────────────────────────────────────

export function getSiteFileBrowser(session: CustomerSession, subscriptionId: string, siteId: string, path = "") {
  const query = new URLSearchParams();
  if (path) {
    query.set("path", path);
  }

  return apiRequest<SiteFileBrowserResponse>(
    `/api/subscriptions/${subscriptionId}/sites/${siteId}/files${query.toString() ? `?${query.toString()}` : ""}`,
    {
      headers: withCustomerHeaders(session),
    },
  );
}

export function createSiteFolder(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  payload: { parentPath: string; name: string },
) {
  return apiRequest<SiteFileOperationResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/folders`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      ParentPath: payload.parentPath,
      Name: payload.name,
    }),
  });
}

export function createSiteEmptyFile(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  payload: { parentPath: string; name: string },
) {
  return apiRequest<SiteFileOperationResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/empty-file`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      ParentPath: payload.parentPath,
      Name: payload.name,
    }),
  });
}

export function getSiteFileContent(session: CustomerSession, subscriptionId: string, siteId: string, path: string) {
  const query = new URLSearchParams({ path });
  return apiRequest<SiteFileContentResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/content?${query.toString()}`, {
    headers: withCustomerHeaders(session),
  });
}

export function saveSiteFileContent(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  payload: { path: string; content: string },
) {
  return apiRequest<SiteFileContentSaveResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/content`, {
    method: "PUT",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Path: payload.path,
      Content: payload.content,
    }),
  });
}

export function deleteSiteFile(session: CustomerSession, subscriptionId: string, siteId: string, path: string) {
  const query = new URLSearchParams({ path });
  return apiRequest<SiteFileOperationResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files?${query.toString()}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function renameSiteEntry(session: CustomerSession, subscriptionId: string, siteId: string, path: string, newName: string) {
  return apiRequest<SiteFileOperationResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/rename`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({ path, newName }),
  });
}

export function uploadSiteFiles(
  session: CustomerSession,
  subscriptionId: string,
  siteId: string,
  path: string,
  files: File[],
) {
  const body = new FormData();
  body.append("path", path);
  files.forEach((file) => body.append("files", file));

  return apiRequest<SiteFileOperationResponse>(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/upload`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body,
  });
}

export async function downloadSiteFile(session: CustomerSession, subscriptionId: string, siteId: string, path: string) {
  const query = new URLSearchParams({ path });
  const response = await apiBinaryRequest(`/api/subscriptions/${subscriptionId}/sites/${siteId}/files/download?${query.toString()}`, {
    headers: withCustomerHeaders(session),
  });

  return {
    fileName: getResponseFileName(response),
    blob: await response.blob(),
  };
}
