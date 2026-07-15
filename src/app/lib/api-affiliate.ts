import { apiRequest, withCustomerHeaders } from "./api-core";
import type { CustomerSession } from "./api-core";

// ── Types ───────────────────────────────────────────────────────────────────

export type AffiliateOverview = {
  code: string;
  status: string;
  currency: string;
  pendingBalance: number;
  availableBalance: number;
  paidOutTotal: number;
  reversedTotal: number;
  clickCount: number;
  signupCount: number;
  conversionCount: number;
  commissionPercentFirstYear: number;
  commissionPercentAfter: number;
  newCustomerDiscountPercent: number;
  minPayoutAmount: number;
  commissionHoldDays: number;
  programEnabled: boolean;
};

export type AffiliateCommissionRow = {
  id: string;
  currency: string;
  baseAmount: number;
  ratePercent: number;
  amount: number;
  status: string;
  createdUtc: string;
  holdUntilUtc: string;
  availableUtc: string | null;
  reversedUtc: string | null;
  reversalReason: string | null;
  description: string | null;
};

export type AffiliateReferralRow = {
  id: string;
  maskedEmail: string;
  status: string;
  attributedUtc: string;
  firstPaymentUtc: string | null;
};

export type AffiliatePayoutRow = {
  id: string;
  kind: string;
  currency: string;
  amount: number;
  method: string;
  status: string;
  adminNotes: string | null;
  requestedUtc: string;
  approvedUtc: string | null;
  paidUtc: string | null;
  rejectedUtc: string | null;
};

export type AffiliateCheckoutDiscount = {
  eligible: boolean;
  percent: number;
};

// ── API calls ───────────────────────────────────────────────────────────────

export function getAffiliateOverview(session: CustomerSession) {
  return apiRequest<AffiliateOverview>("/api/affiliate/overview", {
    headers: withCustomerHeaders(session),
  });
}

export function getAffiliateCommissions(session: CustomerSession, skip = 0, take = 50) {
  return apiRequest<AffiliateCommissionRow[]>(`/api/affiliate/commissions?skip=${skip}&take=${take}`, {
    headers: withCustomerHeaders(session),
  });
}

export function getAffiliateReferrals(session: CustomerSession) {
  return apiRequest<AffiliateReferralRow[]>("/api/affiliate/referrals", {
    headers: withCustomerHeaders(session),
  });
}

export function getAffiliatePayouts(session: CustomerSession) {
  return apiRequest<AffiliatePayoutRow[]>("/api/affiliate/payouts", {
    headers: withCustomerHeaders(session),
  });
}

export function createAffiliatePayout(
  session: CustomerSession,
  payload: { kind: "cash" | "account_credit"; amount: number; method?: string; accountDetails?: string },
) {
  return apiRequest<{ success: boolean; message: string }>("/api/affiliate/payouts", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Kind: payload.kind,
      Amount: payload.amount,
      Method: payload.method ?? null,
      AccountDetails: payload.accountDetails ?? null,
    }),
  });
}

export function getAffiliateCheckoutDiscount(session: CustomerSession) {
  return apiRequest<AffiliateCheckoutDiscount>("/api/affiliate/checkout-discount", {
    headers: withCustomerHeaders(session),
  });
}
