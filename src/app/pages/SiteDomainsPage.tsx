import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { driver, type DriveStep } from "driver.js";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  Globe,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  createSiteHostnameBinding,
  deleteSiteHostnameBinding,
  getSiteHostnameBindings,
  makePrimarySiteHostnameBinding,
  toggleSiteHostnameBinding,
  type SiteHostnameBinding,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import type { SiteLayoutContext } from "../layout/SiteLayout";
import { getActiveLocale, useLocalization } from "../lib/i18n";

const GUIDE_STORAGE_VERSION = "domain-bind-guide:v2";

function isSettingUpStatus(status: string) {
  const normalized = status.toLowerCase();
  return normalized === "pending_sync" || normalized === "pending";
}

function isHealthyStatus(status: string) {
  return status.toLowerCase() === "active";
}

function isFailedStatus(status: string) {
  return status.toLowerCase() === "failed";
}

function formatBindingStatus(status: string, t?: (key: string, def: string) => string) {
  const normalized = status.toLowerCase();
  if (normalized === "pending_sync" || normalized === "pending") return t ? t("Syncing", "Syncing") : "Syncing";
  if (normalized === "active") return t ? t("Live", "Live") : "Live";
  if (normalized === "failed") return t ? t("Needs attention", "Needs attention") : "Needs attention";
  if (normalized === "disabled") return t ? t("Paused", "Paused") : "Paused";
  return status;
}

function formatSyncTime(value: Date | null, t?: (key: string, def: string) => string) {
  if (!value) {
    return t ? t("Awaiting first sync", "Awaiting first sync") : "Awaiting first sync";
  }

  const time = value.toLocaleTimeString(getActiveLocale(), { hour: "2-digit", minute: "2-digit" });
  return t ? t("Synced {time}", "Synced {time}").replace("{time}", time) : `Synced ${time}`;
}

function getDeleteConfirmationMessage(binding: SiteHostnameBinding, bindings: SiteHostnameBinding[], t?: (key: string, def: string) => string) {
  if (!binding.isPrimary) {
    return t 
      ? t("Remove domain {domain}?\n\nThis will disconnect it from this site.", "Remove domain {domain}?\n\nThis will disconnect it from this site.").replace("{domain}", binding.hostname)
      : `Remove domain ${binding.hostname}?\n\nThis will disconnect it from this site.`;
  }

  const fallback = bindings
    .filter((item) => item.id !== binding.id && item.isEnabled)
    .sort((left, right) => {
      if (left.isSystemBinding !== right.isSystemBinding) {
        return left.isSystemBinding ? -1 : 1;
      }

      const leftIsActive = isHealthyStatus(left.bindingStatus);
      const rightIsActive = isHealthyStatus(right.bindingStatus);
      if (leftIsActive !== rightIsActive) {
        return leftIsActive ? -1 : 1;
      }

      return left.hostname.localeCompare(right.hostname);
    })[0];

  if (fallback?.isSystemBinding) {
    return t
      ? t("Remove primary domain {hostname}?\n\nThis will disconnect it from this site and automatically switch the primary address back to the platform address ({fallback}).", "Remove primary domain {hostname}?\n\nThis will disconnect it from this site and automatically switch the primary address back to the platform address ({fallback}).")
          .replace("{hostname}", binding.hostname)
          .replace("{fallback}", fallback.hostname)
      : `Remove primary domain ${binding.hostname}?\n\nThis will disconnect it from this site and automatically switch the primary address back to the platform address (${fallback.hostname}).`;
  }

  if (fallback) {
    return t
      ? t("Remove primary domain {hostname}?\n\nThis will disconnect it from this site and automatically switch the primary address to {fallback}.", "Remove primary domain {hostname}?\n\nThis will disconnect it from this site and automatically switch the primary address to {fallback}.")
          .replace("{hostname}", binding.hostname)
          .replace("{fallback}", fallback.hostname)
      : `Remove primary domain ${binding.hostname}?\n\nThis will disconnect it from this site and automatically switch the primary address to ${fallback.hostname}.`;
  }

  return t
    ? t("Remove primary domain {domain}?\n\nThis will disconnect it from this site.", "Remove primary domain {domain}?\n\nThis will disconnect it from this site.").replace("{domain}", binding.hostname)
    : `Remove primary domain ${binding.hostname}?\n\nThis will disconnect it from this site.`;
}

function getBindingTone(binding: SiteHostnameBinding) {
  if (!binding.isEnabled) return "muted";
  if (isFailedStatus(binding.bindingStatus)) return "critical";
  if (isSettingUpStatus(binding.bindingStatus)) return "pending";
  return "live";
}

function getBindingPreview(binding: SiteHostnameBinding, t?: (key: string, def: string) => string) {
  if (binding.lastError) {
    return t ? t("The bind is blocked. Open this domain to fix DNS first.", "The bind is blocked. Open this domain to fix DNS first.") : "The bind is blocked. Open this domain to fix DNS first.";
  }

  if (!binding.isEnabled) {
    return t ? t("This hostname is currently paused on the platform.", "This hostname is currently paused on the platform.") : "This hostname is currently paused on the platform.";
  }

  if (binding.dnsInstructions.length > 0) {
    return t 
      ? t("{count} DNS record{plural} still need to be published.", "{count} DNS record{plural} still need to be published.")
          .replace("{count}", String(binding.dnsInstructions.length))
          .replace("{plural}", binding.dnsInstructions.length === 1 ? "" : "s")
      : `${binding.dnsInstructions.length} DNS record${binding.dnsInstructions.length === 1 ? "" : "s"} still need to be published.`;
  }

  if (isSettingUpStatus(binding.bindingStatus)) {
    return t ? t("Waiting for provider propagation and platform sync.", "Waiting for provider propagation and platform sync.") : "Waiting for provider propagation and platform sync.";
  }

  if (binding.isPrimary) {
    return t ? t("Primary hostname and ready for customer traffic.", "Primary hostname and ready for customer traffic.") : "Primary hostname and ready for customer traffic.";
  }

  return t ? t("Healthy and available as an additional hostname.", "Healthy and available as an additional hostname.") : "Healthy and available as an additional hostname.";
}

function getTaskTitle(binding: SiteHostnameBinding | null, t?: (key: string, def: string) => string) {
  if (!binding) return t ? t("Bind your first domain", "Bind your first domain") : "Bind your first domain";
  if (binding.lastError) return t ? t("Fix the failing bind", "Fix the failing bind") : "Fix the failing bind";
  if (binding.dnsInstructions.length > 0) return t ? t("Publish these DNS records", "Publish these DNS records") : "Publish these DNS records";
  if (!binding.isEnabled) return t ? t("This domain is paused", "This domain is paused") : "This domain is paused";
  if (isSettingUpStatus(binding.bindingStatus)) return t ? t("Waiting for the bind to finish", "Waiting for the bind to finish") : "Waiting for the bind to finish";
  if (binding.isPrimary) return t ? t("Primary domain is live", "Primary domain is live") : "Primary domain is live";
  return t ? t("Domain is connected", "Domain is connected") : "Domain is connected";
}

function getTaskCopy(binding: SiteHostnameBinding | null, fallback: SiteHostnameBinding | null, t?: (key: string, def: string) => string) {
  if (!binding) {
    return t ? t("Add the hostname your visitor will type. The platform fallback stays attached quietly until your branded domain is ready.", "Add the hostname your visitor will type. The platform fallback stays attached quietly until your branded domain is ready.") : "Add the hostname your visitor will type. The platform fallback stays attached quietly until your branded domain is ready.";
  }

  if (binding.lastError) {
    return binding.lastError;
  }

  if (binding.dnsInstructions.length > 0) {
    return t ? t("Copy these records to your DNS provider exactly as shown. The platform will mark the bind live once propagation completes.", "Copy these records to your DNS provider exactly as shown. The platform will mark the bind live once propagation completes.") : "Copy these records to your DNS provider exactly as shown. The platform will mark the bind live once propagation completes.";
  }

  if (!binding.isEnabled) {
    return t ? t("This hostname is attached but not currently serving traffic. Resume it from Advanced whenever you want it back online.", "This hostname is attached but not currently serving traffic. Resume it from Advanced whenever you want it back online.") : "This hostname is attached but not currently serving traffic. Resume it from Advanced whenever you want it back online.";
  }

  if (isSettingUpStatus(binding.bindingStatus)) {
    return t ? t("The provider records look good so far. Give propagation a little more time, and keep the fallback route available.", "The provider records look good so far. Give propagation a little more time, and keep the fallback route available.") : "The provider records look good so far. Give propagation a little more time, and keep the fallback route available.";
  }

  if (binding.isPrimary) {
    return t ? t("This hostname is already carrying the main branded traffic for the site.", "This hostname is already carrying the main branded traffic for the site.") : "This hostname is already carrying the main branded traffic for the site.";
  }

  return fallback
    ? (t ? t("This hostname is healthy. Promote it when you are ready, and keep {hostname} as your rollback route.", "This hostname is healthy. Promote it when you are ready, and keep {hostname} as your rollback route.").replace("{hostname}", fallback.hostname) : `This hostname is healthy. Promote it when you are ready, and keep ${fallback.hostname} as your rollback route.`)
    : (t ? t("This hostname is healthy and available for traffic.", "This hostname is healthy and available for traffic.") : "This hostname is healthy and available for traffic.");
}

function getGuideStorageKey(customerId: string, siteId: string) {
  return `${GUIDE_STORAGE_VERSION}:${customerId}:${siteId}`;
}

export function SiteDomainsPage() {
  const { t } = useLocalization();
  const { siteId } = useParams();
  const { site } = useOutletContext<SiteLayoutContext>();
  const session = getCustomerSession();
  const guideStorageKey = session && siteId ? getGuideStorageKey(session.customerId, siteId) : null;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [bindings, setBindings] = useState<SiteHostnameBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");
  const [makePrimaryOnSuccess, setMakePrimaryOnSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [expandedBindingId, setExpandedBindingId] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedKey) return;
    const timeout = window.setTimeout(() => setCopiedKey(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedKey]);

  async function handleCopyValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setCopiedKey(null);
    }
  }

  const orderedBindings = useMemo(
    () =>
      [...bindings].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        if (left.isSystemBinding !== right.isSystemBinding) {
          return left.isSystemBinding ? 1 : -1;
        }

        return left.hostname.localeCompare(right.hostname);
      }),
    [bindings],
  );

  const customerBindings = useMemo(
    () => orderedBindings.filter((binding) => !binding.isSystemBinding),
    [orderedBindings],
  );

  const systemBinding = useMemo(
    () => orderedBindings.find((binding) => binding.isSystemBinding) ?? null,
    [orderedBindings],
  );

  const primaryBinding = useMemo(
    () => customerBindings.find((binding) => binding.isPrimary) ?? null,
    [customerBindings],
  );

  const taskBindingId = useMemo(
    () =>
      customerBindings.find((binding) => isFailedStatus(binding.bindingStatus))?.id
      ?? customerBindings.find((binding) => isSettingUpStatus(binding.bindingStatus))?.id
      ?? primaryBinding?.id
      ?? customerBindings[0]?.id
      ?? null,
    [customerBindings, primaryBinding],
  );

  const taskBinding = useMemo(
    () => customerBindings.find((binding) => binding.id === taskBindingId) ?? null,
    [customerBindings, taskBindingId],
  );

  const advancedBinding = useMemo(
    () =>
      customerBindings.find((binding) => binding.id === expandedBindingId)
      ?? taskBinding
      ?? primaryBinding
      ?? customerBindings[0]
      ?? null,
    [customerBindings, expandedBindingId, primaryBinding, taskBinding],
  );

  const hasPendingWork = customerBindings.some((binding) => isSettingUpStatus(binding.bindingStatus));

  // Driver.js guided tour — auto-start on first visit
  const startGuideTour = useCallback(() => {
    const steps: DriveStep[] = [
      {
        element: ".domain-bind-form__field",
        popover: {
          title: t("Enter the hostname", "Enter the hostname"),
          description: t("Type the exact domain or subdomain your visitors will use, like example.com or www.example.com.", "Type the exact domain or subdomain your visitors will use, like example.com or www.example.com."),
        },
      },
      {
        element: ".domain-bind-form__submit",
        popover: {
          title: t("Bind the domain", "Bind the domain"),
          description: t("Click here after entering your hostname. The platform will create the binding and generate the DNS records you need.", "Click here after entering your hostname. The platform will create the binding and generate the DNS records you need."),
        },
      },
      {
        element: ".domain-bind-quickref",
        popover: {
          title: t("DNS quick reference", "DNS quick reference"),
          description: t("Copy the CNAME or A record value shown here and add it at your DNS provider. CNAME for subdomains, A record for apex domains.", "Copy the CNAME or A record value shown here and add it at your DNS provider. CNAME for subdomains, A record for apex domains."),
        },
      },
      {
        element: ".domain-bind-task",
        popover: {
          title: t("Monitor binding progress", "Monitor binding progress"),
          description: t("This section shows your current binding task, its DNS instructions, and live status. The page refreshes automatically while the bind finishes.", "This section shows your current binding task, its DNS instructions, and live status. The page refreshes automatically while the bind finishes."),
        },
      },
      {
        element: ".domain-bind-listing",
        popover: {
          title: t("Connected domains", "Connected domains"),
          description: t("All your bound domains appear here. Expand any row to see its DNS records and current status.", "All your bound domains appear here. Expand any row to see its DNS records and current status."),
          onPopoverRender: (popover: { wrapper: HTMLElement }) => {
            const btn = document.createElement("button");
            btn.textContent = t("Don't show again", "Don't show again");
            btn.className = "driver-popover-dismiss-btn";
            btn.addEventListener("click", () => {
              if (guideStorageKey) {
                window.localStorage.setItem(guideStorageKey, "dismissed");
              }
              driverObj.destroy();
            });
            popover.wrapper.querySelector(".driver-popover-footer")?.appendChild(btn);
          },
        },
      },
    ];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.55)",
      steps,
    });

    driverObj.drive();
  }, [guideStorageKey, t]);

  useEffect(() => {
    if (!guideStorageKey || loading) return;
    const isDismissed = window.localStorage.getItem(guideStorageKey) === "dismissed";
    if (isDismissed) return;
    const timeout = window.setTimeout(() => startGuideTour(), 400);
    return () => window.clearTimeout(timeout);
  }, [guideStorageKey, loading, startGuideTour]);

  useEffect(() => {
    if (expandedBindingId && !customerBindings.some((binding) => binding.id === expandedBindingId)) {
      setExpandedBindingId(null);
    }
  }, [customerBindings, expandedBindingId]);

  async function loadData() {
    if (!session || !siteId) return null;

    try {
      setLoading(true);
      setError(null);
      const bindingData = await getSiteHostnameBindings(session, siteId);
      setBindings(bindingData);
      setLastRefreshedAt(new Date());
      return bindingData;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to load site domains.", "Failed to load site domains."));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.customerId, siteId]);

  useEffect(() => {
    if (!hasPendingWork) return;

    const interval = window.setInterval(() => {
      void loadData();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [hasPendingWork, session?.customerId, siteId]);

  async function handleConnectDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !siteId) return;

    const submittedHostname = hostname.trim();
    if (!submittedHostname) return;

    try {
      setError(null);
      const result = await createSiteHostnameBinding(session, siteId, {
        hostname: submittedHostname,
        makePrimaryOnSuccess,
      });

      setHostname("");
      setMakePrimaryOnSuccess(false);

      const refreshedBindings = await loadData();
      const nextBindingId =
        result.binding?.id
        ?? refreshedBindings?.find(
          (binding) => !binding.isSystemBinding && binding.hostname.toLowerCase() === submittedHostname.toLowerCase(),
        )?.id
        ?? null;

      if (nextBindingId) {
        setExpandedBindingId(nextBindingId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to connect domain.", "Failed to connect domain."));
    }
  }

  async function handleMakePrimary(bindingId: string) {
    if (!session || !siteId) return;

    try {
      setError(null);
      await makePrimarySiteHostnameBinding(session, siteId, bindingId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to make the primary domain.", "Failed to make the primary domain."));
    }
  }

  async function handleToggle(binding: SiteHostnameBinding) {
    if (!session || !siteId) return;

    try {
      setError(null);
      await toggleSiteHostnameBinding(session, siteId, binding.id, !binding.isEnabled);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to update the domain state.", "Failed to update the domain state."));
    }
  }

  async function handleDelete(binding: SiteHostnameBinding) {
    if (!session || !siteId) return;
    if (!window.confirm(getDeleteConfirmationMessage(binding, bindings, t))) return;

    try {
      setError(null);
      await deleteSiteHostnameBinding(session, siteId, binding.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to remove the domain.", "Failed to remove the domain."));
    }
  }

  function handleToggleBindingDetails(bindingId: string) {
    setExpandedBindingId((current) => (current === bindingId ? null : bindingId));
  }

  if (loading && bindings.length === 0) {
    return <div className="empty-panel">{t("Loading site domains...", "Loading site domains...")}</div>;
  }

  return (
    <>
      <div className="domain-bind-workspace">
        <section className="domain-bind-flow">
          <div className="domain-bind-flow__head">
            <div className="domain-bind-flow__copy">
              <p className="domain-bind-workspace__eyebrow">{t("Site domains", "Site domains")}</p>
              <h1>{t("Bind domain", "Bind domain")}</h1>
              <p className="domain-bind-flow__lead">
                {t("Connect the hostname your visitors will use for {siteName} and follow the DNS checklist until it goes live.", "Connect the hostname your visitors will use for {siteName} and follow the DNS checklist until it goes live.").replace("{siteName}", site?.siteName ?? "this site")}
              </p>
            </div>

            <div className="domain-bind-flow__tools">
              <button className="domain-bind-flow__guide-link" type="button" onClick={startGuideTour}>
                {t("Open guide", "Open guide")}
              </button>
              <button
                className="domain-bind-button domain-bind-button--secondary"
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
              >
                <RefreshCw size={16} className={isRefreshing ? "icon-spin" : undefined} />
                {isRefreshing ? t("Refreshing", "Refreshing") : t("Refresh", "Refresh")}
              </button>
            </div>
          </div>

          <form className="domain-bind-form" onSubmit={handleConnectDomain}>
            <label className="domain-bind-form__field">
              <span>{t("Hostname", "Hostname")}</span>
              <input
                ref={inputRef}
                value={hostname}
                onChange={(event) => setHostname(event.target.value)}
                placeholder={t("example.com or www.example.com", "example.com or www.example.com")}
              />
            </label>

            <button className="domain-bind-button domain-bind-button--primary domain-bind-form__submit" type="submit" disabled={!hostname.trim()}>
              {t("Bind domain", "Bind domain")}
            </button>
          </form>

          <div className="domain-bind-form__foot">
            <label className="domain-bind-form__checkbox">
              <input
                type="checkbox"
                checked={makePrimaryOnSuccess}
                onChange={(event) => setMakePrimaryOnSuccess(event.target.checked)}
              />
              <span>{t("Make this the primary domain once the bind becomes healthy", "Make this the primary domain once the bind becomes healthy")}</span>
            </label>

            <span className="domain-bind-form__meta">{formatSyncTime(lastRefreshedAt, t)}</span>
          </div>
        </section>

        {error ? (
          <div className="domain-bind-workspace__alert domain-bind-workspace__alert--error">
            <AlertTriangle size={16} />
            {error}
          </div>
        ) : null}

        {hasPendingWork ? (
          <div className="domain-bind-workspace__alert domain-bind-workspace__alert--sync">
            <span className="pending-bar__dot" />
            {t("Domain sync is still running. This page refreshes automatically while the bind finishes.", "Domain sync is still running. This page refreshes automatically while the bind finishes.")}
          </div>
        ) : null}

        <section className="domain-bind-quickref">
          <div className="domain-bind-quickref__head">
            <div>
              <p className="domain-bind-workspace__eyebrow">{t("DNS quick reference", "DNS quick reference")}</p>
              <h2>{t("Point your domain here", "Point your domain here")}</h2>
            </div>
            <p className="domain-bind-quickref__copy">
              {t("Point your domain description", "If you're adding your own domain, point it at one of these values. You can also start the binding above and we'll show the exact record for the hostname you enter.")}
            </p>
          </div>

          <div className="domain-bind-quickref__grid">
            <article className="domain-bind-record">
              <div className="domain-bind-record__meta">
                <strong>{t("CNAME (recommended)", "CNAME (recommended)")}</strong>
                <span>CNAME</span>
              </div>
              <div className="domain-bind-quickref__value">
                <code>{site?.domain ?? "\u2014"}</code>
                <button
                  type="button"
                  className="domain-bind-quickref__copy-btn"
                  onClick={() => site?.domain && void handleCopyValue(site.domain, "quickref-cname")}
                  disabled={!site?.domain}
                  aria-label="Copy CNAME value"
                >
                  {copiedKey === "quickref-cname" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedKey === "quickref-cname" ? t("Copied", "Copied") : t("Copy", "Copy")}
                </button>
              </div>
              <p>{t("CNAME description", "Use this for subdomains like {domain}. Preferred — it survives server IP changes.").replace("{domain}", "www.example.com")}</p>
            </article>

            <article className="domain-bind-record">
              <div className="domain-bind-record__meta">
                <strong>{t("A record (apex only)", "A record (apex only)")}</strong>
                <span>A</span>
              </div>
              <div className="domain-bind-quickref__value">
                <code>{site?.publicIpAddress ?? t("Not available", "Not available")}</code>
                <button
                  type="button"
                  className="domain-bind-quickref__copy-btn"
                  onClick={() => site?.publicIpAddress && void handleCopyValue(site.publicIpAddress, "quickref-a")}
                  disabled={!site?.publicIpAddress}
                  aria-label="Copy A record value"
                >
                  {copiedKey === "quickref-a" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedKey === "quickref-a" ? t("Copied", "Copied") : t("Copy", "Copy")}
                </button>
              </div>
              <p>{t("A record description", "Use this only when binding the apex, e.g. {domain}. If the server ever moves, you'll need to update this.").replace("{domain}", "example.com")}</p>
            </article>
          </div>
        </section>

        <section className="domain-bind-task">
          <div className="domain-bind-task__head">
            <div>
              <p className="domain-bind-workspace__eyebrow">{t("Current task", "Current task")}</p>
              <h2>{getTaskTitle(taskBinding, t)}</h2>
            </div>
            {taskBinding ? (
              <span className={`domain-bind-chip domain-bind-chip--${getBindingTone(taskBinding)}`}>
                {formatBindingStatus(taskBinding.bindingStatus, t)}
              </span>
            ) : null}
          </div>

          <p className="domain-bind-task__copy">{getTaskCopy(taskBinding, systemBinding, t)}</p>

          {taskBinding ? (
            <div className="domain-bind-task__focus">
              <strong>{taskBinding.hostname}</strong>
              {taskBinding.isPrimary ? (
                <span className="domain-bind-chip domain-bind-chip--primary">
                  <Crown size={12} />
                  {t("Primary", "Primary")}
                </span>
              ) : null}
            </div>
          ) : null}

          {taskBinding?.lastError ? (
            <div className="domain-bind-workspace__alert domain-bind-workspace__alert--error">
              <AlertTriangle size={16} />
              {taskBinding.lastError}
            </div>
          ) : null}

          {taskBinding?.dnsInstructions.length ? (
            <div className="domain-bind-task__records">
              {taskBinding.dnsInstructions.map((instruction) => (
                <div key={`${taskBinding.id}-${instruction.name}-${instruction.type}`} className="domain-bind-record">
                  <div className="domain-bind-record__meta">
                    <strong>{instruction.name}</strong>
                    <span>{instruction.type}</span>
                  </div>
                  <code>{instruction.value}</code>
                  <p>{t(instruction.purpose, instruction.purpose)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="domain-bind-task__quiet">
              {taskBinding ? (
                <>
                  <CheckCircle2 size={18} />
                  {t("No provider-side DNS changes are waiting for this domain right now.", "No provider-side DNS changes are waiting for this domain right now.")}
                </>
              ) : (
                <>
                  <Globe size={18} />
                  {t("No branded domains are connected yet. Start by binding the first hostname above.", "No branded domains are connected yet. Start by binding the first hostname above.")}
                </>
              )}
            </div>
          )}
        </section>

        <section className="domain-bind-listing">
          <div className="domain-bind-listing__head">
            <div>
              <p className="domain-bind-workspace__eyebrow">{t("Connected domains", "Connected domains")}</p>
              <h2>{t("Existing hostnames", "Existing hostnames")}</h2>
            </div>
            <span className="domain-bind-listing__meta">{formatSyncTime(lastRefreshedAt, t)}</span>
          </div>

          {customerBindings.length === 0 ? (
            <div className="domain-bind-listing__empty">
              <strong>{t("No branded domains yet", "No branded domains yet")}</strong>
              <p>{t("Once you bind a hostname, it will appear here as a quiet list item with its current status.", "Once you bind a hostname, it will appear here as a quiet list item with its current status.")}</p>
            </div>
          ) : (
            <div className="domain-bind-list">
              {customerBindings.map((binding) => {
                const tone = getBindingTone(binding);
                const isExpanded = expandedBindingId === binding.id;

                return (
                  <article key={binding.id} className={`domain-bind-row ${isExpanded ? "is-expanded" : ""}`}>
                    <button
                      type="button"
                      className="domain-bind-row__summary"
                      onClick={() => handleToggleBindingDetails(binding.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="domain-bind-row__identity">
                        <span className={`domain-bind-row__dot domain-bind-row__dot--${tone}`} />
                        <div>
                          <strong>{binding.hostname}</strong>
                          <p>{getBindingPreview(binding, t)}</p>
                        </div>
                      </div>

                      <div className="domain-bind-row__meta">
                        <span className={`domain-bind-chip domain-bind-chip--${tone}`}>{formatBindingStatus(binding.bindingStatus, t)}</span>
                        {binding.isPrimary ? (
                          <span className="domain-bind-chip domain-bind-chip--primary">
                            <Crown size={12} />
                            {t("Primary", "Primary")}
                          </span>
                        ) : null}
                        <span className="domain-bind-row__toggle">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="domain-bind-row__details">
                        {binding.lastError ? (
                          <div className="domain-bind-workspace__alert domain-bind-workspace__alert--error">
                            <AlertTriangle size={16} />
                            {binding.lastError}
                          </div>
                        ) : null}

                        {binding.dnsInstructions.length > 0 ? (
                          <div className="domain-bind-row__records">
                            {binding.dnsInstructions.map((instruction) => (
                              <div key={`${binding.id}-list-${instruction.name}-${instruction.type}`} className="domain-bind-record">
                                <div className="domain-bind-record__meta">
                                  <strong>{instruction.name}</strong>
                                  <span>{instruction.type}</span>
                                </div>
                                <code>{instruction.value}</code>
                                <p>{t(instruction.purpose, instruction.purpose)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="domain-bind-row__quiet">{t("No pending DNS records for this hostname.", "No pending DNS records for this hostname.")}</div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={`domain-bind-advanced ${isAdvancedOpen ? "is-open" : ""}`}>
          <button
            type="button"
            className="domain-bind-advanced__toggle"
            onClick={() => setIsAdvancedOpen((value) => !value)}
            aria-expanded={isAdvancedOpen}
          >
            <div>
              <p className="domain-bind-workspace__eyebrow">{t("Advanced", "Advanced")}</p>
              <h2>{t("Management and recovery", "Management and recovery")}</h2>
            </div>
            <span className="domain-bind-advanced__chevron">
              {isAdvancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {isAdvancedOpen ? (
            <div className="domain-bind-advanced__body">
              {advancedBinding ? (
                <article className="domain-bind-advanced__panel">
                  <div className="domain-bind-advanced__panel-head">
                    <div>
                      <p className="domain-bind-workspace__eyebrow">{t("Selected domain", "Selected domain")}</p>
                      <h3>{advancedBinding.hostname}</h3>
                    </div>
                    <span className={`domain-bind-chip domain-bind-chip--${getBindingTone(advancedBinding)}`}>
                      {formatBindingStatus(advancedBinding.bindingStatus, t)}
                    </span>
                  </div>

                  <p className="domain-bind-advanced__copy">
                    {advancedBinding.isPrimary
                      ? t("This domain is currently the primary customer-facing address for the site.", "This domain is currently the primary customer-facing address for the site.")
                      : t("Use these controls when you need to promote, pause, or remove an existing hostname.", "Use these controls when you need to promote, pause, or remove an existing hostname.")}
                  </p>

                  <div className="domain-bind-card__actions">
                    {!advancedBinding.isPrimary && isHealthyStatus(advancedBinding.bindingStatus) ? (
                      <button
                        className="domain-bind-button domain-bind-button--primary"
                        type="button"
                        onClick={() => void handleMakePrimary(advancedBinding.id)}
                      >
                        {t("Set as primary", "Set as primary")}
                      </button>
                    ) : null}

                    <button
                      className="domain-bind-button domain-bind-button--secondary"
                      type="button"
                      onClick={() => void handleToggle(advancedBinding)}
                    >
                      {advancedBinding.isEnabled ? t("Pause domain", "Pause domain") : t("Resume domain", "Resume domain")}
                    </button>

                    <button
                      className="domain-bind-button domain-bind-button--danger"
                      type="button"
                      onClick={() => void handleDelete(advancedBinding)}
                    >
                      <Trash2 size={14} />
                      {t("Remove", "Remove")}
                    </button>
                  </div>
                </article>
              ) : null}

              {systemBinding ? (
                <article className="domain-bind-advanced__panel domain-bind-advanced__panel--fallback">
                  <div className="domain-bind-advanced__fallback-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="domain-bind-workspace__eyebrow">{t("Platform fallback", "Platform fallback")}</p>
                    <h3>{systemBinding.hostname}</h3>
                  </div>
                  <p className="domain-bind-advanced__copy">
                    {t("Platform fallback description", "Keep this hostname attached quietly as your recovery route while branded domains are syncing or being changed.")}
                  </p>
                </article>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
