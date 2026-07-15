import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Globe2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShoppingCart,
  TrendingUp,
  X,
} from "lucide-react";
import { getCustomerSession } from "../lib/customer-session";
import {
  buildSubscriptionId,
  createDomainRegisterCheckout,
  createDomainRenewCheckout,
  createDomainTransferCheckout,
  getCustomerDomains,
  getCustomerSites,
  saveDomainContactProfile,
  searchDomains,
  setupDomainAutoRenew,
  updateCustomerDomainSettings,
  type CustomerDomain,
  type DomainContactProfile,
  type DomainContactProfilePayload,
  type DomainSearchResult,
  type HostedSite,
} from "../lib/customer-api";
import { getActiveLocale, useLocalization } from "../lib/i18n";

const suggestedTlds = ["com", "net", "org", "shop", "io", "app"];

const emptyContact: DomainContactProfilePayload = {
  firstName: "",
  lastName: "",
  companyName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  email: "",
  phone: "",
};

function formatDate(value: string | null | undefined, t?: (key: string, def: string) => string) {
  const unknown = t?.("Unknown", "Unknown") ?? "Unknown";
  if (!value) return unknown;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unknown;
  return new Intl.DateTimeFormat(getActiveLocale(), { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatPrice(value: number | null | undefined, t?: (key: string, def: string) => string) {
  const unavailable = t?.("Price unavailable", "Price unavailable") ?? "Price unavailable";
  if (value === null || value === undefined) return unavailable;
  return new Intl.NumberFormat(getActiveLocale(), { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function profileToDraft(profile: DomainContactProfile | null, fallbackEmail: string): DomainContactProfilePayload {
  if (!profile) return { ...emptyContact, email: fallbackEmail };
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    companyName: profile.companyName ?? "",
    address1: profile.address1,
    address2: profile.address2 ?? "",
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    country: profile.country,
    email: profile.email,
    phone: profile.phone,
  };
}

function isTransferWorkflowDomain(domain: CustomerDomain) {
  const normalizedStatus = domain.status.trim().toLowerCase();
  return normalizedStatus.includes("transfer")
    || !domain.createDateUtc
    || !domain.expireDateUtc;
}

function isTransferAttentionStatus(status: string) {
  return ["failed", "rejected", "declined", "canceled", "cancelled", "error"].some((part) => status.includes(part));
}

type TransferProgressDetails = {
  summary: string;
  approvalEmail: string | null;
  registryWarning: string | null;
  registryStatuses: string[];
  nextStep: string;
  needsAttention: boolean;
};

export function DomainsPage() {
  const { t } = useLocalization();
  const [domains, setDomains] = useState<CustomerDomain[]>([]);
  const [contactProfile, setContactProfile] = useState<DomainContactProfile | null>(null);
  const [contactDraft, setContactDraft] = useState<DomainContactProfilePayload>(emptyContact);
  const [sites, setSites] = useState<HostedSite[]>([]);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DomainSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [transferDomainName, setTransferDomainName] = useState("");
  const [transferAuthCode, setTransferAuthCode] = useState("");
  const [transferPrivacyEnabled, setTransferPrivacyEnabled] = useState(true);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [busyDomain, setBusyDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<CustomerDomain | null>(null);
  const [renewYears, setRenewYears] = useState(1);
  const [registerYears, setRegisterYears] = useState(1);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  function domainState(domain: CustomerDomain) {
    const normalizedStatus = domain.status.trim().toLowerCase();
    const transferPending = isTransferWorkflowDomain(domain);
    if (transferPending) {
      return {
        label: normalizedStatus === "pending_transfer" ? t("Transfer Pending", "Transfer Pending") : titleCaseStatus(normalizedStatus),
        tone: isTransferAttentionStatus(normalizedStatus) ? ("expired" as const) : ("warning" as const),
      };
    }
    const days = daysUntil(domain.expireDateUtc);
    if (domain.status === "expired" || (days !== null && days < 0)) {
      return { label: t("Expired", "Expired"), tone: "expired" as const };
    }
    if (days !== null && days <= 30) {
      return { label: t("Expiring Soon", "Expiring Soon"), tone: "warning" as const };
    }
    return { label: t("Active", "Active"), tone: "active" as const };
  }

  function titleCaseStatus(status: string) {
    return status
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getTransferProgressDetails(domain: CustomerDomain): TransferProgressDetails {
    const normalizedStatus = domain.status.trim().toLowerCase();
    const rawNote = domain.lastError?.replace(/\s+/g, " ").trim() ?? "";
    let approvalEmail = domain.transferApprovalEmail?.trim() || null;
    let registryWarning: string | null = null;
    let registryStatuses: string[] = [];
    let remaining = rawNote;

    const approvalMatch = remaining.match(/Approval email:\s*([^\s]+@[^\s]+)/i);
    if (!approvalEmail && approvalMatch?.[1]) {
      approvalEmail = approvalMatch[1].replace(/[.,;:]+$/, "");
    }
    remaining = remaining.replace(/Approval email:\s*[^\s]+@[^\s]+/i, "").trim();

    const registryStatusesLabel = "Registry statuses:";
    const registryStatusesIndex = remaining.toLowerCase().lastIndexOf(registryStatusesLabel.toLowerCase());
    if (registryStatusesIndex >= 0) {
      const statusesText = remaining
        .slice(registryStatusesIndex + registryStatusesLabel.length)
        .replace(/\s+/g, " ")
        .trim();
      registryStatuses = statusesText
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      remaining = remaining.slice(0, registryStatusesIndex).trim();
    }

    remaining = remaining.replace(/^[\s.;:-]+|[\s.;:-]+$/g, "").trim();

    if (remaining) {
      registryWarning = remaining.replace(/\s+/g, " ").trim();
    }

    const needsAttention = isTransferAttentionStatus(normalizedStatus);
    let summary = t("Payment is complete and we have submitted the transfer. We are now waiting for the current registrar and the registry to finish moving this domain.", "Payment is complete and we have submitted the transfer. We are now waiting for the current registrar and the registry to finish moving this domain.");
    let nextStep = approvalEmail
      ? t("Watch {email} for the transfer approval message. Some registrars require you to approve that email before the transfer can continue.", "Watch {email} for the transfer approval message. Some registrars require you to approve that email before the transfer can continue.").replace("{email}", approvalEmail)
      : t("Keep the domain unlocked at the current registrar and keep the EPP/Auth code valid until the transfer completes.", "Keep the domain unlocked at the current registrar and keep the EPP/Auth code valid until the transfer completes.");

    if (normalizedStatus !== "pending_transfer") {
      summary = t("The registrar is still reporting this transfer as {status}. We will keep this domain in your portfolio while we wait for the transfer to finish.", "The registrar is still reporting this transfer as {status}. We will keep this domain in your portfolio while we wait for the transfer to finish.").replace("{status}", titleCaseStatus(normalizedStatus).toLowerCase());
    }

    if (needsAttention) {
      summary = t("The transfer has paused and needs attention before it can continue.", "The transfer has paused and needs attention before it can continue.");
      nextStep = approvalEmail
        ? t("Check {email} for approval or rejection notices, then review the registry details below before retrying with the current registrar.", "Check {email} for approval or rejection notices, then review the registry details below before retrying with the current registrar.").replace("{email}", approvalEmail)
        : t("Review the registry warning below, make sure the domain is unlocked, and confirm the EPP/Auth code with the current registrar before retrying.", "Review the registry warning below, make sure the domain is unlocked, and confirm the EPP/Auth code with the current registrar before retrying.");
    } else if (registryWarning && !approvalEmail) {
      nextStep = t("Review the registry note below, then keep the domain unlocked at the current registrar while we continue checking the transfer status automatically.", "Review the registry note below, then keep the domain unlocked at the current registrar while we continue checking the transfer status automatically.");
    }

    return {
      summary,
      approvalEmail,
      registryWarning,
      registryStatuses,
      nextStep,
      needsAttention,
    };
  }

  const expiringCount = useMemo(() => domains.filter((domain) => {
    const days = daysUntil(domain.expireDateUtc);
    return days !== null && days >= 0 && days <= 30;
  }).length, [domains]);

  const expiredCount = useMemo(() => domains.filter((domain) => {
    const days = daysUntil(domain.expireDateUtc);
    return domain.status === "expired" || (days !== null && days < 0);
  }).length, [domains]);

  const activeCount = useMemo(() => Math.max(0, domains.length - expiringCount - expiredCount), [domains.length, expiringCount, expiredCount]);
  const transferDomains = useMemo(
    () => domains.filter((domain) => isTransferWorkflowDomain(domain)),
    [domains],
  );

  const filteredDomains = useMemo(() => {
    const needle = portfolioSearch.trim().toLowerCase();
    if (!needle) return domains;
    return domains.filter((domain) => domain.domainName.toLowerCase().includes(needle));
  }, [domains, portfolioSearch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setCheckoutMessage(t("Payment received. Your domain order is now processing.", "Payment received. Your domain order is now processing."));
    } else if (params.get("checkout") === "cancel") {
      setCheckoutMessage(t("Checkout was canceled. No domain changes were made.", "Checkout was canceled. No domain changes were made."));
    } else if (params.get("autoRenew") === "success") {
      setCheckoutMessage(t("Auto-renew payment method saved.", "Auto-renew payment method saved."));
    } else if (params.get("autoRenew") === "cancel") {
      setCheckoutMessage(t("Auto-renew setup was canceled.", "Auto-renew setup was canceled."));
    }
  }, []);

  useEffect(() => {
    const linkId = "domains-page-fonts";
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    loadDomains();
  }, []);

  async function loadDomains() {
    const session = getCustomerSession();
    if (!session) {
      setLoading(false);
      setLoadError(t("Your session has expired. Please sign in again.", "Your session has expired. Please sign in again."));
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const [domainResponse, siteResponse] = await Promise.all([getCustomerDomains(session), getCustomerSites(session)]);
      setDomains(domainResponse.domains);
      setContactProfile(domainResponse.contactProfile);
      setContactDraft(profileToDraft(domainResponse.contactProfile, session.email));
      setStripeConfigured(domainResponse.stripeConfigured);
      setSites(siteResponse);
      setSelectedSiteId((current) => current || siteResponse[0]?.id || "");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("Unable to load your domains.", "Unable to load your domains."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getCustomerSession();
    if (!session) return;

    try {
      setSearching(true);
      setSearchError(null);
      const response = await searchDomains(session, { query: searchQuery, tlds: suggestedTlds, years: registerYears });
      setSearchResults(response.results);
    } catch (err) {
      setSearchResults([]);
      setSearchError(err instanceof Error ? err.message : t("Domain search failed.", "Domain search failed."));
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getCustomerSession();
    if (!session) return;

    try {
      setSavingContact(true);
      setContactMessage(null);
      const saved = await saveDomainContactProfile(session, contactDraft);
      setContactProfile(saved);
      setContactDraft(profileToDraft(saved, session.email));
      setContactMessage(t("Contact profile saved.", "Contact profile saved."));
    } catch (err) {
      setContactMessage(err instanceof Error ? err.message : t("Unable to save contact profile.", "Unable to save contact profile."));
    } finally {
      setSavingContact(false);
    }
  }

  async function handleBuy(result: DomainSearchResult) {
    const session = getCustomerSession();
    if (!session) return;

    if (!contactProfile) {
      setSearchError(t("Save the registrant contact profile before buying a domain.", "Save the registrant contact profile before buying a domain."));
      return;
    }

    try {
      setBusyDomain(result.domainName);
      const checkout = await createDomainRegisterCheckout(session, {
        domainName: result.domainName,
        years: registerYears,
        purchasePrice: result.registrarPurchasePrice,
        purchaseType: result.purchaseType,
        privacyEnabled: true,
      });
      if (checkout.checkoutUrl) window.location.href = checkout.checkoutUrl;
      else setSearchError(checkout.message);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : t("Unable to start checkout.", "Unable to start checkout."));
    } finally {
      setBusyDomain(null);
    }
  }

  async function handleRenew(domain: CustomerDomain) {
    const session = getCustomerSession();
    if (!session) return;

    try {
      setBusyDomain(domain.id);
      const checkout = await createDomainRenewCheckout(session, domain.id, {
        years: renewYears,
        purchasePrice: domain.renewalPrice,
      });
      if (checkout.checkoutUrl) window.location.href = checkout.checkoutUrl;
      else {
        setCheckoutMessage(checkout.message);
        window.dispatchEvent(new Event("balance-changed"));
      }
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : t("Unable to start renewal checkout.", "Unable to start renewal checkout."));
    } finally {
      setBusyDomain(null);
    }
  }

  async function handleToggleSetting(domain: CustomerDomain, key: "privacyEnabled" | "locked") {
    const session = getCustomerSession();
    if (!session) return;

    try {
      setBusyDomain(domain.id);
      const response = await updateCustomerDomainSettings(session, domain.id, { [key]: !domain[key] });
      if (response.domain) {
        setDomains((current) => current.map((item) => item.id === domain.id ? response.domain! : item));
        setSelectedDomain(response.domain);
      }
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : t("Unable to update domain settings.", "Unable to update domain settings."));
    } finally {
      setBusyDomain(null);
    }
  }

  async function handleAutoRenew(domain: CustomerDomain) {
    const session = getCustomerSession();
    if (!session) return;

    try {
      setBusyDomain(domain.id);
      const response = await setupDomainAutoRenew(session, domain.id);
      if (response.checkoutUrl) window.location.href = response.checkoutUrl;
      else if (response.domain) {
        setDomains((current) => current.map((item) => item.id === domain.id ? response.domain! : item));
        setSelectedDomain(response.domain);
      } else {
        setCheckoutMessage(response.message);
      }
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : t("Unable to start auto-renew setup.", "Unable to start auto-renew setup."));
    } finally {
      setBusyDomain(null);
    }
  }

  async function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getCustomerSession();
    if (!session) return;

    try {
      setTransferSubmitting(true);
      setTransferMessage(null);
      const checkout = await createDomainTransferCheckout(session, {
        domainName: transferDomainName,
        authCode: transferAuthCode,
        privacyEnabled: transferPrivacyEnabled,
      });
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }

      setTransferMessage(checkout.message);
      await loadDomains();
      setTransferOpen(false);
      setTransferDomainName("");
      setTransferAuthCode("");
      setTransferPrivacyEnabled(true);
    } catch (err) {
      setTransferMessage(err instanceof Error ? err.message : t("Unable to start transfer checkout.", "Unable to start transfer checkout."));
    } finally {
      setTransferSubmitting(false);
    }
  }

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0];
  const bindHref = selectedSite
    ? `/subscription/${buildSubscriptionId(selectedSite.hostingPlanSlug, selectedSite.regionSlug)}/site/${selectedSite.id}/domains`
    : null;
  const selectedDomainTransferPending = selectedDomain ? isTransferWorkflowDomain(selectedDomain) : false;

  return (
    <div className="domain-management">
      <header className="domain-management__header">
        <div>
          <h1>{t("Domain Management", "Domain Management")}</h1>
          <p>{t("Manage all your domains, monitor status and renewal dates", "Manage all your domains, monitor status and renewal dates")}</p>
        </div>
        <button className="dm-icon-button" type="button" onClick={loadDomains} disabled={loading} aria-label="Refresh domains">
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="dm-stats" aria-label="Domain portfolio summary">
        <StatCard title={t("Total Domains", "Total Domains")} value={loading ? "..." : domains.length.toString()} note={t("Customer owned", "Customer owned")} icon={<Globe2 size={30} />} />
        <StatCard title={t("Active", "Active")} value={loading ? "..." : activeCount.toString()} icon={<TrendingUp size={30} />} tone="green" />
        <StatCard title={t("Expiring Soon", "Expiring Soon")} value={loading ? "..." : expiringCount.toString()} icon={<Clock3 size={30} />} tone="orange" />
        <StatCard title={t("Expired", "Expired")} value={loading ? "..." : expiredCount.toString()} icon={<AlertTriangle size={30} />} tone="red" />
      </section>

      <section className="dm-toolbar">
        <label className="dm-toolbar__search">
          <Search size={20} />
          <input value={portfolioSearch} onChange={(event) => setPortfolioSearch(event.target.value)} placeholder={t("Search domains...", "Search domains...")} />
        </label>
        <button className="dm-button dm-button--secondary" type="button" onClick={() => {
          setTransferMessage(null);
          setTransferOpen(true);
        }}>
          <ArrowLeftRight size={18} />
          {t("Transfer Domain", "Transfer Domain")}
        </button>
        <button className="dm-button dm-button--primary" type="button" onClick={() => setPurchaseOpen(true)}>
          <Plus size={19} />
          {t("Purchase Domain", "Purchase Domain")}
        </button>
      </section>

      {checkoutMessage ? (
        <div className="registrar-domain-alert registrar-domain-alert--info">
          <CheckCircle2 size={18} />
          <span>{checkoutMessage}</span>
        </div>
      ) : null}

      {loadError ? (
        <div className="registrar-domain-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{loadError}</span>
        </div>
      ) : null}

      {transferDomains.length ? (
        <div className="transfer-portfolio-banner">
          <div className="transfer-portfolio-banner__icon">
            <Clock3 size={18} />
          </div>
          <div className="transfer-portfolio-banner__copy">
            <strong>
              {transferDomains.length === 1
                ? t("{name} is still transferring in", "{name} is still transferring in").replace("{name}", transferDomains[0].domainName)
                : t("{count} domain transfers are still in progress", "{count} domain transfers are still in progress").replace("{count}", String(transferDomains.length))}
            </strong>
            <span>
              {t("We keep transferred domains visible here while the registrar finishes the move. Open Manage on any transfer to see its approval email, registry notes, and the next step.", "We keep transferred domains visible here while the registrar finishes the move. Open Manage on any transfer to see its approval email, registry notes, and the next step.")}
            </span>
          </div>
        </div>
      ) : null}

      <section className="dm-card-grid" aria-label="Customer domains">
        {loading ? (
          <div className="dm-empty">{t("Loading domains...", "Loading domains...")}</div>
        ) : filteredDomains.length === 0 ? (
          <div className="dm-empty">
            <Globe2 size={24} />
            <strong>{t("No domains found", "No domains found")}</strong>
            <span>{domains.length === 0 ? t("Purchase a domain to start building the customer portfolio.", "Purchase a domain to start building the customer portfolio.") : t("Try a different search term.", "Try a different search term.")}</span>
          </div>
        ) : filteredDomains.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            busy={busyDomain === domain.id}
            stripeConfigured={stripeConfigured}
            onRenew={() => handleRenew(domain)}
            onManage={() => setSelectedDomain(domain)}
            onAutoRenew={() => handleAutoRenew(domain)}
            domainState={domainState}
          />
        ))}
      </section>

      {purchaseOpen ? (
        <div className="dm-modal" role="dialog" aria-modal="true">
          <div className="dm-modal__panel dm-modal__panel--wide">
            <button className="dm-modal__close" type="button" onClick={() => setPurchaseOpen(false)} aria-label="Close purchase domain">
              <X size={18} />
            </button>
            <div className="dm-modal__header">
              <span>{t("Purchase Domain", "Purchase Domain")}</span>
              <h2>{t("Find and register a domain", "Find and register a domain")}</h2>
              <p>{t("Domain availability and Stripe checkout are handled by the backend. You only see domains that belong to your account.", "Domain availability and Stripe checkout are handled by the backend. You only see domains that belong to your account.")}</p>
            </div>

            <form className="dm-purchase-search" onSubmit={handleSearch}>
              <label>
                <span>{t("Domain or keyword", "Domain or keyword")}</span>
                <div>
                  <Search size={20} />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("example.com or brand name", "example.com or brand name")} />
                </div>
              </label>
              <label className="dm-purchase-search__years">
                <span>{t("Years", "Years")}</span>
                <select value={registerYears} onChange={(event) => setRegisterYears(Number(event.target.value))}>
                  {[1, 2, 3, 5, 10].map((year) => <option key={year} value={year}>{t("{count} year(s)", "{count} year(s)").replace("{count}", String(year))}</option>)}
                </select>
              </label>
              <button className="dm-button dm-button--primary" type="submit" disabled={searching}>
                {searching ? t("Searching...", "Searching...") : t("Search", "Search")}
              </button>
            </form>

            {!stripeConfigured ? (
              <div className="domain-storefront__notice">
                <CreditCard size={16} />
                {t("Stripe is not configured yet, so checkout buttons are disabled.", "Stripe is not configured yet, so checkout buttons are disabled.")}
              </div>
            ) : null}

            {searchError ? <div className="domain-storefront__inline-error">{searchError}</div> : null}

            <div className="dm-purchase-layout">
              <div className="dm-search-results">
                {searchResults.length === 0 && !searching ? (
                  <div className="dm-empty dm-empty--compact">{t("Search a domain or keyword to check live availability.", "Search a domain or keyword to check live availability.")}</div>
                ) : searchResults.map((result) => (
                  <div className={`dm-result-row${result.purchasable ? "" : " is-unavailable"}`} key={result.domainName}>
                    <div>
                      <strong>{result.domainName}</strong>
                      <span>{result.purchasable ? t("{price} for {years} year(s)", "{price} for {years} year(s)").replace("{price}", formatPrice(result.customerPurchasePrice, t) ?? "").replace("{years}", String(registerYears)) : t(result.reason ?? "Unavailable", result.reason ?? "Unavailable")}</span>
                    </div>
                    <button
                      className="dm-button dm-button--dark"
                      type="button"
                      disabled={!result.purchasable || !stripeConfigured || busyDomain === result.domainName}
                      onClick={() => handleBuy(result)}
                    >
                      {busyDomain === result.domainName ? t("Opening...", "Opening...") : t("Buy", "Buy")}
                    </button>
                  </div>
                ))}
              </div>

              <form className="dm-contact-card" onSubmit={handleSaveContact}>
                <div>
                  <span>{t("Registrant Contact", "Registrant Contact")}</span>
                  <h3>{contactProfile ? t("Contact saved", "Contact saved") : t("Required before checkout", "Required before checkout")}</h3>
                </div>
                <div className="domain-contact-form__row">
                  <label><span>{t("First", "First")}</span><input value={contactDraft.firstName} onChange={(event) => setContactDraft((draft) => ({ ...draft, firstName: event.target.value }))} /></label>
                  <label><span>{t("Last", "Last")}</span><input value={contactDraft.lastName} onChange={(event) => setContactDraft((draft) => ({ ...draft, lastName: event.target.value }))} /></label>
                </div>
                <label><span>{t("Address", "Address")}</span><input value={contactDraft.address1} onChange={(event) => setContactDraft((draft) => ({ ...draft, address1: event.target.value }))} /></label>
                <div className="domain-contact-form__row">
                  <label><span>{t("City", "City")}</span><input value={contactDraft.city} onChange={(event) => setContactDraft((draft) => ({ ...draft, city: event.target.value }))} /></label>
                  <label><span>{t("State", "State")}</span><input value={contactDraft.state} onChange={(event) => setContactDraft((draft) => ({ ...draft, state: event.target.value }))} /></label>
                </div>
                <div className="domain-contact-form__row">
                  <label><span>{t("ZIP", "ZIP")}</span><input value={contactDraft.zip} onChange={(event) => setContactDraft((draft) => ({ ...draft, zip: event.target.value }))} /></label>
                  <label><span>{t("Country", "Country")}</span><input value={contactDraft.country} maxLength={2} onChange={(event) => setContactDraft((draft) => ({ ...draft, country: event.target.value.toUpperCase() }))} /></label>
                </div>
                <label><span>{t("Email", "Email")}</span><input type="email" value={contactDraft.email} onChange={(event) => setContactDraft((draft) => ({ ...draft, email: event.target.value }))} /></label>
                <label><span>{t("Phone", "Phone")}</span><input value={contactDraft.phone} placeholder="+15551234567" onChange={(event) => setContactDraft((draft) => ({ ...draft, phone: event.target.value }))} /></label>
                <button className="dm-button dm-button--secondary" type="submit" disabled={savingContact}>
                  {savingContact ? t("Saving...", "Saving...") : t("Save Contact", "Save Contact")}
                </button>
                {contactMessage ? <span className="domain-contact-form__message">{contactMessage}</span> : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {transferOpen ? (
        <div className="dm-modal" role="dialog" aria-modal="true">
          <div className="dm-modal__panel">
            <button className="dm-modal__close" type="button" onClick={() => setTransferOpen(false)} aria-label="Close transfer domain">
              <X size={18} />
            </button>
            <div className="dm-modal__header">
              <span>{t("Transfer Domain", "Transfer Domain")}</span>
              <h2>{t("Transfer a domain into your account", "Transfer a domain into your account")}</h2>
              <p>{t("Enter the domain name and its EPP/Auth code. After payment, we submit the transfer to the registrar, show it here as Pending transfer, and keep updating the card until the registrar finishes moving it.", "Enter the domain name and its EPP/Auth code. After payment, we submit the transfer to the registrar, show it here as Pending transfer, and keep updating the card until the registrar finishes moving it.")}</p>
            </div>
            <form className="stack-sm" onSubmit={handleTransfer}>
              <label className="domain-contact-form">
                <span>{t("Domain name", "Domain name")}</span>
                <input
                  value={transferDomainName}
                  placeholder="example.com"
                  onChange={(event) => setTransferDomainName(event.target.value)}
                />
              </label>
              <label className="domain-contact-form">
                <span>{t("EPP / Auth code", "EPP / Auth code")}</span>
                <input
                  value={transferAuthCode}
                  placeholder={t("Transfer authorization code", "Transfer authorization code")}
                  onChange={(event) => setTransferAuthCode(event.target.value)}
                />
              </label>
              <label className="domain-drawer__toggle" style={{ justifyContent: "space-between" }}>
                <span>{t("Enable Whois privacy after transfer", "Enable Whois privacy after transfer")}</span>
                <input
                  type="checkbox"
                  checked={transferPrivacyEnabled}
                  onChange={(event) => setTransferPrivacyEnabled(event.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
              </label>
              <div className="transfer-expectation-card">
                <div className="transfer-expectation-card__header">
                  <ArrowLeftRight size={18} />
                  <strong>{t("What happens next", "What happens next")}</strong>
                </div>
                <ul className="transfer-expectation-card__list">
                  <li>{t("Before checkout, unlock the domain at the current registrar and confirm the EPP/Auth code is current.", "Before checkout, unlock the domain at the current registrar and confirm the EPP/Auth code is current.")}</li>
                  <li>{t("After payment, the domain will appear here as Pending transfer while the registrar and registry process the move.", "After payment, the domain will appear here as Pending transfer while the registrar and registry process the move.")}</li>
                  <li>{t("If the current registrar sends an approval email or the registry reports a warning, we will show that directly on the domain card.", "If the current registrar sends an approval email or the registry reports a warning, we will show that directly on the domain card.")}</li>
                </ul>
              </div>
              {!stripeConfigured ? (
                <div className="domain-storefront__notice">
                  <CreditCard size={16} />
                  {t("Stripe is not configured yet, so transfer checkout is disabled.", "Stripe is not configured yet, so transfer checkout is disabled.")}
                </div>
              ) : null}
              {transferMessage ? (
                <div className="domain-storefront__inline-error">{transferMessage}</div>
              ) : null}
              <div className="domain-drawer__inline">
                <button className="dm-button dm-button--secondary" type="button" onClick={() => setTransferOpen(false)}>
                  {t("Close", "Close")}
                </button>
                <button
                  className="dm-button dm-button--dark"
                  type="submit"
                  disabled={!stripeConfigured || transferSubmitting || !transferDomainName.trim() || !transferAuthCode.trim()}
                >
                  {transferSubmitting ? t("Opening checkout...", "Opening checkout...") : t("Transfer with Stripe", "Transfer with Stripe")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedDomain ? (
        <div className="domain-drawer domain-drawer--make" role="dialog" aria-modal="true">
          <div className="domain-drawer__panel">
            <button className="domain-drawer__close" type="button" onClick={() => setSelectedDomain(null)} aria-label="Close domain details">
              <X size={18} />
            </button>
            <span className="domain-storefront__eyebrow">{t("Domain detail", "Domain detail")}</span>
            <h2>{selectedDomain.domainName}</h2>
            <p>{t("Renew ownership, control registrar protection, or bind this domain to a hosted site.", "Renew ownership, control registrar protection, or bind this domain to a hosted site.")}</p>

            <div className="domain-drawer__stats">
              <div><span>{t("Expires", "Expires")}</span><strong>{formatDate(selectedDomain.expireDateUtc, t)}</strong></div>
              <div><span>{t("Renewal", "Renewal")}</span><strong>{formatPrice(selectedDomain.renewalPrice, t)}</strong></div>
              <div><span>{t("Status", "Status")}</span><strong>{domainState(selectedDomain).label}</strong></div>
            </div>

            {selectedDomainTransferPending ? <TransferProgressCallout domain={selectedDomain} variant="drawer" getTransferProgressDetails={getTransferProgressDetails} domainState={domainState} /> : null}

            <div className="domain-drawer__section">
              <h3><CalendarDays size={16} /> {t("Renew domain", "Renew domain")}</h3>
              <div className="domain-drawer__inline">
                <select value={renewYears} onChange={(event) => setRenewYears(Number(event.target.value))}>
                  {[1, 2, 3, 5, 10].map((year) => <option key={year} value={year}>{t("{count} year(s)", "{count} year(s)").replace("{count}", String(year))}</option>)}
                </select>
                <button className="domain-prototype__button domain-prototype__button--primary" type="button" onClick={() => handleRenew(selectedDomain)} disabled={!stripeConfigured || busyDomain === selectedDomain.id || selectedDomainTransferPending}>
                  {selectedDomainTransferPending ? t("Transfer pending", "Transfer pending") : t("Renew with Stripe", "Renew with Stripe")}
                </button>
              </div>
            </div>

            <div className="domain-drawer__section">
              <h3><Settings2 size={16} /> {t("Registrar settings", "Registrar settings")}</h3>
              <button className="domain-drawer__toggle" type="button" disabled={busyDomain === selectedDomain.id || selectedDomainTransferPending} onClick={() => handleToggleSetting(selectedDomain, "privacyEnabled")}>
                {t("Whois privacy", "Whois privacy")} <strong>{selectedDomain.privacyEnabled ? t("On", "On") : t("Off", "Off")}</strong>
              </button>
              <button className="domain-drawer__toggle" type="button" disabled={busyDomain === selectedDomain.id || selectedDomainTransferPending} onClick={() => handleToggleSetting(selectedDomain, "locked")}>
                {t("Transfer lock", "Transfer lock")} <strong>{selectedDomain.locked ? t("Locked", "Locked") : t("Unlocked", "Unlocked")}</strong>
              </button>
              <button className="domain-drawer__toggle" type="button" disabled={!stripeConfigured || busyDomain === selectedDomain.id || selectedDomain.platformAutoRenewEnabled || selectedDomainTransferPending} onClick={() => handleAutoRenew(selectedDomain)}>
                {t("Platform auto-renew", "Platform auto-renew")} <strong>{selectedDomain.platformAutoRenewEnabled ? t("Enabled", "Enabled") : t("Setup", "Setup")}</strong>
              </button>
            </div>

            <div className="domain-drawer__section">
              <h3><ExternalLink size={16} /> {t("Bind to hosted site", "Bind to hosted site")}</h3>
              {sites.length ? (
                <div className="domain-drawer__inline">
                  <select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
                  </select>
                  <a className="domain-prototype__button domain-prototype__button--secondary" href={bindHref ?? "#"}>{t("Open bind flow", "Open bind flow")}</a>
                </div>
              ) : (
                <p>{t("No hosted sites yet. Create a website before binding this domain.", "No hosted sites yet. Create a website before binding this domain.")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, note, icon, tone }: { title: string; value: string; note?: string; icon: ReactNode; tone?: "green" | "orange" | "red" }) {
  return (
    <article className={`dm-stat-card${tone ? ` dm-stat-card--${tone}` : ""}`}>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        {note ? <em>{note}</em> : null}
      </div>
      <div className="dm-stat-card__icon">{icon}</div>
    </article>
  );
}

function TransferProgressCallout({
  domain,
  variant,
  getTransferProgressDetails,
  domainState,
}: {
  domain: CustomerDomain;
  variant: "card" | "drawer";
  getTransferProgressDetails: (domain: CustomerDomain) => TransferProgressDetails;
  domainState: (domain: CustomerDomain) => { label: string; tone: "active" | "warning" | "expired" };
}) {
  const { t } = useLocalization();
  const details = getTransferProgressDetails(domain);
  const state = domainState(domain);

  return (
    <div className={`transfer-progress-callout${variant === "card" ? " transfer-progress-callout--card" : ""}${details.needsAttention ? " is-attention" : ""}`}>
      <div className="transfer-progress-callout__header">
        {details.needsAttention ? <AlertTriangle size={18} /> : <Clock3 size={18} />}
        <div>
          <strong>{details.needsAttention ? t("Transfer needs attention", "Transfer needs attention") : t("Transfer in progress", "Transfer in progress")}</strong>
          <span>{details.summary}</span>
        </div>
      </div>

      <div className="transfer-progress-callout__facts">
        <TransferFact label={t("Status", "Status")} value={state.label} />
        {details.approvalEmail ? <TransferFact label={t("Approval email", "Approval email")} value={details.approvalEmail} /> : null}
        {details.registryWarning ? <TransferFact label={t("Registry warning", "Registry warning")} value={details.registryWarning} /> : null}
        {details.registryStatuses.length ? <TransferFact label={t("Registry status", "Registry status")} value={details.registryStatuses.join(", ")} /> : null}
        <TransferFact label={t("Next step", "Next step")} value={details.nextStep} fullWidth />
      </div>
    </div>
  );
}

function TransferFact({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={`transfer-progress-callout__fact${fullWidth ? " is-full" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DomainCard({
  domain,
  busy,
  stripeConfigured,
  onRenew,
  onManage,
  onAutoRenew,
  domainState,
}: {
  domain: CustomerDomain;
  busy: boolean;
  stripeConfigured: boolean;
  onRenew: () => void;
  onManage: () => void;
  onAutoRenew: () => void;
  domainState: (domain: CustomerDomain) => { label: string; tone: "active" | "warning" | "expired" };
}) {
  const { t } = useLocalization();
  const state = domainState(domain);
  const transferPending = isTransferWorkflowDomain(domain);
  return (
    <article className="dm-domain-card">
      <div className="dm-domain-card__header">
        <div className="dm-domain-card__identity">
          <div className="dm-domain-card__icon"><Globe2 size={24} /></div>
          <div>
            <h2>{domain.domainName}</h2>
            <span className={`dm-status dm-status--${state.tone}`}>
              {state.tone === "active" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {state.label}
            </span>
          </div>
        </div>
        <div className="dm-domain-card__actions">
          <button className="dm-button dm-button--dark" type="button" disabled={!stripeConfigured || busy || transferPending} onClick={onRenew}>{t("Renew", "Renew")}</button>
          <button className="dm-button dm-button--secondary" type="button" onClick={onManage}>{t("Manage", "Manage")}</button>
        </div>
      </div>

      <div className="dm-domain-card__dates">
        <div>
          <CalendarDays size={16} />
          <span>{t("Registration Date", "Registration Date")}</span>
          <strong>{formatDate(domain.createDateUtc, t)}</strong>
        </div>
        <div>
          <CalendarDays size={16} />
          <span>{t("Expiry Date", "Expiry Date")}</span>
          <strong>{formatDate(domain.expireDateUtc, t)}</strong>
        </div>
      </div>

      <div className="dm-domain-card__setting">
        <div>
          <span>{t("Auto-Renew", "Auto-Renew")}</span>
          <strong>{domain.platformAutoRenewEnabled ? t("Enabled", "Enabled") : t("Off", "Off")}</strong>
        </div>
        <button
          className={`dm-switch${domain.platformAutoRenewEnabled ? " is-on" : ""}`}
          type="button"
          disabled={busy || !stripeConfigured || domain.platformAutoRenewEnabled || transferPending}
          onClick={onAutoRenew}
          aria-label={t("Setup domain auto-renew", "Setup domain auto-renew")}
        >
          <span />
        </button>
      </div>

      <div className="dm-domain-card__footer">
        <span><Shield size={14} /> {domain.privacyEnabled ? t("Privacy enabled", "Privacy enabled") : t("Public Whois", "Public Whois")}</span>
        <span><Lock size={14} /> {domain.locked ? t("Transfer locked", "Transfer locked") : t("Unlocked", "Unlocked")}</span>
        <span>{formatPrice(domain.renewalPrice, t)}</span>
      </div>
      {transferPending ? <TransferProgressCallout domain={domain} variant="card" getTransferProgressDetails={(d) => {
        const rawNote = d.lastError?.replace(/\s+/g, " ").trim() ?? "";
        let approvalEmail = d.transferApprovalEmail?.trim() || null;
        let registryWarning: string | null = null;
        let registryStatuses: string[] = [];
        let remaining = rawNote;

        const approvalMatch = remaining.match(/Approval email:\s*([^\s]+@[^\s]+)/i);
        if (!approvalEmail && approvalMatch?.[1]) {
          approvalEmail = approvalMatch[1].replace(/[.,;:]+$/, "");
        }
        remaining = remaining.replace(/Approval email:\s*[^\s]+@[^\s]+/i, "").trim();

        const registryStatusesLabel = "Registry statuses:";
        const registryStatusesIndex = remaining.toLowerCase().lastIndexOf(registryStatusesLabel.toLowerCase());
        if (registryStatusesIndex >= 0) {
          const statusesText = remaining
            .slice(registryStatusesIndex + registryStatusesLabel.length)
            .replace(/\s+/g, " ")
            .trim();
          registryStatuses = statusesText
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          remaining = remaining.slice(0, registryStatusesIndex).trim();
        }

        remaining = remaining.replace(/^[\s.;:-]+|[\s.;:-]+$/g, "").trim();

        if (remaining) {
          registryWarning = remaining.replace(/\s+/g, " ").trim();
        }

        const needsAttention = isTransferAttentionStatus(d.status.trim().toLowerCase());
        let summary = t("Payment is complete and we have submitted the transfer. We are now waiting for the current registrar and the registry to finish moving this domain.", "Payment is complete and we have submitted the transfer. We are now waiting for the current registrar and the registry to finish moving this domain.");
        let nextStep = approvalEmail
          ? t("Watch {email} for the transfer approval message. Some registrars require you to approve that email before the transfer can continue.", "Watch {email} for the transfer approval message. Some registrars require you to approve that email before the transfer can continue.").replace("{email}", approvalEmail)
          : t("Keep the domain unlocked at the current registrar and keep the EPP/Auth code valid until the transfer completes.", "Keep the domain unlocked at the current registrar and keep the EPP/Auth code valid until the transfer completes.");

        if (d.status.trim().toLowerCase() !== "pending_transfer") {
          const partCase = d.status.trim().toLowerCase()
            .split(/[_\s-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
          summary = t("The registrar is still reporting this transfer as {status}. We will keep this domain in your portfolio while we wait for the transfer to finish.", "The registrar is still reporting this transfer as {status}. We will keep this domain in your portfolio while we wait for the transfer to finish.").replace("{status}", partCase.toLowerCase());
        }

        if (needsAttention) {
          summary = t("The transfer has paused and needs attention before it can continue.", "The transfer has paused and needs attention before it can continue.");
          nextStep = approvalEmail
            ? t("Check {email} for approval or rejection notices, then review the registry details below before retrying with the current registrar.", "Check {email} for approval or rejection notices, then review the registry details below before retrying with the current registrar.").replace("{email}", approvalEmail)
            : t("Review the registry warning below, make sure the domain is unlocked, and confirm the EPP/Auth code with the current registrar before retrying.", "Review the registry warning below, make sure the domain is unlocked, and confirm the EPP/Auth code with the current registrar before retrying.");
        } else if (registryWarning && !approvalEmail) {
          nextStep = t("Review the registry note below, then keep the domain unlocked at the current registrar while we continue checking the transfer status automatically.", "Review the registry note below, then keep the domain unlocked at the current registrar while we continue checking the transfer status automatically.");
        }

        return {
          summary,
          approvalEmail,
          registryWarning,
          registryStatuses,
          nextStep,
          needsAttention,
        };
      }} domainState={domainState} /> : null}
    </article>
  );
}
