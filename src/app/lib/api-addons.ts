import { apiRequest, withCustomerHeaders } from "./api-core";
import type { CustomerSession } from "./api-core";
import type {
  AddonPriceTier,
  CustomerResourceSummary,
  SubscriptionChoice,
  AddonCatalogResponse,
  BillingCheckoutResponse,
} from "./api-types";

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
