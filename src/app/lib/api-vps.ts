import { apiRequest, withCustomerHeaders } from "./api-core";
import type { CustomerSession } from "./customer-api";

export type VpsPlan = {
  id: string; slug: string; name: string; description: string; platform: "windows" | "linux"; cpuCores: number; ramMb: number;
  storageGb: number; storageType: string; bandwidth: string; region: string;
  operatingSystems: string[]; currency: string; monthlyPrice: number;
};

export type VpsService = {
  id: string; planId: string; hostingLoginId: string; productName: string; platform: "windows" | "linux"; description: string;
  region: string; status: string; ipAddress?: string | null; operatingSystem?: string | null;
  connectionPort?: number | null; username?: string | null; expiresUtc?: string | null;
  autoBackupEnabled: boolean; credentialsSent: boolean; createdUtc: string;
};

export type VpsCheckoutResponse = {
  success: boolean; message: string; orderId?: string | null; checkoutUrl?: string | null;
  subscriptionScopeReference?: string | null;
};

export function getVpsCatalog(session: CustomerSession) {
  return apiRequest<VpsPlan[]>("/api/vps/catalog", { headers: withCustomerHeaders(session) });
}

export function getVpsServices(session: CustomerSession) {
  return apiRequest<VpsService[]>("/api/vps", { headers: withCustomerHeaders(session) });
}

export function getVpsService(session: CustomerSession, serviceId: string) {
  return apiRequest<VpsService>(`/api/vps/${serviceId}`, { headers: withCustomerHeaders(session) });
}

export function createVpsCheckout(session: CustomerSession, planId: string, region: string, operatingSystem: string) {
  return apiRequest<VpsCheckoutResponse>("/api/vps/checkout", {
    method: "POST", headers: withCustomerHeaders(session),
    body: JSON.stringify({ planId, region, operatingSystem, couponCode: null }),
  });
}

export function createVpsRenewalCheckout(session: CustomerSession, serviceId: string) {
  return apiRequest<VpsCheckoutResponse>(`/api/vps/${serviceId}/renewal-checkout`, {
    method: "POST", headers: withCustomerHeaders(session), body: JSON.stringify({ couponCode: null }),
  });
}

export function createVpsUpgradeCheckout(session: CustomerSession, serviceId: string, planId: string) {
  return apiRequest<VpsCheckoutResponse>(`/api/vps/${serviceId}/upgrade-checkout`, {
    method: "POST", headers: withCustomerHeaders(session), body: JSON.stringify({ planId, couponCode: null }),
  });
}
