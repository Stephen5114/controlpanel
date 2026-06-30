// Re-export types from api-types.ts and functions from domain modules.

export type { CustomerSession,HostingPlanDefinition,RegionDefinition,HostingCatalogResponse,PublishCredentials,HostedSiteHostnameSummary,HostedSite,VerificationInstruction,DomainRecord,SiteHostnameBinding,DomainZone,ConnectedDomain,ConnectedDomainsSnapshot,RegistrarDomain,RegistrarDomainListResponse,RegistrarDomainListQuery,DomainSearchResult,DomainSearchResponse,CustomerDomain,DomainContactProfile,DomainContactProfilePayload,CustomerDomainListResponse,DomainCheckoutResponse,DomainOperationResponse,DomainAutoRenewSetupResponse,HostedDatabase,CustomerAlert,BillingSummary,BillingSubscriptionView,BillingInvoiceLineView,BillingInvoiceView,BillingTransactionView,BillingPaymentMethodView,BillingLedgerEntryView,BillingCouponView,CouponValidationResult,BillingOverview,BillingCheckoutResponse,ServerNode,SubscriptionSummary,SubscriptionWebsite,StackVersionOption,StackCatalogEntry,StackCatalogResponse,UpdateSiteStackResult,PublishSiteResult,SubscriptionNodeHealth,SubscriptionFilesSite,SubscriptionFilesResponse,SiteFileBreadcrumb,SiteFileEntry,SiteFileBrowserResponse,SiteFileOperationResponse,SiteFileContentResponse,SiteFileContentSaveResponse,SubscriptionAlert,SubscriptionSecuritySite,SubscriptionSecurityResponse,SubscriptionOverviewResponse,RegisterCustomerResponse,LoginResponse,ResendVerificationResponse,ForgotPasswordResponse,ResetPasswordResponse,SupportAttachment,SupportMessage,SupportTicket,SupportOperationResponse,SupportChatMessage,SupportChatSession,VerifyEmailResponse,CustomerProfile,AddonPriceTier,CustomerResourceSummary,SubscriptionChoice,AddonCatalogResponse,GitConfig,DeployLog,UpgradePreview,HostingSubscription,ResetPasswordPayload } from "./api-types";

export {
  getActiveApiBaseUrl,
  withCustomerHeaders,
} from "./api-core";

export {
  registerCustomer,
  loginCustomer,
  resendVerificationEmail,
  verifyEmailToken,
  verifyEmailWithCode,
  requestPasswordReset,
  resetPassword,
} from "./api-auth";

export {
  getHostingCatalog,
  getAssignedServer,
  getCustomerProfile,
  getCustomerAlerts,
  saveCustomerPreferences,
  changePassword,
  getCustomerSites,
  getStackCatalog,
  createHostedSite,
  deleteHostedSite,
  changeSiteFtpPassword,
  updateSiteStack,
  downloadPublishProfile,
  publishSite,
  saveGitConfig,
  getGitConfig,
  triggerGitDeploy,
  getDeployLog,
  getSiteFileBrowser,
  createSiteFolder,
  createSiteEmptyFile,
  getSiteFileContent,
  saveSiteFileContent,
  deleteSiteFile,
  renameSiteEntry,
  uploadSiteFiles,
  downloadSiteFile,
} from "./api-sites";

export {
  listRegistrarDomains,
  searchDomains,
  getCustomerDomains,
  saveDomainContactProfile,
  createDomainRegisterCheckout,
  createDomainRenewCheckout,
  createDomainTransferCheckout,
  setupDomainAutoRenew,
  updateCustomerDomainSettings,
  getDomainZones,
  createDomainZone,
  deleteDomainZone,
  getDomainZone,
  getDomainRecords,
  createDomainRecord,
  updateDomainRecord,
  deleteDomainRecord,
  getSiteHostnameBindings,
  createSiteHostnameBinding,
  makePrimarySiteHostnameBinding,
  toggleSiteHostnameBinding,
  deleteSiteHostnameBinding,
  getConnectedDomainsSnapshot,
} from "./api-domains";

export {
  getBillingOverview,
  getBillingSummary,
  getBillingInvoices,
  getBillingTransactions,
  getBillingPaymentMethods,
  getBillingSubscriptions,
  validateHostingCoupon,
  createBillingPaymentMethodSetup,
  deleteBillingPaymentMethod,
  createHostingSubscriptionCheckout,
  createAccountTopup,
  getUpgradePreview,
  createUpgradeCheckout,
  checkoutBillingInvoice,
  cancelBillingSubscription,
} from "./api-billing";

export {
  getSupportTickets,
  getSupportTicket,
  createSupportTicket,
  replySupportTicket,
  closeSupportTicket,
  uploadSupportAttachment,
  getSupportAttachment,
  startSupportChat,
  closeSupportChat,
} from "./api-support";

export {
  getAddonCatalog,
  createAddonCheckout,
} from "./api-addons";

export {
  getCustomerSubscriptions,
  getSubscriptionSites,
  getSubscriptionWebsites,
  getSubscriptionOverview,
  getSubscriptionFiles,
  getSubscriptionSecurity,
  createSubscriptionSite,
  getHostedDatabases,
  createHostedDatabase,
  deleteHostedDatabase,
  rotateHostedDatabasePassword,
} from "./api-subscriptions";

export {
  buildSubscriptionId,
  type HostingSubscription as HostingSubscriptionAlias,
} from "./subscription-utils";
