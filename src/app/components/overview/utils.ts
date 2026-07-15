import { AlertTriangle, Wrench } from "lucide-react";
import type { HostedDatabase, SubscriptionWebsite, StackCatalogEntry } from "../../lib/customer-api";
import { getActiveLocale } from "../../lib/i18n";

export type DisplayWebsite = SubscriptionWebsite & {
  isOptimistic?: boolean;
};

export type DisplayDatabase = HostedDatabase & {
  isOptimistic?: boolean;
};

export function isInFlightStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "pending" || normalized === "creating" || normalized === "deleting";
}

export function isHealthyStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "active" || normalized === "succeeded" || normalized === "online";
}

export function getStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "creating") return "Creating...";
  if (normalized === "pending") return "Pending...";
  if (normalized === "deleting") return "Deleting...";
  if (normalized === "succeeded" || normalized === "active") return "Active";
  if (normalized === "online") return "Online";
  if (normalized === "offline") return "Offline";
  return status;
}

export function getAlertIcon(severity: string) {
  return severity.toLowerCase() === "critical" ? AlertTriangle : Wrench;
}

export function formatBytes(value: number, unit: "gb" | "tb") {
  const divisor = unit === "gb" ? 1024 ** 3 : 1024 ** 4;
  return (value / divisor).toFixed(1);
}

export function formatMemory(value: number) {
  return `${(value / (1024 ** 3)).toFixed(1)} GB`;
}

export function getStackLabel(site: SubscriptionWebsite, catalog: StackCatalogEntry[]): string {
  if (!site.stack || site.stack === "static") {
    return "Unconfigured";
  }
  const entry = catalog.find((c) => c.slug === site.stack);
  const baseName = entry?.name ?? site.stack;
  return site.stackVersion ? `${baseName} ${site.stackVersion}` : baseName;
}

export function isSiteStackConfigured(site: SubscriptionWebsite): boolean {
  return !!site.stack && site.stack !== "static";
}

export function getAvailableStacks(catalog: StackCatalogEntry[]): StackCatalogEntry[] {
  return catalog.filter((entry) => entry.status === "available" && entry.slug !== "static");
}

export function guessEntryDll(site: SubscriptionWebsite): string {
  const message = site.runtimeMessage ?? "";
  const match = message.match(/([A-Za-z0-9_.\-]+\.dll)/);
  if (match?.[1]) return match[1];
  const base = (site.siteName || site.domain.split(".")[0] || "app").replace(/[^A-Za-z0-9_.-]/g, "");
  return `${base || "app"}.dll`;
}

export function canPublishSite(site: SubscriptionWebsite, availableStacks: StackCatalogEntry[]): boolean {
  if (site.hasActivePublishJob || site.hasActiveRuntimeJob) return false;
  const status = site.provisioningStatus?.toLowerCase();
  if (status === "pending" || status === "creating" || status === "deleting" || status === "failed") return false;
  const publishableStacks = ["dotnet", "netcore", "node", "static", "python", "php", "springboot"];
  if (isSiteStackConfigured(site)) return publishableStacks.includes(site.stack);
  return availableStacks.some((s) => publishableStacks.includes(s.slug));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString(getActiveLocale());
  } catch {
    return value;
  }
}
