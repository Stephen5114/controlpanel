import { clearCustomerSession } from "./customer-session";

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

export type CustomerSession = {
  customerId: string;
  email: string;
  token: string;
  impersonated?: boolean;
  staffEmail?: string | null;
  staffRole?: string | null;
  impersonationExpiresUtc?: string | null;
};

export type HostingPlanDefinition = {
  slug: string;
  name: string;
  description: string;
  recommendedSiteLimit: number;
  diskLimitMb: number;
  fileLimitCount: number;
  monthlyPrice: number;
  nodeType: string;
  recommendedDatabaseLimit: number;
};

export type RegionDefinition = {
  slug: string;
  name: string;
  availableNodeCount: number;
  isDefault: boolean;
};

export type HostingCatalogResponse = {
  plans: HostingPlanDefinition[];
  regions: RegionDefinition[];
};

export type PublishCredentials = {
  ftpHost: string;
  ftpUser: string;
  ftpPassword: string;
  webDeployEndpoint: string;
  deployUser: string;
  deployPassword: string;
};

export type HostedSiteHostnameSummary = {
  hostname: string;
  isDefault: boolean;
  bindingStatus: string;
  isSystemBinding: boolean;
};

export type HostedSite = {
  id: string;
  customerId: string;
  serverNodeId: string;
  siteName: string;
  domain: string;
  hostingPlanSlug: string;
  hostingPlanName: string;
  regionSlug: string;
  physicalPath: string;
  appPoolName: string;
  port: number;
  diskLimitMb: number;
  fileLimitCount: number;
  publish: PublishCredentials;
  provisioningStatus: string;
  lastProvisionError: string | null;
  hostnames: HostedSiteHostnameSummary[];
  subscriptionId: string | null;
  createdUtc: string;
  publicIpAddress: string | null;
};

export type VerificationInstruction = {
  name: string;
  type: string;
  value: string;
  purpose: string;
};

export type DomainRecord = {
  id: string;
  domainZoneId: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied: boolean;
  isProtected: boolean;
  syncStatus: string;
  lastError: string | null;
  createdUtc: string;
  updatedUtc: string;
};

export type SiteHostnameBinding = {
  id: string;
  hostedSiteId: string;
  domainZoneId: string | null;
  hostname: string;
  isPrimary: boolean;
  isSystemBinding: boolean;
  isEnabled: boolean;
  bindingStatus: string;
  httpsStatus: string;
  lastError: string | null;
  createdUtc: string;
  verifiedUtc: string | null;
  activatedUtc: string | null;
  disabledUtc: string | null;
  dnsInstructions: VerificationInstruction[];
};

export type DomainZone = {
  id: string;
  customerId: string;
  rootDomain: string;
  sourceType: string;
  dnsMode: string;
  delegationStatus: string;
  cloudflareZoneId: string | null;
  nameservers: string[];
  verificationInstruction: VerificationInstruction | null;
  lastError: string | null;
  createdUtc: string;
  verifiedUtc: string | null;
  records: DomainRecord[];
  bindings: SiteHostnameBinding[];
};

export type ConnectedDomain = {
  id: string;
  site: HostedSite;
  binding: SiteHostnameBinding;
  zone: DomainZone | null;
  subscriptionId: string;
};

export type ConnectedDomainsSnapshot = {
  domains: ConnectedDomain[];
  zones: DomainZone[];
};

export type RegistrarDomain = {
  domainName: string;
  createDate: string | null;
  expireDate: string | null;
  autorenewEnabled: boolean;
  locked: boolean;
  privacyEnabled: boolean;
  nameservers: string[];
  locks: string[];
  renewalPrice: number | null;
};

export type RegistrarDomainListResponse = {
  domains: RegistrarDomain[];
  from: number;
  to: number;
  totalCount: number;
  lastPage: number | null;
  nextPage: number | null;
};

export type RegistrarDomainListQuery = {
  page?: number;
  perPage?: number;
  sort?: string;
  dir?: "asc" | "desc";
  domainName?: string;
  tld?: string;
  locked?: boolean;
  privacyEnabled?: boolean;
  autorenewEnabled?: boolean;
};

export type DomainSearchResult = {
  domainName: string;
  purchasable: boolean;
  sld: string;
  tld: string;
  premium: boolean;
  registrarPurchasePrice: number | null;
  customerPurchasePrice: number | null;
  renewalPrice: number | null;
  purchaseType: string;
  reason: string | null;
};

export type DomainSearchResponse = {
  results: DomainSearchResult[];
};

export type CustomerDomain = {
  id: string;
  domainName: string;
  status: string;
  createDateUtc: string | null;
  expireDateUtc: string | null;
  privacyEnabled: boolean;
  locked: boolean;
  platformAutoRenewEnabled: boolean;
  renewalPrice: number | null;
  nameservers: string[];
  locks: string[];
  transferApprovalEmail: string | null;
  createdUtc: string;
  updatedUtc: string;
  lastSyncedUtc: string | null;
  lastError: string | null;
};

export type DomainContactProfile = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
  updatedUtc: string;
};

export type DomainContactProfilePayload = Omit<DomainContactProfile, "id" | "updatedUtc">;

export type CustomerDomainListResponse = {
  domains: CustomerDomain[];
  contactProfile: DomainContactProfile | null;
  stripeConfigured: boolean;
};

export type DomainCheckoutResponse = {
  success: boolean;
  message: string;
  orderId: string | null;
  checkoutUrl: string | null;
};

export type DomainOperationResponse = {
  success: boolean;
  message: string;
  domain: CustomerDomain | null;
};

export type DomainAutoRenewSetupResponse = {
  success: boolean;
  message: string;
  checkoutUrl: string | null;
  domain: CustomerDomain | null;
};

export type HostedDatabase = {
  id: string;
  subscriptionId: string;
  databaseName: string;
  dbUser: string;
  dbPassword?: string;
  databaseSpaceMb: number;
  serverHost: string;
  provisioningStatus: string;
  lastProvisionError: string | null;
  createdUtc: string;
  siteId: string | null;
  siteName: string | null;
  engine: 'sqlserver' | 'mysql';
};

export type CustomerAlert = {
  type: string;
  severity: string;
  siteId: string;
  siteName: string;
  hostname: string;
  message: string;
  detectedUtc: string;
  autoDisableAtUtc: string | null;
  href: string;
};

export type BillingSummary = {
  currency: string;
  openBalance: number;
  creditBalance: number;
  openInvoiceCount: number;
  activeSubscriptionCount: number;
  savedPaymentMethodCount: number;
  totalMonthlyRecurring: number;
  nextRenewalUtc: string | null;
};

export type BillingSubscriptionView = {
  id: string;
  scopeType: string;
  scopeReference: string;
  displayName: string;
  status: string;
  currency: string;
  unitAmount: number;
  quantity: number;
  monthlyAmount: number;
  legacyMigrated: boolean;
  startsUtc: string;
  currentPeriodStartUtc: string | null;
  currentPeriodEndUtc: string | null;
  nextInvoiceAtUtc: string | null;
  gracePeriodEndsUtc: string | null;
  cancelAtPeriodEnd: boolean;
  lastError: string | null;
};

export type BillingInvoiceLineView = {
  id: string;
  family: string;
  description: string;
  quantity: number;
  unitAmount: number;
  lineSubtotal: number;
  discountTotal: number;
  lineTotal: number;
};

export type BillingInvoiceView = {
  id: string;
  billingOrderId: string | null;
  billingSubscriptionId: string | null;
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  description: string | null;
  notes: string | null;
  issuedUtc: string;
  dueUtc: string | null;
  paidUtc: string | null;
  lines: BillingInvoiceLineView[];
};

export type BillingTransactionView = {
  id: string;
  billingInvoiceId: string | null;
  billingOrderId: string | null;
  billingSubscriptionId: string | null;
  type: string;
  status: string;
  currency: string;
  amount: number;
  provider: string;
  providerReference: string | null;
  paymentMethodSnapshot: string | null;
  description: string | null;
  failureReason: string | null;
  occurredUtc: string;
};

export type BillingPaymentMethodView = {
  id: string;
  provider: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  status: string;
  createdUtc: string;
  lastUsedUtc: string | null;
};

export type BillingLedgerEntryView = {
  id: string;
  billingInvoiceId: string | null;
  billingTransactionId: string | null;
  entryType: string;
  direction: string;
  currency: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdUtc: string;
};

export type BillingCouponView = {
  id: string;
  code: string;
  name: string;
  discountType: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  appliesToFamily: string | null;
  appliesToProductCode: string | null;
  isActive: boolean;
  maxRedemptions: number | null;
  redeemedCount: number;
  startsUtc: string | null;
  endsUtc: string | null;
};

export type CouponValidationResult = {
  success: boolean;
  message: string;
  coupon: BillingCouponView | null;
  discountAmount: number;
};

export type BillingOverview = {
  summary: BillingSummary;
  subscriptions: BillingSubscriptionView[];
  invoices: BillingInvoiceView[];
  transactions: BillingTransactionView[];
  paymentMethods: BillingPaymentMethodView[];
  ledger: BillingLedgerEntryView[];
  coupons: BillingCouponView[];
};

export type BillingCheckoutResponse = {
  success: boolean;
  message: string;
  orderId: string | null;
  checkoutUrl: string | null;
  subscriptionScopeReference: string | null;
};

export type ServerNode = {
  id: string;
  nodeName: string;
  publicHost: string;
  publicIpAddress: string | null;
  privateIpAddress: string | null;
  lastSeenRemoteIp: string | null;
  winRmConnectHost: string | null;
  winRmTargetSource: string;
  winRmEnabled: boolean;
  winRmStatus: string;
  nodeType: string;
  regionSlug: string;
  enabled: boolean;
  isOnline: boolean;
  reportedIisSiteCount: number;
  lastHeartbeatUtc: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  bytesTotalPerSec: number;
};

export type SubscriptionSummary = {
  id: string;
  name: string;
  planSlug: string;
  regionSlug: string;
  status: string;
  siteQuota: number;
  usedSites: number;
  databaseQuota: number;
  usedDatabases: number;
  diskQuotaMb: number;
  planDiskLimitMb: number;
  fileQuotaCount: number;
  storageUsedBytes: number;
  monthlyBandwidthBytes: number;
  createdUtc: string;
};

export type SubscriptionWebsite = {
  id: string;
  siteName: string;
  domain: string;
  provisioningStatus: string;
  lastProvisionError: string | null;
  platformSummary: string;
  publicIpAddress: string | null;
  serverHost: string | null;
  isQuotaBlocked: boolean;
  iisSiteState: string;
  appPoolState: string;
  hasHttpBinding: boolean;
  hasHttpsBinding: boolean;
  createdUtc: string;
  stack: string;
  stackVersion: string | null;
  runtimeStatus: string | null;
  runtimeMessage: string | null;
  runtimeReadyUtc: string | null;
  lastPublishedUtc: string | null;
  lastPublishStatus: string | null;
  lastPublishMessage: string | null;
  hasActivePublishJob: boolean;
  hasActiveRuntimeJob: boolean;
  publish: PublishCredentials | null;
  hostnames: HostedSiteHostnameSummary[] | null;
  gitRepoUrl: string | null;
  gitBranch: string | null;
  gitHasPat: boolean;
};

export type StackVersionOption = {
  value: string;
  label: string;
  isDefault: boolean;
};

export type StackCatalogEntry = {
  slug: string;
  name: string;
  description: string;
  status: "available" | "coming_soon" | string;
  icon: string;
  versions: StackVersionOption[];
};

export type StackCatalogResponse = {
  stacks: StackCatalogEntry[];
};

export type UpdateSiteStackResult = {
  success: boolean;
  message: string;
  stack: string;
  stackVersion: string | null;
  runtimeStatus: string | null;
  runtimeMessage: string | null;
  runtimeReadyUtc: string | null;
  runtimeJobQueued: boolean;
};

export type PublishSiteResult = {
  success: boolean;
  message: string;
  jobId: string | null;
  stack: string;
  stackVersion: string | null;
  lastPublishStatus: string | null;
  lastPublishedUtc: string | null;
};

export type SubscriptionNodeHealth = {
  id: string;
  nodeName: string;
  regionSlug: string;
  status: string;
  summary: string;
  publicIpAddress: string | null;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  networkThroughputMbps: number;
  uptimePercent: number | null;
  lastHeartbeatUtc: string;
};

export type SubscriptionFilesSite = {
  siteId: string;
  siteName: string;
  domain: string;
  physicalPath: string;
  diskUsedBytes: number;
  diskQuotaMb: number;
  fileCount: number;
  fileQuotaCount: number;
  isQuotaBlocked: boolean;
  lastScannedUtc: string | null;
  scanError: string | null;
};

export type SubscriptionFilesResponse = {
  subscription: SubscriptionSummary;
  totalDiskUsedBytes: number;
  totalFileCount: number;
  sites: SubscriptionFilesSite[];
};

export type SiteFileBreadcrumb = {
  name: string;
  path: string;
};

export type SiteFileEntry = {
  name: string;
  relativePath: string;
  entryType: string;
  sizeBytes: number;
  lastModifiedUtc: string;
};

export type SiteFileBrowserResponse = {
  subscription: SubscriptionSummary;
  siteId: string;
  siteName: string;
  domain: string;
  physicalPath: string;
  currentPath: string;
  parentPath: string | null;
  diskUsedBytes: number;
  diskQuotaMb: number;
  fileCount: number;
  fileQuotaCount: number;
  isQuotaBlocked: boolean;
  lastScannedUtc: string | null;
  scanError: string | null;
  breadcrumbs: SiteFileBreadcrumb[];
  entries: SiteFileEntry[];
};

export type SiteFileOperationResponse = {
  success: boolean;
  message: string;
  currentPath: string;
};

export type SiteFileContentResponse = {
  relativePath: string;
  absolutePath: string;
  fileName: string;
  sizeBytes: number;
  lastModifiedUtc: string;
  content: string;
};

export type SiteFileContentSaveResponse = {
  success: boolean;
  message: string;
  relativePath: string;
  sizeBytes: number;
  lastModifiedUtc: string;
};

export type SubscriptionAlert = {
  type: string;
  severity: string;
  siteId: string;
  siteName: string;
  hostname: string;
  message: string;
  detectedUtc: string;
  autoDisableAtUtc: string | null;
  href: string;
};

export type SubscriptionSecuritySite = {
  siteId: string;
  siteName: string;
  domain: string;
  hostnameState: string;
  httpsState: string;
  hasHttpBinding: boolean;
  hasHttpsBinding: boolean;
  isQuotaBlocked: boolean;
  certificateSubject: string | null;
  certificateExpiresUtc: string | null;
  lastScannedUtc: string | null;
};

export type SubscriptionSecurityResponse = {
  subscription: SubscriptionSummary;
  alerts: SubscriptionAlert[];
  sites: SubscriptionSecuritySite[];
};

export type SubscriptionOverviewResponse = {
  subscription: SubscriptionSummary;
  node: SubscriptionNodeHealth | null;
  websites: SubscriptionWebsite[];
  databases: HostedDatabase[];
  files: SubscriptionFilesResponse;
  security: SubscriptionSecurityResponse;
};

export type RegisterCustomerResponse = {
  success: boolean;
  message: string;
  waitlisted: boolean;
  customerId: string | null;
  serverNodeId: string | null;
  requiresEmailVerification: boolean;
  verificationPreviewUrl: string | null;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  customerId: string | null;
  token: string | null;
  requiresEmailVerification: boolean;
  verificationPreviewUrl: string | null;
};

export type ResendVerificationResponse = {
  success: boolean;
  message: string;
  verificationPreviewUrl: string | null;
};

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
  requiresEmailVerification: boolean;
  verificationPreviewUrl: string | null;
  resetPreviewUrl: string | null;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
  email: string | null;
};

export type SupportAttachment = {
  id: string;
  messageId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdUtc: string;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderType: "customer" | "staff" | "system" | string;
  senderEmail: string;
  body: string;
  impersonated: boolean;
  createdUtc: string;
  attachments: SupportAttachment[];
  senderDisplayName?: string | null;
};

export type SupportTicket = {
  id: string;
  customerId: string;
  customerEmail: string;
  subject: string;
  status: string;
  priority: string;
  assignedStaffUserId: string | null;
  assignedStaffEmail: string | null;
  createdUtc: string;
  updatedUtc: string;
  closedUtc: string | null;
  messageCount: number;
  attachmentCount: number;
  messages: SupportMessage[];
  awaitingStaff?: boolean;
};

export type SupportOperationResponse = {
  success: boolean;
  message: string;
  ticket: SupportTicket | null;
  supportMessage: SupportMessage | null;
};

export type SupportChatMessage = {
  id: string;
  sessionId: string;
  senderType: "customer" | "staff" | string;
  senderEmail: string;
  body: string;
  createdUtc: string;
  senderDisplayName?: string | null;
};

export type SupportChatSession = {
  id: string;
  customerId: string;
  customerEmail: string;
  ticketId: string | null;
  status: string;
  createdUtc: string;
  updatedUtc: string;
  messages: SupportChatMessage[];
};

export type VerifyEmailResponse = {
  success: boolean;
  message: string;
  email: string | null;
};

export type CustomerProfile = {
  id: string;
  username: string | null;
  email: string;
  status: string;
  createdUtc: string;
  assignedServerNodeId: string | null;
  preferredPlanSlug: string;
  preferredPlanName: string;
  preferredRegionSlug: string;
};

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

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

async function apiBinaryRequest(path: string, init?: RequestInit): Promise<Response> {
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

function withCustomerHeaders(session: CustomerSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.token}`,
    "X-Customer-Id": session.customerId,
  };
}

export function registerCustomer(payload: { email: string; password: string; username?: string; turnstileToken?: string }) {
  return apiRequest<RegisterCustomerResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginCustomer(payload: { email: string; password: string }) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendVerificationEmail(payload: { email: string }) {
  return apiRequest<ResendVerificationResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmailToken(token: string) {
  const query = new URLSearchParams({ token });
  return apiRequest<VerifyEmailResponse>(`/api/auth/verify-email?${query.toString()}`);
}

export function verifyEmailWithCode(payload: { email: string; code: string }) {
  return apiRequest<VerifyEmailResponse>("/api/auth/verify-email/code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestPasswordReset(payload: { email: string }) {
  return apiRequest<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ResetPasswordPayload =
  | { token: string; password: string }
  | { email: string; code: string; password: string };

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<ResetPasswordResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSupportTickets(session: CustomerSession) {
  return apiRequest<SupportTicket[]>("/api/customer/support/tickets", {
    headers: withCustomerHeaders(session),
  });
}

export function getSupportTicket(session: CustomerSession, ticketId: string) {
  return apiRequest<SupportTicket>(`/api/customer/support/tickets/${ticketId}`, {
    headers: withCustomerHeaders(session),
  });
}

export function createSupportTicket(session: CustomerSession, payload: { subject: string; message: string }) {
  return apiRequest<SupportOperationResponse>("/api/customer/support/tickets", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Subject: payload.subject,
      Message: payload.message,
    }),
  });
}

export function replySupportTicket(session: CustomerSession, ticketId: string, body: string) {
  return apiRequest<SupportOperationResponse>(`/api/customer/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({ Body: body }),
  });
}

export function closeSupportTicket(session: CustomerSession, ticketId: string) {
  return apiRequest<SupportOperationResponse>(`/api/customer/support/tickets/${ticketId}/close`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function uploadSupportAttachment(session: CustomerSession, ticketId: string, messageId: string, file: File) {
  const form = new FormData();
  form.append("messageId", messageId);
  form.append("file", file);
  return apiRequest<{ success: boolean; message: string; attachment: SupportAttachment | null }>(`/api/customer/support/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: form,
  });
}

export function getSupportAttachment(session: CustomerSession, attachmentId: string) {
  return apiBinaryRequest(`/api/customer/support/attachments/${attachmentId}`, {
    headers: withCustomerHeaders(session),
  });
}

export function startSupportChat(session: CustomerSession) {
  return apiRequest<SupportChatSession>("/api/customer/support/chat/start", {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function closeSupportChat(session: CustomerSession, sessionId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/customer/support/chat/${sessionId}/close`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function getHostingCatalog() {
  return apiRequest<HostingCatalogResponse>("/api/catalog");
}

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

export function getCustomerSites(session: CustomerSession) {
  return apiRequest<HostedSite[]>("/api/sites", {
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

// --- Subscription workspace API ---

export type HostingSubscription = SubscriptionSummary;

export function buildSubscriptionId(planSlug: string, regionSlug: string) {
  return `${planSlug}_${regionSlug}`;
}

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

export function getSubscriptionSecurity(session: CustomerSession, subscriptionId: string) {
  return apiRequest<SubscriptionSecurityResponse>(`/api/subscriptions/${subscriptionId}/security`, {
    headers: withCustomerHeaders(session),
  });
}

/**
 * Creates a new site via the real backend POST /api/sites.
 */
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

/**
 * Deletes a site via the real backend DELETE /api/sites/{siteId}.
 */
export function deleteHostedSite(session: CustomerSession, siteId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/sites/${siteId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function getStackCatalog() {
  return apiRequest<StackCatalogResponse>("/api/stacks");
}

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

export type GitConfig = {
  repoUrl: string | null;
  branch: string | null;
  hasPat: boolean;
};

export type DeployLog = {
  jobId: string | null;
  jobStatus: string;
  logText: string | null;
  updatedUtc: string | null;
};

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

export function listRegistrarDomains(session: CustomerSession, query: RegistrarDomainListQuery = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return apiRequest<RegistrarDomainListResponse>(`/api/registrar/name-com/domains${queryString ? `?${queryString}` : ""}`, {
    headers: withCustomerHeaders(session),
  });
}

export function searchDomains(session: CustomerSession, payload: { query: string; tlds?: string[]; years?: number }) {
  return apiRequest<DomainSearchResponse>("/api/domain-commerce/search", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Query: payload.query,
      Tlds: payload.tlds,
      Years: payload.years,
    }),
  });
}

export function getCustomerDomains(session: CustomerSession) {
  return apiRequest<CustomerDomainListResponse>("/api/domain-commerce/domains", {
    headers: withCustomerHeaders(session),
  });
}

export function saveDomainContactProfile(session: CustomerSession, payload: DomainContactProfilePayload) {
  return apiRequest<DomainContactProfile>("/api/domain-commerce/contact-profile", {
    method: "PUT",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      FirstName: payload.firstName,
      LastName: payload.lastName,
      CompanyName: payload.companyName,
      Address1: payload.address1,
      Address2: payload.address2,
      City: payload.city,
      State: payload.state,
      Zip: payload.zip,
      Country: payload.country,
      Email: payload.email,
      Phone: payload.phone,
    }),
  });
}

export function createDomainRegisterCheckout(
  session: CustomerSession,
  payload: { domainName: string; years: number; purchasePrice?: number | null; purchaseType?: string | null; privacyEnabled?: boolean },
) {
  return apiRequest<DomainCheckoutResponse>("/api/domain-commerce/checkout/register", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      DomainName: payload.domainName,
      Years: payload.years,
      PurchasePrice: payload.purchasePrice,
      PurchaseType: payload.purchaseType,
      PrivacyEnabled: payload.privacyEnabled ?? true,
    }),
  });
}

export function createDomainRenewCheckout(
  session: CustomerSession,
  domainId: string,
  payload: { years: number; purchasePrice?: number | null },
) {
  return apiRequest<DomainCheckoutResponse>(`/api/domain-commerce/domains/${domainId}/checkout/renew`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Years: payload.years,
      PurchasePrice: payload.purchasePrice,
    }),
  });
}

export function createDomainTransferCheckout(
  session: CustomerSession,
  payload: { domainName: string; authCode: string; privacyEnabled?: boolean },
) {
  return apiRequest<DomainCheckoutResponse>("/api/domain-commerce/checkout/transfer", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      DomainName: payload.domainName,
      AuthCode: payload.authCode,
      PrivacyEnabled: payload.privacyEnabled ?? true,
    }),
  });
}

export function setupDomainAutoRenew(session: CustomerSession, domainId: string) {
  return apiRequest<DomainAutoRenewSetupResponse>(`/api/domain-commerce/domains/${domainId}/auto-renew/setup`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function updateCustomerDomainSettings(
  session: CustomerSession,
  domainId: string,
  payload: { privacyEnabled?: boolean; locked?: boolean },
) {
  return apiRequest<DomainOperationResponse>(`/api/domain-commerce/domains/${domainId}/settings`, {
    method: "PATCH",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      PrivacyEnabled: payload.privacyEnabled,
      Locked: payload.locked,
    }),
  });
}

export function getDomainZones(session: CustomerSession) {
  return apiRequest<DomainZone[]>("/api/domains", {
    headers: withCustomerHeaders(session),
  });
}

export function createDomainZone(
  session: CustomerSession,
  payload: { rootDomain: string; dnsMode: string },
) {
  return apiRequest<{ success: boolean; message: string; zone?: DomainZone }>("/api/domains", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      RootDomain: payload.rootDomain,
      DnsMode: payload.dnsMode,
    }),
  });
}

export function deleteDomainZone(session: CustomerSession, zoneId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/domains/${zoneId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function getDomainZone(session: CustomerSession, zoneId: string) {
  return apiRequest<DomainZone>(`/api/domains/${zoneId}`, {
    headers: withCustomerHeaders(session),
  });
}

export function getDomainRecords(session: CustomerSession, zoneId: string) {
  return apiRequest<DomainRecord[]>(`/api/domains/${zoneId}/records`, {
    headers: withCustomerHeaders(session),
  });
}

export function createDomainRecord(
  session: CustomerSession,
  zoneId: string,
  payload: { name: string; type: string; content: string; ttl?: number; proxied?: boolean },
) {
  return apiRequest<{ success: boolean; message: string; record?: DomainRecord }>(`/api/domains/${zoneId}/records`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Name: payload.name,
      Type: payload.type,
      Content: payload.content,
      Ttl: payload.ttl,
      Proxied: payload.proxied ?? false,
    }),
  });
}

export function updateDomainRecord(
  session: CustomerSession,
  zoneId: string,
  recordId: string,
  payload: { name: string; type: string; content: string; ttl?: number; proxied?: boolean },
) {
  return apiRequest<{ success: boolean; message: string; record?: DomainRecord }>(`/api/domains/${zoneId}/records/${recordId}`, {
    method: "PUT",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Name: payload.name,
      Type: payload.type,
      Content: payload.content,
      Ttl: payload.ttl,
      Proxied: payload.proxied ?? false,
    }),
  });
}

export function deleteDomainRecord(session: CustomerSession, zoneId: string, recordId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/domains/${zoneId}/records/${recordId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function getSiteHostnameBindings(session: CustomerSession, siteId: string) {
  return apiRequest<SiteHostnameBinding[]>(`/api/sites/${siteId}/hostnames`, {
    headers: withCustomerHeaders(session),
  });
}

export async function getConnectedDomainsSnapshot(session: CustomerSession): Promise<ConnectedDomainsSnapshot> {
  const [sites, zones] = await Promise.all([
    getCustomerSites(session),
    getDomainZones(session),
  ]);

  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const domainGroups = await Promise.all(
    sites.map(async (site) => {
      const bindings = await getSiteHostnameBindings(session, site.id);
      const subscriptionId = buildSubscriptionId(site.hostingPlanSlug, site.regionSlug);

      return bindings.map((binding) => ({
        id: binding.id,
        site,
        binding,
        zone: binding.domainZoneId ? zoneMap.get(binding.domainZoneId) ?? null : null,
        subscriptionId,
      }));
    }),
  );

  return {
    domains: domainGroups.flat(),
    zones,
  };
}

export function createSiteHostnameBinding(
  session: CustomerSession,
  siteId: string,
  payload: { hostname: string; makePrimaryOnSuccess?: boolean },
) {
  return apiRequest<{ success: boolean; message: string; binding?: SiteHostnameBinding }>(`/api/sites/${siteId}/hostnames`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Hostname: payload.hostname,
      MakePrimaryOnSuccess: payload.makePrimaryOnSuccess ?? false,
    }),
  });
}

export function makePrimarySiteHostnameBinding(session: CustomerSession, siteId: string, bindingId: string) {
  return apiRequest<{ success: boolean; message: string; binding?: SiteHostnameBinding }>(`/api/sites/${siteId}/hostnames/${bindingId}/make-primary`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function toggleSiteHostnameBinding(
  session: CustomerSession,
  siteId: string,
  bindingId: string,
  enabled: boolean,
) {
  return apiRequest<{ success: boolean; message: string; binding?: SiteHostnameBinding }>(`/api/sites/${siteId}/hostnames/${bindingId}/toggle-enabled`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Enabled: enabled,
    }),
  });
}

export function deleteSiteHostnameBinding(session: CustomerSession, siteId: string, bindingId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/sites/${siteId}/hostnames/${bindingId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function getBillingOverview(session: CustomerSession) {
  return apiRequest<BillingOverview>("/api/billing/overview", {
    headers: withCustomerHeaders(session),
  });
}

export function getBillingSummary(session: CustomerSession) {
  return apiRequest<BillingSummary>("/api/billing/summary", {
    headers: withCustomerHeaders(session),
  });
}

export function getBillingInvoices(session: CustomerSession) {
  return apiRequest<BillingInvoiceView[]>("/api/billing/invoices", {
    headers: withCustomerHeaders(session),
  });
}

export function getBillingTransactions(session: CustomerSession) {
  return apiRequest<BillingTransactionView[]>("/api/billing/transactions", {
    headers: withCustomerHeaders(session),
  });
}

export function getBillingPaymentMethods(session: CustomerSession) {
  return apiRequest<BillingPaymentMethodView[]>("/api/billing/payment-methods", {
    headers: withCustomerHeaders(session),
  });
}

export function getBillingSubscriptions(session: CustomerSession) {
  return apiRequest<BillingSubscriptionView[]>("/api/billing/subscriptions", {
    headers: withCustomerHeaders(session),
  });
}

export function validateHostingCoupon(
  session: CustomerSession,
  payload: { code: string; subtotal: number },
) {
  const query = new URLSearchParams({
    code: payload.code,
    family: "hosting_plan_monthly",
    subtotal: String(payload.subtotal),
  });
  return apiRequest<CouponValidationResult>(`/api/billing/coupons/validate?${query.toString()}`, {
    headers: withCustomerHeaders(session),
  });
}

export function createBillingPaymentMethodSetup(session: CustomerSession) {
  return apiRequest<{ success: boolean; message: string; checkoutUrl: string | null }>("/api/billing/payment-methods/setup", {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function deleteBillingPaymentMethod(session: CustomerSession, paymentMethodId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/billing/payment-methods/${paymentMethodId}`, {
    method: "DELETE",
    headers: withCustomerHeaders(session),
  });
}

export function createHostingSubscriptionCheckout(
  session: CustomerSession,
  payload: { planSlug?: string; regionSlug?: string; couponCode?: string; existingSubscriptionId?: string },
) {
  return apiRequest<BillingCheckoutResponse>("/api/billing/hosting-subscriptions/checkout", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      PlanSlug: payload.planSlug,
      RegionSlug: payload.regionSlug,
      CouponCode: payload.couponCode ?? null,
      ExistingSubscriptionId: payload.existingSubscriptionId ?? null,
    }),
  });
}

export function createAccountTopup(session: CustomerSession, payload: { amount: number }) {
  return apiRequest<BillingCheckoutResponse>("/api/billing/account/topup", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({ Amount: payload.amount }),
  });
}

export type UpgradePreview = {
  success: boolean;
  message: string;
  oldPlanName: string;
  newPlanName: string;
  oldMonthlyPrice: number;
  newMonthlyPrice: number;
  remainingDays: number;
  totalDays: number;
  prorationCredit: number;
  prorationCharge: number;
  upgradeTotal: number;
  currency: string;
};

export function getUpgradePreview(
  session: CustomerSession,
  payload: { currentScope: string; newPlanSlug: string },
) {
  const query = new URLSearchParams({
    currentScope: payload.currentScope,
    newPlanSlug: payload.newPlanSlug,
  });
  return apiRequest<UpgradePreview>(`/api/billing/hosting-subscriptions/upgrade-preview?${query.toString()}`, {
    headers: withCustomerHeaders(session),
  });
}

export function createUpgradeCheckout(
  session: CustomerSession,
  payload: { currentScopeReference: string; newPlanSlug: string; couponCode?: string },
) {
  return apiRequest<BillingCheckoutResponse>("/api/billing/hosting-subscriptions/upgrade", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      CurrentScopeReference: payload.currentScopeReference,
      NewPlanSlug: payload.newPlanSlug,
      CouponCode: payload.couponCode ?? null,
    }),
  });
}

export function checkoutBillingInvoice(session: CustomerSession, invoiceId: string) {
  return apiRequest<BillingCheckoutResponse>(`/api/billing/invoices/${invoiceId}/checkout`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function cancelBillingSubscription(session: CustomerSession, subscriptionId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/billing/hosting-subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

// --- Addon API ---

export type AddonPriceTier = {
  priceId: string;
  productCode: string;
  label: string;
  description: string;
  amount: number;
  currency: string;
  addonType: string;
  overrideField: string;
  incrementValue: number;
  incrementUnit: string;
};

export type CustomerResourceSummary = {
  siteQuota: number;
  usedSites: number;
  databaseQuota: number;
  usedDatabases: number;
  diskQuotaMb: number;
  usedDiskMb: number;
  fileQuotaCount: number;
  databaseSpaceLimitMb: number;
  usedDatabaseSpaceMb: number;
};

export type SubscriptionChoice = {
  id: string;
  displayName: string;
  planName: string;
  planSlug: string;
  regionSlug: string;
};

export type AddonCatalogResponse = {
  addons: AddonPriceTier[];
  resources: CustomerResourceSummary;
  subscriptions: SubscriptionChoice[];
};

export function getAddonCatalog(session: CustomerSession) {
  return apiRequest<AddonCatalogResponse>("/api/addons/catalog", {
    headers: withCustomerHeaders(session),
  });
}

export function createAddonCheckout(session: CustomerSession, payload: { priceId: string; subscriptionId?: string }) {
  return apiRequest<BillingCheckoutResponse>("/api/addons/checkout", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({ PriceId: payload.priceId, SubscriptionId: payload.subscriptionId ?? null }),
  });
}
