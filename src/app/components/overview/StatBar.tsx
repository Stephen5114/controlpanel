import { Globe, Database, HardDrive, Wifi } from "lucide-react";
import { useLocalization } from "../../lib/i18n";
import type { SubscriptionOverviewResponse } from "../../lib/customer-api";
import { formatBytes } from "./utils";

interface StatBarProps {
  overview: SubscriptionOverviewResponse;
}

export function StatBar({ overview }: StatBarProps) {
  const { t } = useLocalization();
  const { subscription } = overview;
  const storageUsedGb = formatBytes(subscription.storageUsedBytes, "gb");
  const bandwidthTb = formatBytes(subscription.monthlyBandwidthBytes, "tb");
  const storagePercent = subscription.diskQuotaMb > 0
    ? Math.min((subscription.storageUsedBytes / (subscription.diskQuotaMb * 1024 * 1024)) * 100, 100)
    : 0;

  return (
    <section className="ov-stats">
      <div className="ov-stat">
        <div className="ov-stat__icon ov-stat__icon--blue"><Globe size={18} /></div>
        <div className="ov-stat__body">
          <span className="ov-stat__value">{subscription.usedSites}<span className="ov-stat__cap">/{subscription.siteQuota}</span></span>
          <span className="ov-stat__label">{t("Websites", "Websites")}</span>
        </div>
      </div>
      <div className="ov-stat__divider" />
      <div className="ov-stat">
        <div className="ov-stat__icon ov-stat__icon--green"><Database size={18} /></div>
        <div className="ov-stat__body">
          <span className="ov-stat__value">{subscription.usedDatabases}<span className="ov-stat__cap">/{subscription.databaseQuota}</span></span>
          <span className="ov-stat__label">{t("Databases", "Databases")}</span>
        </div>
      </div>
      <div className="ov-stat__divider" />
      <div className="ov-stat">
        <div className="ov-stat__icon ov-stat__icon--slate"><HardDrive size={18} /></div>
        <div className="ov-stat__body">
          <span className="ov-stat__value">{storageUsedGb}<span className="ov-stat__cap">/{(subscription.diskQuotaMb / 1024).toFixed(0)} GB</span></span>
          <span className="ov-stat__label">{t("Storage", "Storage")}</span>
        </div>
        <div className="ov-stat__bar">
          <div className="ov-stat__bar-fill" style={{ width: `${storagePercent}%` }} />
        </div>
      </div>
      <div className="ov-stat__divider" />
      <div className="ov-stat">
        <div className="ov-stat__icon ov-stat__icon--amber"><Wifi size={18} /></div>
        <div className="ov-stat__body">
          <span className="ov-stat__value">{t("Unlimited", "Unlimited")}</span>
          <span className="ov-stat__label">{t("Bandwidth", "Bandwidth")}</span>
        </div>
      </div>
    </section>
  );
}
