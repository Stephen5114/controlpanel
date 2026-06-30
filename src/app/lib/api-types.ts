// ── Types & re-export facade ────────────────────────────────────────────────
// All types remain here. Domain modules import types from this file.
// Functions are implemented in domain modules and re-exported here.


// ── Types ────────────────────────────────────────────────────────────────────

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

export type HostingSubscription = SubscriptionSummary;

export type ResetPasswordPayload =
  | { token: string; password: string }
  | { email: string; code: string; password: string };

// ── Re-exported functions from domain modules ───────────────────────────────

