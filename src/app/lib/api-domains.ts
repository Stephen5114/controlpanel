import { apiRequest, withCustomerHeaders } from "./api-core";
import type {
  DomainRecord,
  SiteHostnameBinding,
  DomainZone,
  ConnectedDomain,
  ConnectedDomainsSnapshot,
  RegistrarDomain,
  RegistrarDomainListResponse,
  RegistrarDomainListQuery,
  DomainSearchResult,
  DomainSearchResponse,
  CustomerDomain,
  DomainContactProfile,
  DomainContactProfilePayload,
  CustomerDomainListResponse,
  DomainCheckoutResponse,
  DomainOperationResponse,
  DomainAutoRenewSetupResponse,
  HostedSite,
} from "./api-types";
import type { CustomerSession } from "./api-core";
import { getCustomerSites } from "./api-sites";
import { buildSubscriptionId } from "./subscription-utils";

// ── Registrar domains ───────────────────────────────────────────────────────

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

// ── Domain zones ────────────────────────────────────────────────────────────

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

// ── Hostname bindings ───────────────────────────────────────────────────────

export function getSiteHostnameBindings(session: CustomerSession, siteId: string) {
  return apiRequest<SiteHostnameBinding[]>(`/api/sites/${siteId}/hostnames`, {
    headers: withCustomerHeaders(session),
  });
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

// ── Connected domains snapshot ──────────────────────────────────────────────

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
