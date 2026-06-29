export function formatRegionLabel(regionSlug: string | null | undefined) {
  if (!regionSlug) {
    return "Unassigned";
  }

  const normalized = regionSlug.trim().toLowerCase();
  if (normalized === "silicon-valley") {
    return "Silicon Valley";
  }

  if (normalized === "global") {
    return "Global";
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value);
}

