import { apiRequest, withCustomerHeaders } from "./api-core";
import type { CustomerSession } from "./api-core";
import type {
  BillingSummary,
  BillingSubscriptionView,
  BillingInvoiceView,
  BillingTransactionView,
  BillingPaymentMethodView,
  BillingLedgerEntryView,
  BillingCouponView,
  CouponValidationResult,
  BillingOverview,
  BillingCheckoutResponse,
  UpgradePreview,
} from "./customer-api";

// ── Billing overview ────────────────────────────────────────────────────────

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

// ── Coupons ─────────────────────────────────────────────────────────────────

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

// ── Payment methods ─────────────────────────────────────────────────────────

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

// ── Subscription billing ────────────────────────────────────────────────────

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
