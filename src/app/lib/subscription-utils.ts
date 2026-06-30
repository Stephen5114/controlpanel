import type { SubscriptionSummary } from "./customer-api";

export type HostingSubscription = SubscriptionSummary;

export function buildSubscriptionId(planSlug: string, regionSlug: string) {
  return `${planSlug}_${regionSlug}`;
}
