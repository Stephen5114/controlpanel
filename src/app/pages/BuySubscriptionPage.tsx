import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BillingSummary,
  buildSubscriptionId,
  createHostingSubscriptionCheckout,
  createUpgradeCheckout,
  getBillingSummary,
  getHostingCatalog,
  getUpgradePreview,
  validateHostingCoupon,
  HostingCatalogResponse,
  HostingPlanDefinition,
  type UpgradePreview,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { getAffiliateCheckoutDiscount, type AffiliateCheckoutDiscount } from "../lib/api-affiliate";
import {
  Globe,
  Server,
  ChevronRight,
  Check,
  Gift,
  Tag,
  Database,
  HardDrive,
  FileText,
  Layers,
  Cpu,
  Sparkles,
} from "lucide-react";
import { getActiveLocale, useLocalization } from "../lib/i18n";
import { formatCurrency } from "../lib/display";
import { VpsPage } from "./VpsPage";

type AppliedCoupon = { code: string; discountAmount: number; message: string };


export function BuySubscriptionPage() {
  const { t } = useLocalization();
  const [catalog, setCatalog] = useState<HostingCatalogResponse | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [referralDiscount, setReferralDiscount] = useState<AffiliateCheckoutDiscount | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const upgradeScope = searchParams.get("upgrade"); // e.g. "basic_global"
  const isUpgradeMode = Boolean(upgradeScope);
  const productType = !isUpgradeMode && searchParams.get("type") === "vps" ? "vps" : "hosting";
  const upgradePlanSlug = upgradeScope?.split("_")[0] ?? null;
  const upgradeRegion = upgradeScope?.includes("_") ? upgradeScope.split("_").slice(1).join("_") : null;

  const [upgradePreview, setUpgradePreview] = useState<UpgradePreview | null>(null);

  const session = getCustomerSession();

  const sortedPlans = useMemo(
    () => (catalog ? [...catalog.plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice) : []),
    [catalog],
  );
  // Backend has no "popular" flag, so we highlight the middle-priced tier as a
  // gentle default/anchor. Purely a frontend heuristic.
  const popularSlug = useMemo(
    () => (sortedPlans.length > 0 ? sortedPlans[Math.floor((sortedPlans.length - 1) / 2)].slug : ""),
    [sortedPlans],
  );

  const selectedPlanDetails = useMemo(
    () => catalog?.plans.find((plan) => plan.slug === selectedPlan) ?? null,
    [catalog, selectedPlan],
  );

  const currency = billingSummary?.currency ?? "USD";
  const availableBalance = billingSummary?.creditBalance ?? 0;
  const subtotal = isUpgradeMode && upgradePreview?.success ? upgradePreview.upgradeTotal : (selectedPlanDetails?.monthlyPrice ?? 0);
  const referralDiscountActive = !isUpgradeMode && !appliedCoupon && Boolean(referralDiscount?.eligible);
  const referralDiscountAmount = referralDiscountActive
    ? Math.round(subtotal * (referralDiscount?.percent ?? 0)) / 100
    : 0;
  const discount = !isUpgradeMode && appliedCoupon
    ? Math.min(appliedCoupon.discountAmount, subtotal)
    : referralDiscountAmount;
  const total = Math.max(subtotal - discount, 0);
  const willPayByCard = Boolean(selectedPlanDetails) && total > 0 && availableBalance < total;
  const canPurchase = isUpgradeMode
    ? Boolean(selectedPlan && upgradePreview?.success)
    : Boolean(selectedRegion && selectedPlan && billingSummary);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [cat, summary, refDiscount] = await Promise.all([
          getHostingCatalog(),
          session ? getBillingSummary(session) : Promise.resolve(null),
          session ? getAffiliateCheckoutDiscount(session).catch(() => null) : Promise.resolve(null),
        ]);
        if (!active) {
          return;
        }
        setReferralDiscount(refDiscount);

        setCatalog(cat);
        setBillingSummary(summary);

        // Smart defaults: default region + the highlighted (middle) plan.
        // In upgrade mode, lock to the current region and don't preselect a plan.
        if (isUpgradeMode && upgradeRegion) {
          setSelectedRegion(upgradeRegion);
        } else {
          const defaultRegion = cat.regions.find((region) => region.isDefault)?.slug ?? cat.regions[0]?.slug ?? "";
          setSelectedRegion((current) => current || defaultRegion);
        }
        if (!isUpgradeMode) {
          const plansByPrice = [...cat.plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
          const popular = plansByPrice[Math.floor((plansByPrice.length - 1) / 2)]?.slug ?? plansByPrice[0]?.slug ?? "";
          setSelectedPlan((current) => current || popular);
        }

        if (!session) {
          setError(t("Please sign in before purchasing a hosting subscription.", "Please sign in before purchasing a hosting subscription."));
        }
      } catch (err) {
        if (active) setError(t("Could not load your hosting catalog or account balance. Please try again later.", "Could not load your hosting catalog or account balance. Please try again later."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [session?.customerId, session?.token]);

  // Fetch upgrade proration preview when the target plan changes in upgrade mode.
  useEffect(() => {
    if (!isUpgradeMode || !upgradeScope || !selectedPlan) {
      setUpgradePreview(null);
      return;
    }
    const activeSession = getCustomerSession();
    if (!activeSession) return;
    let cancelled = false;
    void (async () => {
      try {
        const preview = await getUpgradePreview(activeSession, { currentScope: upgradeScope, newPlanSlug: selectedPlan });
        if (!cancelled) setUpgradePreview(preview);
      } catch {
        if (!cancelled) setUpgradePreview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isUpgradeMode, upgradeScope, selectedPlan]);

  // Re-validate an applied coupon when the plan (and therefore subtotal) changes,
  // since the discount amount depends on the subtotal.
  useEffect(() => {
    const activeSession = getCustomerSession();
    if (!appliedCoupon || !activeSession || !selectedPlanDetails) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await validateHostingCoupon(activeSession, {
          code: appliedCoupon.code,
          subtotal: selectedPlanDetails.monthlyPrice,
        });
        if (cancelled) return;
        if (result.success) {
          setAppliedCoupon({ code: appliedCoupon.code, discountAmount: result.discountAmount, message: result.message });
          setCouponError(null);
        } else {
          setAppliedCoupon(null);
          setCouponError(result.message || t("This coupon is no longer valid for the selected plan.", "This coupon is no longer valid for the selected plan."));
        }
      } catch {
        // Leave the previously applied coupon in place on transient errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan]);

  async function handleApplyCoupon() {
    const activeSession = getCustomerSession();
    const code = couponInput.trim().toUpperCase();
    if (!activeSession || !code || !selectedPlanDetails) return;

    setCouponBusy(true);
    setCouponError(null);
    try {
      const result = await validateHostingCoupon(activeSession, {
        code,
        subtotal: selectedPlanDetails.monthlyPrice,
      });
      if (result.success) {
        setAppliedCoupon({ code, discountAmount: result.discountAmount, message: result.message });
        setCouponInput(code);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message || t("Coupon is not valid for this purchase.", "Coupon is not valid for this purchase."));
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : t("Could not validate coupon.", "Could not validate coupon."));
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRegion || !selectedPlan) return;

    const activeSession = getCustomerSession();
    if (!activeSession) {
      setError(t("Your session has expired. Please sign in again.", "Your session has expired. Please sign in again."));
      return;
    }
    if (!billingSummary) {
      setError(t("We could not confirm your account balance. Please reload and try again.", "We could not confirm your account balance. Please reload and try again."));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let checkout;
      if (isUpgradeMode && upgradeScope) {
        checkout = await createUpgradeCheckout(activeSession, {
          currentScopeReference: upgradeScope,
          newPlanSlug: selectedPlan,
        });
      } else {
        checkout = await createHostingSubscriptionCheckout(activeSession, {
          planSlug: selectedPlan,
          regionSlug: selectedRegion,
          couponCode: appliedCoupon?.code,
        });
      }
      if (checkout.checkoutUrl) {
        if (checkout.subscriptionScopeReference) {
          sessionStorage.setItem("pendingSubscriptionScope", checkout.subscriptionScopeReference);
        }
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      const subscriptionId = checkout.subscriptionScopeReference ?? buildSubscriptionId(selectedPlan, selectedRegion);
      navigate(`/subscription/${subscriptionId}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : isUpgradeMode ? t("Upgrade failed.", "Upgrade failed.") : t("Purchase failed.", "Purchase failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const productSwitcher = !isUpgradeMode ? (
    <ProductTypeSwitcher
      active={productType}
      hostingLabel={t("Web Hosting", "Web Hosting")}
      hostingDescription={t("Managed website hosting with sites, databases, files, and domains.", "Managed website hosting with sites, databases, files, and domains.")}
      vpsLabel={t("VPS / Cloud", "VPS / Cloud")}
      vpsDescription={t("Unmanaged virtual servers delivered within 24 hours after payment.", "Unmanaged virtual servers delivered within 24 hours after payment.")}
    />
  ) : null;

  if (productType === "vps") {
    return (
      <div className="stack bs-wrapper--wide">
        {productSwitcher}
        <VpsPage />
      </div>
    );
  }

  if (loading) {
    return <div className="empty-panel">{t("Loading available regions and plans...", "Loading available regions and plans...")}</div>;
  }

  if (error && !catalog) {
    return <div className="inline-message inline-message--error">{error}</div>;
  }

  const noCatalog = !catalog || catalog.plans.length === 0 || catalog.regions.length === 0;

  return (
    <div className="stack bs-wrapper">
      {productSwitcher}
      <section className="page-hero">
        <p className="eyebrow">{t("Store", "Store")}</p>
        <h1>{isUpgradeMode ? t("Upgrade Your Plan", "Upgrade Your Plan") : t("Purchase Hosting Subscription", "Purchase Hosting Subscription")}</h1>
        <p className="page-copy">
          {isUpgradeMode
            ? t("Select your new plan below. You only pay the prorated difference for the remaining days in your current billing cycle.", "Select your new plan below. You only pay the prorated difference for the remaining days in your current billing cycle.")
            : t("Pick your region and plan. We use your account balance when it covers the price, otherwise you'll continue to secure card checkout — and your card is saved for automatic renewals.", "Pick your region and plan. We use your account balance when it covers the price, otherwise you'll continue to secure card checkout — and your card is saved for automatic renewals.")}
        </p>
      </section>

      {error ? <div className="inline-message inline-message--error">{error}</div> : null}

      {noCatalog ? (
        <div className="empty-panel">{t("No hosting plans are available right now. Please check back shortly.", "No hosting plans are available right now. Please check back shortly.")}</div>
      ) : (
        <form onSubmit={handlePurchase} className="stack">
          {/* Step 1 — Region (hidden in upgrade mode — locked to current region) */}
          {!isUpgradeMode ? <div className="card stack-sm">
            <div className="section-head">
              <h3 className="bs-head-icon">
                <Globe size={18} /> {t("1. Select Region", "1. Select Region")}
              </h3>
            </div>
            <div className="two-up-grid bs-region-grid">
              {catalog!.regions.map((region) => {
                const active = selectedRegion === region.slug;
                return (
                  <label
                    key={region.slug}
                    className={`bs-region-card${active ? " bs-region-card--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="region"
                      value={region.slug}
                      checked={active}
                      onChange={(event) => setSelectedRegion(event.target.value)}
                      className="bs-region-card__radio"
                    />
                    <div>
                      <h4 className="bs-region-card__name">{region.name}</h4>
                      <p className="muted bs-region-card__desc">
                        {t("{region} · {count} node(s) available", "{region} · {count} node(s) available").replace("{region}", region.slug.toUpperCase()).replace("{count}", String(region.availableNodeCount))}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div> : null}

          {/* Step 2 — Plan comparison cards */}
          <div
            className={`card stack-sm bs-plans-wrapper${!selectedRegion ? " bs-plans-wrapper--dimmed" : ""}`}
          >
            <div className="section-head">
              <h3 className="bs-head-icon">
                <Server size={18} /> {t("2. Select Plan", "2. Select Plan")}
              </h3>
            </div>
            <div
              className="bs-plans-grid"
            >
              {sortedPlans.map((plan) => {
                const isCurrent = isUpgradeMode && plan.slug === upgradePlanSlug;
                const isDowngrade = isUpgradeMode && upgradePlanSlug != null && plan.monthlyPrice <= (catalog?.plans.find((p) => p.slug === upgradePlanSlug)?.monthlyPrice ?? 0);
                return (
                  <PlanCard
                    key={plan.slug}
                    plan={plan}
                    currency={currency}
                    selected={selectedPlan === plan.slug}
                    popular={!isUpgradeMode && plan.slug === popularSlug}
                    isCurrent={isCurrent}
                    disabled={isCurrent || isDowngrade}
                    onSelect={() => setSelectedPlan(plan.slug)}
                  />
                );
              })}
            </div>
          </div>

          {/* Step 3 — Coupon */}
          <div className={`card stack-sm bs-coupon-wrapper${!selectedPlanDetails ? " bs-coupon-wrapper--dimmed" : ""}`}>
            <div className="section-head">
              <h3 className="bs-head-icon">
                <Tag size={18} /> {t("3. Coupon (optional)", "3. Coupon (optional)")}
              </h3>
            </div>
            {appliedCoupon ? (
              <div className="billing-list-row bs-coupon-applied-mt">
                <div className="bs-coupon-applied-row">
                  <Check size={16} color="var(--primary)" />
                  <strong>{appliedCoupon.code}</strong>
                  <span className="muted">−{formatCurrency(discount, currency)}</span>
                </div>
                <button type="button" className="text-button text-button--danger" onClick={removeCoupon}>
                  {t("Remove", "Remove")}
                </button>
              </div>
            ) : (
              <div className="bs-coupon-input-row">
                <input
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  placeholder={t("Enter coupon code", "Enter coupon code")}
                  className="bs-coupon-input"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleApplyCoupon();
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleApplyCoupon()}
                  disabled={couponBusy || !couponInput.trim() || !selectedPlanDetails}
                >
                  {couponBusy ? t("Checking...", "Checking...") : t("Apply", "Apply")}
                </button>
              </div>
            )}
            {couponError ? <div className="inline-message inline-message--error bs-coupon-msg">{couponError}</div> : null}
            {referralDiscountActive && selectedPlanDetails ? (
              <div className="inline-message inline-message--success bs-coupon-msg bs-referral-msg">
                <Gift size={16} />
                {t("Referral reward: {percent}% off your first order will be applied automatically at checkout.", "Referral reward: {percent}% off your first order will be applied automatically at checkout.")
                  .replace("{percent}", String(referralDiscount?.percent ?? 0))}
              </div>
            ) : null}
          </div>

          {/* Order summary */}
          <div className="card stack-sm">
            <div className="section-head">
              <h3>{isUpgradeMode ? t("Upgrade summary", "Upgrade summary") : t("Order summary", "Order summary")}</h3>
            </div>

            {isUpgradeMode && upgradePreview?.success && selectedPlanDetails ? (
              <div className="stack-sm bs-summary-section">
                <SummaryRow label={t("Current: {name}", "Current: {name}").replace("{name}", upgradePreview.oldPlanName)} value={`${formatCurrency(upgradePreview.oldMonthlyPrice, currency)}/mo`} />
                <SummaryRow label={t("New: {name}", "New: {name}").replace("{name}", upgradePreview.newPlanName)} value={`${formatCurrency(upgradePreview.newMonthlyPrice, currency)}/mo`} />
                <SummaryRow label={t("Remaining in cycle", "Remaining in cycle")} value={t("{remaining} of {total} days", "{remaining} of {total} days").replace("{remaining}", String(upgradePreview.remainingDays)).replace("{total}", String(upgradePreview.totalDays))} />
                <SummaryRow label={t("Credit for unused {name}", "Credit for unused {name}").replace("{name}", upgradePreview.oldPlanName)} value={`−${formatCurrency(upgradePreview.prorationCredit, currency)}`} tone="positive" />
                <SummaryRow label={t("{name} for {days} days", "{name} for {days} days").replace("{name}", upgradePreview.newPlanName).replace("{days}", String(upgradePreview.remainingDays))} value={formatCurrency(upgradePreview.prorationCharge, currency)} />
                <div className="bs-divider" />
                <SummaryRow label={t("Upgrade cost", "Upgrade cost")} value={formatCurrency(upgradePreview.upgradeTotal, currency)} strong />
                <div className="bs-payment-info">
                  <span className="muted bs-payment-info__text">
                    {willPayByCard ? t("Paid by card", "Paid by card") : t("Paid from account balance", "Paid from account balance")}
                  </span>
                  <span className={`badge ${willPayByCard ? "" : "badge--success"}`}>
                    {willPayByCard ? t("Card checkout", "Card checkout") : t("Account balance", "Account balance")}
                  </span>
                </div>
                <p className="muted bs-balance-note">
                  {t("Your next renewal date stays the same. Future renewals will be at the new plan rate.", "Your next renewal date stays the same. Future renewals will be at the new plan rate.")}
                </p>
              </div>
            ) : isUpgradeMode && selectedPlan && !upgradePreview?.success ? (
              <p className="muted bs-placeholder-text">{upgradePreview?.message || t("Select a plan above to see upgrade pricing.", "Select a plan above to see upgrade pricing.")}</p>
            ) : selectedPlanDetails && !isUpgradeMode ? (
              <div className="stack-sm bs-summary-section">
                <SummaryRow label={t("{name} · monthly", "{name} · monthly").replace("{name}", selectedPlanDetails.name)} value={formatCurrency(selectedPlanDetails.monthlyPrice, currency)} />
                {discount > 0 ? (
                  <SummaryRow
                    label={appliedCoupon
                      ? t("Coupon {code}", "Coupon {code}").replace("{code}", appliedCoupon.code)
                      : t("Referral discount ({percent}%)", "Referral discount ({percent}%)").replace("{percent}", String(referralDiscount?.percent ?? 0))}
                    value={`−${formatCurrency(discount, currency)}`}
                    tone="positive"
                  />
                ) : null}
                <div className="bs-divider" />
                <SummaryRow label={t("Total due today", "Total due today")} value={formatCurrency(total, currency)} strong />
                <div className="bs-payment-info">
                  <span className="muted bs-payment-info__text">
                    {willPayByCard ? t("Paid by card · saved for automatic renewals", "Paid by card · saved for automatic renewals") : t("Paid from account balance", "Paid from account balance")}
                  </span>
                  <span className={`badge ${willPayByCard ? "" : "badge--success"}`}>
                    {willPayByCard ? t("Card checkout", "Card checkout") : t("Account balance", "Account balance")}
                  </span>
                </div>
                <p className="muted bs-balance-note">
                  {t("Available balance: {balance} · Renews monthly at {total}.", "Available balance: {balance} · Renews monthly at {total}.").replace("{balance}", formatCurrency(availableBalance, currency)).replace("{total}", formatCurrency(total, currency))}
                </p>
              </div>
            ) : (
              <p className="muted bs-placeholder-text">{t("Choose a plan to see your total.", "Choose a plan to see your total.")}</p>
            )}

            <div className="bs-btn-row">
              <button
                type="submit"
                className="primary-button bs-submit-btn"
                disabled={!canPurchase || isSubmitting}
              >
                {isSubmitting
                  ? t("Processing...", "Processing...")
                  : isUpgradeMode && upgradePreview?.success
                    ? t("Upgrade for {amount}", "Upgrade for {amount}").replace("{amount}", formatCurrency(upgradePreview.upgradeTotal, currency))
                    : willPayByCard
                      ? t("Continue to card checkout", "Continue to card checkout")
                      : t("Purchase with account balance", "Purchase with account balance")}{" "}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function ProductTypeSwitcher({
  active,
  hostingLabel,
  hostingDescription,
  vpsLabel,
  vpsDescription,
}: {
  active: "hosting" | "vps";
  hostingLabel: string;
  hostingDescription: string;
  vpsLabel: string;
  vpsDescription: string;
}) {
  const products = [
    { id: "hosting" as const, to: "/buy", icon: Globe, label: hostingLabel, description: hostingDescription },
    { id: "vps" as const, to: "/buy?type=vps", icon: Server, label: vpsLabel, description: vpsDescription },
  ];

  return (
    <nav className="product-tabs" aria-label="Subscription product type">
      <span className="product-tabs__label">Services</span>
      <div className="product-tabs__list">
        {products.map((product) => {
          const Icon = product.icon;
          const selected = active === product.id;
          return (
            <Link
              key={product.id}
              to={product.to}
              aria-current={selected ? "page" : undefined}
              className={`product-tab${selected ? " product-tab--active" : ""}`}
            >
              <span className="product-tab__icon">
                <Icon size={21} />
              </span>
              <span className="product-tab__copy"><strong>{product.label}</strong><span>{product.description}</span></span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PlanCard({
  plan,
  currency,
  selected,
  popular,
  isCurrent,
  disabled,
  onSelect,
}: {
  plan: HostingPlanDefinition;
  currency: string;
  selected: boolean;
  popular: boolean;
  isCurrent?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { t } = useLocalization();
  return (
    <label
      className={`bs-plan-card${selected ? " bs-plan-card--selected" : ""}${disabled ? " bs-plan-card--disabled" : ""}`}
    >
      <input
        type="radio"
        name="plan"
        value={plan.slug}
        checked={selected}
        onChange={onSelect}
        className="bs-plan-card__radio"
      />
      {isCurrent ? (
        <span className="badge bs-plan-card__badge">
          {t("Current plan", "Current plan")}
        </span>
      ) : popular ? (
        <span className="badge badge--success bs-plan-card__badge">
          <Sparkles size={12} /> {t("Most popular", "Most popular")}
        </span>
      ) : null}
      <div className="bs-plan-card__header">
        <h4 className="bs-plan-card__name">{plan.name}</h4>
        {selected ? <Check size={18} color="var(--primary)" /> : null}
      </div>
      <div className="bs-plan-card__price">
        {formatCurrency(plan.monthlyPrice, currency)}
        <span className="bs-plan-card__price-unit"> /mo</span>
      </div>
      {plan.description ? (
        <p className="muted bs-plan-card__desc">{t(plan.description, plan.description)}</p>
      ) : null}
      <div className="stack-sm bs-plan-card__specs">
        <SpecRow icon={<Layers size={14} />} text={t("Up to {count} site(s)", "Up to {count} site(s)").replace("{count}", String(plan.recommendedSiteLimit))} />
        <SpecRow icon={<HardDrive size={14} />} text={t("{size} disk", "{size} disk").replace("{size}", formatStorage(plan.diskLimitMb))} />
        <SpecRow icon={<FileText size={14} />} text={t("{count} files", "{count} files").replace("{count}", plan.fileLimitCount.toLocaleString(getActiveLocale()))} />
        <SpecRow icon={<Database size={14} />} text={t("Up to {count} database(s)", "Up to {count} database(s)").replace("{count}", String(plan.recommendedDatabaseLimit))} />
        <SpecRow icon={<Cpu size={14} />} text={plan.nodeType} />
      </div>
    </label>
  );
}

function SpecRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bs-spec-row">
      <span className="bs-spec-row__icon">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "positive";
}) {
  return (
    <div className="bs-summary-row">
      <span className={strong ? "bs-summary-row__label--strong" : "muted bs-summary-row__label"}>
        {label}
      </span>
      <span className={`bs-summary-row__value${strong ? " bs-summary-row__value--strong" : ""}${tone === "positive" ? " bs-summary-row__value--positive" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function formatStorage(mb: number) {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}
