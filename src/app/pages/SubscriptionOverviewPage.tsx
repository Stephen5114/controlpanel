import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { driver, type DriveStep } from "driver.js";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLocalization } from "../lib/i18n";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  HardDrive,
  HelpCircle,
  Loader2,
  Plus,
  Rocket,
  Server,
  Settings,
  Shield,
  Trash2,
  Wifi,
  Wrench,
  X,
  Terminal,
  Cpu,
  Lock,
  RefreshCw,
  Pause,
  Play,
  Key,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  changeSiteFtpPassword,
  createHostedDatabase,
  createSubscriptionSite,
  deleteHostedSite,
  downloadPublishProfile,
  getDeployLog,
  getStackCatalog,
  getSubscriptionOverview,
  publishSite,
  saveGitConfig,
  triggerGitDeploy,
  updateSiteStack,
  type HostedDatabase,
  type StackCatalogEntry,
  type SubscriptionOverviewResponse,
  type SubscriptionWebsite,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { formatRegionLabel } from "../lib/display";

// ── Node.js deploy guide ─────────────────────────────────────────────────────
function NodeDeployGuide() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { t } = useLocalization();

  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 4200);
    return () => clearInterval(t);
  }, [isPaused]);

  const tabs = [
    t("1  Upload Files", "1  Upload Files"),
    t("2  Click Publish", "2  Click Publish"),
    t("3  App is Live", "3  App is Live")
  ];

  const infos: Array<{ title: string; accent: string; bullets: string[] }> = [
    {
      title: t("Upload project files via FTP", "Upload project files via FTP"),
      accent: "#2563eb",
      bullets: [
        t("Connect your FTP client to the host shown below", "Connect your FTP client to the host shown below"),
        t("Upload all project files including package.json", "Upload all project files including package.json"),
        t("Do NOT upload node_modules — server installs them", "Do NOT upload node_modules — server installs them"),
      ],
    },
    {
      title: t('Click "Publish now" below', 'Click "Publish now" below'),
      accent: "#d97706",
      bullets: [
        t('Click the "Publish now" button at the bottom', 'Click the "Publish now" button at the bottom'),
        t("Server automatically runs npm install for you", "Server automatically runs npm install for you"),
        t("web.config is generated and the app pool starts", "web.config is generated and the app pool starts"),
      ],
    },
    {
      title: t("Your Node.js app is live", "Your Node.js app is live"),
      accent: "#059669",
      bullets: [
        t("App starts and begins accepting traffic", "App starts and begins accepting traffic"),
        t("Always use process.env.PORT for the server port", "Always use process.env.PORT for the server port"),
        t("Visit your domain to confirm it is running", "Visit your domain to confirm it is running"),
      ],
    },
  ];

  const ndgStyle = {
    borderColor: `${infos[step].accent}40`,
    borderLeftColor: infos[step].accent,
    "--ndg-accent": infos[step].accent,
  } as React.CSSProperties;

  return (
    <div className="ndg" style={ndgStyle}>
      {/* Tab nav */}
      <div className="ndg__tabs" role="tablist">
        {tabs.map((label, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={step === i}
            className={`ndg__tab ${step === i ? "ndg__tab--active" : ""}`}
            style={step === i ? {
              color: infos[i].accent,
              borderBottomColor: infos[i].accent,
            } : undefined}
            onClick={() => setStep(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="ndg__body" key={step}>
        {/* SVG animation */}
        <div className="ndg__vis">
          {step === 0 && (
            <svg viewBox="0 0 120 100" className="ndg__svg" aria-hidden="true">
              <defs>
                <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Local Folder Icon */}
              <g transform="translate(10, 24)">
                {/* Folder Back */}
                <path d="M2,8 L12,8 L15,12 L30,12 A2,2 0 0,1 32,14 L32,32 A2,2 0 0,1 30,34 L2,34 A2,2 0 0,1 0,32 L0,10 A2,2 0 0,1 2,8 Z" fill="url(#folderGrad)" opacity="0.85" />
                {/* Document peaking out */}
                <rect x="6" y="2" width="16" height="16" rx="1.5" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" className="ndg-doc-peek" />
                <line x1="9" y1="6" x2="19" y2="6" stroke="#93c5fd" strokeWidth="1" />
                <line x1="9" y1="10" x2="16" y2="10" stroke="#93c5fd" strokeWidth="1" />
                {/* Folder Front */}
                <path d="M0,14 L32,14 L30,34 L0,34 Z" fill="url(#folderGrad)" />
              </g>

              {/* Server Rack (Right side) */}
              <g transform="translate(74, 18)">
                <rect x="0" y="0" width="36" height="54" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                {/* Ventilation Accent */}
                <rect x="4" y="4" width="28" height="2" rx="1" fill="#475569" />
                
                {/* Blade 1 */}
                <rect x="3" y="10" width="30" height="10" rx="2" fill="url(#bladeGrad)" stroke="#334155" strokeWidth="1" />
                <circle cx="8" cy="15" r="1.5" fill="#10b981" className="ndg-led-blink" />
                <circle cx="13" cy="15" r="1" fill="#64748b" />
                <line x1="17" y1="15" x2="27" y2="15" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />

                {/* Blade 2 */}
                <rect x="3" y="24" width="30" height="10" rx="2" fill="url(#bladeGrad)" stroke="#334155" strokeWidth="1" />
                <circle cx="8" cy="29" r="1.5" fill="#10b981" className="ndg-led-blink" style={{ animationDelay: "0.5s" }} />
                <circle cx="13" cy="29" r="1" fill="#64748b" />
                <line x1="17" y1="29" x2="27" y2="29" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />

                {/* Blade 3 */}
                <rect x="3" y="38" width="30" height="10" rx="2" fill="url(#bladeGrad)" stroke="#334155" strokeWidth="1" />
                <circle cx="8" cy="43" r="1.5" fill="#3b82f6" className="ndg-led-blink" style={{ animationDelay: "1s" }} />
                <circle cx="13" cy="43" r="1.5" fill="#ef4444" className="ndg-led-blink" style={{ animationDelay: "0.2s" }} />
                <line x1="17" y1="43" x2="27" y2="43" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
              </g>

              {/* Connection Dotted Line */}
              <path d="M 40 42 L 74 36" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* File Packets */}
              <g className="ndg-packet-1">
                <circle cx="0" cy="0" r="2.5" fill="#60a5fa" />
                <circle cx="0" cy="0" r="1" fill="#ffffff" />
              </g>
              <g className="ndg-packet-2">
                <circle cx="0" cy="0" r="2.5" fill="#3b82f6" />
                <circle cx="0" cy="0" r="1" fill="#ffffff" />
              </g>
            </svg>
          )}

          {step === 1 && (
            <svg viewBox="0 0 120 100" className="ndg__svg" aria-hidden="true">
              {/* Terminal Frame */}
              <rect x="8" y="10" width="104" height="80" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              
              {/* Terminal Header */}
              <path d="M8 16 A 6 6 0 0 1 14 10 L 106 10 A 6 6 0 0 1 112 16 L 112 24 L 8 24 Z" fill="#1e293b" />
              
              {/* Header Dots */}
              <circle cx="16" cy="17" r="2.5" fill="#ef4444" />
              <circle cx="23" cy="17" r="2.5" fill="#f59e0b" />
              <circle cx="30" cy="17" r="2.5" fill="#10b981" />
              <text x="60" y="18" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">bash</text>

              {/* Text Output lines */}
              <g className="ndg-term-line-1">
                <text x="14" y="36" fill="#f8fafc" fontSize="6.5" fontFamily="monospace">
                  <tspan fill="#34d399">$ </tspan>
                  <tspan fill="#60a5fa">npm </tspan>
                  run publish
                </text>
              </g>

              <g className="ndg-term-line-2">
                <text x="14" y="48" fill="#94a3b8" fontSize="5.5" fontFamily="monospace">
                  &gt; building production...
                </text>
                <g transform="translate(96, 46.5)">
                  <g className="ndg-spinner-grp">
                    <circle cx="0" cy="0" r="2.5" fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
                  </g>
                </g>
              </g>

              <g className="ndg-term-line-3">
                <text x="14" y="60" fill="#38bdf8" fontSize="5.5" fontFamily="monospace">
                  ▲ deploying to IIS server
                </text>
              </g>

              <g className="ndg-term-line-4">
                <text x="14" y="72" fill="#34d399" fontSize="6" fontFamily="monospace" fontWeight="bold">
                  ✓ publish successful!
                </text>
              </g>

              {/* Terminal Blinking Cursor */}
              <rect x="0" y="0" width="3.5" height="6" fill="#3b82f6" className="ndg-terminal-cursor" />
            </svg>
          )}

          {step === 2 && (
            <svg viewBox="0 0 120 100" className="ndg__svg" aria-hidden="true">
              <defs>
                <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="liveBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>

              {/* Browser Mockup */}
              <g className="ndg-browser-window">
                <rect x="6" y="12" width="108" height="76" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                <path d="M6 18 A 6 6 0 0 1 12 12 L 108 12 A 6 6 0 0 1 114 18 L 114 26 L 6 26 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                
                <circle cx="13" cy="19" r="2" fill="#ff5f56" />
                <circle cx="19" cy="19" r="2" fill="#ffbd2e" />
                <circle cx="25" cy="19" r="2" fill="#27c93f" />

                <rect x="33" y="16" width="68" height="6" rx="3" fill="#e2e8f0" />
                <text x="67" y="21.5" fill="#64748b" fontSize="4.2" fontFamily="sans-serif" textAnchor="middle">your-app.code0xff.shop</text>
                
                {/* Content Success check */}
                <circle cx="60" cy="46" r="11" fill="#d1fae5" />
                <circle cx="60" cy="46" r="8" fill="url(#successGrad)" />
                <path d="M57 46 L59 48 L63 43" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" className="ndg-check-live" />

                {/* Celebration Sparkles */}
                <g className="ndg-sparkles">
                  <path d="M42,38 L43,40 L45,41 L43,42 L42,44 L41,42 L39,41 L41,40 Z" fill="#fbbf24" />
                  <path d="M78,36 L79,38 L81,39 L79,40 L78,42 L77,40 L75,39 L77,38 Z" fill="#fbbf24" />
                  <path d="M44,60 L45,61.5 L46.5,62 L45,62.5 L44,64 L43,62.5 L41.5,62 L43,61.5 Z" fill="#60a5fa" />
                  <path d="M76,58 L77,59.5 L78.5,60 L77,60.5 L76,62 L75,60.5 L73.5,60 L75,59.5 Z" fill="#60a5fa" />
                </g>

                <text x="60" y="68" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">App is Live!</text>
                <text x="60" y="76" fill="#64748b" fontSize="4.8" fontFamily="sans-serif" textAnchor="middle">Successfully deployed</text>
              </g>

              {/* LIVE Badge */}
              <g className="ndg-live-badge-wrapper">
                <rect x="0" y="0" width="28" height="11" rx="5.5" fill="url(#liveBadgeGrad)" />
                <circle cx="5" cy="5.5" r="1.5" fill="#ffffff" className="ndg-live-dot" />
                <text x="17" y="7.5" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">LIVE</text>
              </g>
            </svg>
          )}
        </div>

        {/* Text info */}
        <div className="ndg__info">
          <strong className="ndg__info-title" style={{ color: infos[step].accent }}>
            {infos[step].title}
          </strong>
          <ul className="ndg__bullets">
            {infos[step].bullets.map((b, i) => (
              <li key={i} className="ndg__bullet" style={{ animationDelay: `${i * 0.1}s` }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ndg__track">
        <div
          className="ndg__bar"
          key={`bar-${step}`}
          style={{
            background: infos[step].accent,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>

      {/* Dot navigation */}
      <div className="ndg__dots" style={{ alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            className={`ndg__dot ${step === i ? "ndg__dot--active" : ""}`}
            style={step === i ? { background: infos[step].accent } : undefined}
            onClick={() => {
              setStep(i);
              setIsPaused(true);
            }}
            aria-label={`Step ${i + 1}`}
          />
        ))}
        <button
          type="button"
          className="ndg__pause-btn"
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? "Play autoplay" : "Pause autoplay"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            marginLeft: "6px",
            color: infos[step].accent,
            transition: "color 0.3s ease, transform 0.2s ease",
          }}
        >
          {isPaused ? <Play size={10} strokeWidth={3} /> : <Pause size={10} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

type DisplayWebsite = SubscriptionWebsite & {
  isOptimistic?: boolean;
};

type DisplayDatabase = HostedDatabase & {
  isOptimistic?: boolean;
};

function isInFlightStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "pending" || normalized === "creating" || normalized === "deleting";
}

function isHealthyStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "active" || normalized === "succeeded" || normalized === "online";
}

function getStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "creating") return "Creating...";
  if (normalized === "pending") return "Pending...";
  if (normalized === "deleting") return "Deleting...";
  if (normalized === "succeeded" || normalized === "active") return "Active";
  if (normalized === "online") return "Online";
  if (normalized === "offline") return "Offline";
  return status;
}

function formatBytes(value: number, unit: "gb" | "tb") {
  const divisor = unit === "gb" ? 1024 ** 3 : 1024 ** 4;
  return (value / divisor).toFixed(1);
}

function formatMemory(value: number) {
  return `${(value / (1024 ** 3)).toFixed(1)} GB`;
}

function getAlertIcon(severity: string) {
  return severity.toLowerCase() === "critical" ? AlertTriangle : Wrench;
}

function getStackLabel(site: SubscriptionWebsite, catalog: StackCatalogEntry[]): string {
  if (!site.stack || site.stack === "static") {
    return "Unconfigured";
  }
  const entry = catalog.find((c) => c.slug === site.stack);
  const baseName = entry?.name ?? site.stack;
  return site.stackVersion ? `${baseName} ${site.stackVersion}` : baseName;
}

function isSiteStackConfigured(site: SubscriptionWebsite): boolean {
  return !!site.stack && site.stack !== "static";
}

function getAvailableStacks(catalog: StackCatalogEntry[]): StackCatalogEntry[] {
  return catalog.filter((entry) => entry.status === "available" && entry.slug !== "static");
}

function guessEntryDll(site: SubscriptionWebsite): string {
  const message = site.runtimeMessage ?? "";
  const match = message.match(/([A-Za-z0-9_.\-]+\.dll)/);
  if (match?.[1]) return match[1];
  const base = (site.siteName || site.domain.split(".")[0] || "app").replace(/[^A-Za-z0-9_.-]/g, "");
  return `${base || "app"}.dll`;
}

function canPublishSite(site: SubscriptionWebsite, availableStacks: StackCatalogEntry[]): boolean {
  if (site.hasActivePublishJob || site.hasActiveRuntimeJob) return false;
  const status = site.provisioningStatus?.toLowerCase();
  if (status === "pending" || status === "creating" || status === "deleting" || status === "failed") return false;
  const publishableStacks = ["dotnet", "node"];
  if (isSiteStackConfigured(site)) return publishableStacks.includes(site.stack);
  return availableStacks.some((s) => publishableStacks.includes(s.slug));
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString();
  } catch {
    return value;
  }
}

export function SubscriptionOverviewPage() {
  const { t } = useLocalization();
  const { subId } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SubscriptionOverviewResponse | null>(null);
  const [sites, setSites] = useState<DisplayWebsite[]>([]);
  const [databases, setDatabases] = useState<DisplayDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [newSiteAlias, setNewSiteAlias] = useState("");
  const [isProvisioningSite, setIsProvisioningSite] = useState(false);
  const [siteProvisionError, setSiteProvisionError] = useState<string | null>(null);

  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [isDbProvisioning, setIsDbProvisioning] = useState(false);
  const [dbProvisionError, setDbProvisionError] = useState<string | null>(null);

  const [stackCatalog, setStackCatalog] = useState<StackCatalogEntry[]>([]);
  const [ftpTarget, setFtpTarget] = useState<SubscriptionWebsite | null>(null);
  const [ftpPasswordVisible, setFtpPasswordVisible] = useState(false);
  const [ftpCopied, setFtpCopied] = useState<string | null>(null);
  const [ftpChangePwMode, setFtpChangePwMode] = useState(false);
  const [ftpNewPassword, setFtpNewPassword] = useState("");
  const [ftpConfirmPassword, setFtpConfirmPassword] = useState("");
  const [ftpChanging, setFtpChanging] = useState(false);
  const [ftpChangeError, setFtpChangeError] = useState<string | null>(null);
  const [ftpChangeSuccess, setFtpChangeSuccess] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<SubscriptionWebsite | null>(null);
  const [publishPhase, setPublishPhase] = useState<"select-stack" | "publish">("publish");
  const [publishStackChoice, setPublishStackChoice] = useState<string>("dotnet");
  const [publishVersionChoice, setPublishVersionChoice] = useState<string>("10.0");
  const [entryDllInput, setEntryDllInput] = useState<string>("");
  const [startupCommandInput, setStartupCommandInput] = useState<string>("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishInfo, setPublishInfo] = useState<string | null>(null);
  const [isSubmittingStack, setIsSubmittingStack] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);
  const [deployMode, setDeployMode] = useState<"git" | "ftp">("git");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [gitPat, setGitPat] = useState("");
  const [isSavingGitConfig, setIsSavingGitConfig] = useState(false);
  const [gitConfigError, setGitConfigError] = useState<string | null>(null);
  const [gitConfigSaved, setGitConfigSaved] = useState(false);
  const [deployLog, setDeployLog] = useState<string | null>(null);
  const [isDeployingFromGit, setIsDeployingFromGit] = useState(false);
  const [deployLogRef_] = useState({ current: null as HTMLPreElement | null });

  useEffect(() => {
    const handler = () => setIsSiteModalOpen(true);
    window.addEventListener("al:open-add-site-modal", handler);
    return () => window.removeEventListener("al:open-add-site-modal", handler);
  }, []);

  useEffect(() => {
    let active = true;
    getStackCatalog()
      .then((response) => {
        if (active) setStackCatalog(response.stacks);
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId) {
      setLoading(false);
      return;
    }

    let active = true;
    async function load() {
      try {
        if (!refreshTick) {
          setLoading(true);
        }
        setError(null);

        const nextOverview = await getSubscriptionOverview(session!, subId!);
        if (!active) return;

        const optimisticSites = sites.filter((site) => site.isOptimistic);
        const mergedSites: DisplayWebsite[] = [...nextOverview.websites];
        for (const optimisticSite of optimisticSites) {
          const matchIndex = mergedSites.findIndex((site) => site.domain === optimisticSite.domain);
          if (matchIndex >= 0) {
            const backendStatus = mergedSites[matchIndex].provisioningStatus;
            mergedSites[matchIndex] = {
              ...mergedSites[matchIndex],
              provisioningStatus: isInFlightStatus(backendStatus) ? "creating" : backendStatus,
              isOptimistic: isInFlightStatus(backendStatus),
            };
          } else {
            mergedSites.unshift(optimisticSite);
          }
        }

        const optimisticDbs = databases.filter((database) => database.isOptimistic);
        const mergedDbs: DisplayDatabase[] = [...nextOverview.databases];
        for (const optimisticDb of optimisticDbs) {
          const matchIndex = mergedDbs.findIndex((database) => database.databaseName === optimisticDb.databaseName);
          if (matchIndex >= 0) {
            const backendStatus = mergedDbs[matchIndex].provisioningStatus;
            mergedDbs[matchIndex] = {
              ...mergedDbs[matchIndex],
              provisioningStatus: isInFlightStatus(backendStatus) ? "creating" : backendStatus,
              isOptimistic: isInFlightStatus(backendStatus),
            };
          } else {
            mergedDbs.unshift(optimisticDb);
          }
        }

        setOverview(nextOverview);
        setSites(mergedSites);
        setDatabases(mergedDbs);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load subscription overview.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [subId, refreshTick]);

  const hasInFlightWork = useMemo(
    () => sites.some((site) =>
        isInFlightStatus(site.provisioningStatus)
        || site.hasActivePublishJob
        || site.hasActiveRuntimeJob) ||
      databases.some((database) => isInFlightStatus(database.provisioningStatus)),
    [sites, databases],
  );

  useEffect(() => {
    if (!hasInFlightWork) return;
    const intervalId = window.setInterval(() => setRefreshTick((tick) => tick + 1), 3000);
    return () => window.clearInterval(intervalId);
  }, [hasInFlightWork]);

  useEffect(() => {
    if (!publishTarget?.hasActivePublishJob || !subId) return;
    const session = getCustomerSession();
    if (!session) return;
    const intervalId = window.setInterval(async () => {
      try {
        const result = await getDeployLog(session, subId, publishTarget.id);
        if (result.success && result.data?.logText) {
          setDeployLog(result.data.logText);
        }
      } catch { /* swallow */ }
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [publishTarget?.hasActivePublishJob, publishTarget?.id, subId]);

  const availableStacks = useMemo(() => getAvailableStacks(stackCatalog), [stackCatalog]);
  const onlyOneStack = availableStacks.length === 1;

  useEffect(() => {
    if (!publishTarget) return;
    const fresh = sites.find((s) => s.id === publishTarget.id);
    if (!fresh) return;
    const keys: Array<keyof SubscriptionWebsite> = [
      "stack",
      "stackVersion",
      "runtimeStatus",
      "runtimeMessage",
      "runtimeReadyUtc",
      "lastPublishedUtc",
      "lastPublishStatus",
      "lastPublishMessage",
      "hasActivePublishJob",
      "hasActiveRuntimeJob",
      "provisioningStatus",
    ];
    const changed = keys.some((key) => publishTarget[key] !== fresh[key]);
    if (changed) {
      setPublishTarget(fresh);
    }
  }, [sites, publishTarget]);

  // Driver.js guided tour
  const guideStorageKey = subId ? `ov-guide:v1:${subId}` : null;

  const startOverviewTour = useCallback(() => {
    const hasSites = sites.length > 0;
    const steps: DriveStep[] = [
      {
        element: ".ov-header__actions",
        popover: {
          title: "Create a website",
          description: "Click \"Add Website\" to create your first site. Give it a name and we'll provision it with a free subdomain automatically.",
        },
      },
      {
        element: ".ov-stats",
        popover: {
          title: "Resource usage",
          description: "Track your websites, databases, storage, and bandwidth quotas at a glance.",
        },
      },
    ];

    if (hasSites) {
      steps.push(
        {
          element: ".ov-site-card .ov-btn--primary",
          popover: {
            title: "Deploy your site",
            description: "Click the Deploy button to publish your code. You can upload files via the file manager or connect a Git repository.",
          },
        },
        {
          element: ".ov-site-card .ov-icon-btn[title='Domains']",
          popover: {
            title: "Add a custom domain",
            description: "Click the globe icon to bind your own domain name (e.g. example.com). We'll guide you through the DNS setup.",
          },
        },
      );
    }

    steps.push({
      element: ".ov-info-row",
      popover: {
        title: "Server & plan info",
        description: "View your server status, hosting plan details, and security configuration here.",
        onPopoverRender: (popover: { wrapper: HTMLElement }) => {
          const btn = document.createElement("button");
          btn.textContent = "Don't show again";
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
    });

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.55)",
      steps,
    });

    driverObj.drive();
  }, [guideStorageKey, sites.length]);

  useEffect(() => {
    if (!guideStorageKey || loading) return;
    const isDismissed = window.localStorage.getItem(guideStorageKey) === "dismissed";
    if (isDismissed) return;
    const timeout = window.setTimeout(() => startOverviewTour(), 500);
    return () => window.clearTimeout(timeout);
  }, [guideStorageKey, loading, startOverviewTour]);

  if (loading) return <div className="empty-panel">Loading subscription data...</div>;
  if (error) return <div className="inline-message inline-message--error">{error}</div>;
  if (!overview) return <div className="inline-message inline-message--error">Subscription not found.</div>;

  const { subscription, node, security } = overview;
  const regionLabel = formatRegionLabel(subscription.regionSlug);
  const nodeLabel = node?.nodeName ?? "No active node assigned";
  const uptime = node?.uptimePercent == null
    ? getStatusLabel(node?.status ?? "unknown")
    : `${node.uptimePercent.toFixed(2)}%`;
  const storageUsedGb = formatBytes(subscription.storageUsedBytes, "gb");
  const bandwidthTb = formatBytes(subscription.monthlyBandwidthBytes, "tb");
  const databaseHealthyCount = databases.filter((database) => isHealthyStatus(database.provisioningStatus)).length;

  const openSiteDetails = (siteId: string) => {
    navigate(`/subscription/${subscription.id}/site/${siteId}/settings`);
  };

  const openSiteFiles = (siteId: string) => {
    navigate(`/subscription/${subscription.id}/files?siteId=${encodeURIComponent(siteId)}`);
  };

  const openFtpCredentials = (site: SubscriptionWebsite) => {
    setFtpTarget(site);
    setFtpPasswordVisible(false);
    setFtpCopied(null);
    setFtpChangePwMode(false);
    setFtpNewPassword("");
    setFtpConfirmPassword("");
    setFtpChangeError(null);
    setFtpChangeSuccess(null);
  };

  const handleFtpCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFtpCopied(key);
      window.setTimeout(() => setFtpCopied((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleFtpPasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    const session = getCustomerSession();
    if (!ftpTarget || !session || !subId) return;
    setFtpChangeError(null);
    setFtpChangeSuccess(null);
    if (ftpNewPassword !== ftpConfirmPassword) {
      setFtpChangeError("Passwords do not match.");
      return;
    }
    if (ftpNewPassword.length < 12) {
      setFtpChangeError("Password must be at least 12 characters.");
      return;
    }
    setFtpChanging(true);
    try {
      const result = await changeSiteFtpPassword(session, subId, ftpTarget.id, { ftpPassword: ftpNewPassword });
      if (result.success) {
        setFtpChangeSuccess(result.message);
        setFtpNewPassword("");
        setFtpConfirmPassword("");
        setFtpChangePwMode(false);
        setFtpTarget((prev) => prev ? { ...prev, publish: prev.publish ? { ...prev.publish, ftpPassword: ftpNewPassword } : null } : null);
      } else {
        setFtpChangeError(result.message);
      }
    } catch (err) {
      setFtpChangeError(err instanceof Error ? err.message : "Failed to change FTP password.");
    } finally {
      setFtpChanging(false);
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    const session = getCustomerSession();
    if (!session) return;
    if (!window.confirm(`Confirm: Delete "${siteName}"?`)) return;

    try {
      await deleteHostedSite(session, siteId);
      setSites((current) =>
        current.map((site) => site.id === siteId ? { ...site, provisioningStatus: "deleting" } : site),
      );
      setRefreshTick((tick) => tick + 1);
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "Failed to delete site.");
    }
  };

  const handleCreateSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getCustomerSession();
    if (!session || !subId) return;

    setIsProvisioningSite(true);
    setSiteProvisionError(null);

    const requestedSiteName = newSiteAlias.trim() || "Project";
    const slug = requestedSiteName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
    const assignedDomain = `${slug}-${node?.nodeName ?? Math.random().toString(36).slice(2, 6)}.code0xff.shop`;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticSite: DisplayWebsite = {
      id: optimisticId,
      siteName: requestedSiteName,
      domain: assignedDomain,
      provisioningStatus: "creating",
      lastProvisionError: null,
      platformSummary: "Provisioning environment",
      publicIpAddress: node?.publicIpAddress ?? null,
      serverHost: node?.nodeName ?? null,
      isQuotaBlocked: false,
      iisSiteState: "pending",
      appPoolState: "pending",
      hasHttpBinding: false,
      hasHttpsBinding: false,
      createdUtc: new Date().toISOString(),
      stack: "static",
      stackVersion: null,
      runtimeStatus: null,
      runtimeMessage: null,
      runtimeReadyUtc: null,
      lastPublishedUtc: null,
      lastPublishStatus: null,
      lastPublishMessage: null,
      hasActivePublishJob: false,
      hasActiveRuntimeJob: false,
      publish: null,
      hostnames: null,
      gitRepoUrl: null,
      gitBranch: null,
      gitHasPat: false,
      isOptimistic: true,
    };

    setSites((current) => [optimisticSite, ...current]);
    setIsSiteModalOpen(false);

    try {
      await createSubscriptionSite(session, subId, {
        siteName: requestedSiteName,
        domain: assignedDomain,
      });
      setNewSiteAlias("");
      setRefreshTick((tick) => tick + 1);
    } catch (createError) {
      setSites((current) => current.filter((site) => site.id !== optimisticId));
      setSiteProvisionError(createError instanceof Error ? createError.message : "Failed to provision site.");
      setIsSiteModalOpen(true);
    } finally {
      setIsProvisioningSite(false);
    }
  };

  const handleCreateDatabase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getCustomerSession();
    const requestedAlias = newDbName.trim() || "main";
    if (!session || !subId) return;

    setIsDbProvisioning(true);
    setDbProvisionError(null);

    const optimisticId = `optimistic-db-${crypto.randomUUID()}`;
    const optimisticDb: DisplayDatabase = {
      id: optimisticId,
      subscriptionId: subId,
      databaseName: requestedAlias,
      dbUser: "Allocating...",
      dbPassword: undefined,
      databaseSpaceMb: 512,
      serverHost: "Waiting for node...",
      provisioningStatus: "creating",
      lastProvisionError: null,
      createdUtc: new Date().toISOString(),
      siteId: null,
      siteName: null,
      engine: "sqlserver",
      isOptimistic: true,
    };

    setDatabases((current) => [optimisticDb, ...current]);
    setIsDbModalOpen(false);

    try {
      const result = await createHostedDatabase(session, subId, { databaseName: requestedAlias });
      if (result.database) {
        setDatabases((current) =>
          current.map((database) =>
            database.id === optimisticId
              ? { ...result.database!, provisioningStatus: "creating", isOptimistic: true }
              : database,
          ),
        );
      }
      setNewDbName("");
      setRefreshTick((tick) => tick + 1);
    } catch (createError) {
      setDatabases((current) => current.filter((database) => database.id !== optimisticId));
      setDbProvisionError(createError instanceof Error ? createError.message : "Failed to provision database.");
      setIsDbModalOpen(true);
    } finally {
      setIsDbProvisioning(false);
    }
  };

  const openPublishDialog = (site: SubscriptionWebsite) => {
    setPublishTarget(site);
    setPublishError(null);
    setPublishInfo(null);
    setEntryDllInput("");
    setStartupCommandInput("");
    setDeployLog(null);
    setGitConfigError(null);
    setGitConfigSaved(false);
    setGitRepoUrl(site.gitRepoUrl ?? "");
    setGitBranch(site.gitBranch ?? "main");
    setGitPat("");
    setDeployMode(site.gitRepoUrl ? "git" : "ftp");

    const preferredSlug = isSiteStackConfigured(site)
      ? site.stack
      : (availableStacks[0]?.slug ?? "dotnet");
    const preferredEntry = stackCatalog.find((s) => s.slug === preferredSlug);
    const preferredVersion = isSiteStackConfigured(site) && site.stackVersion
      ? site.stackVersion
      : (preferredEntry?.versions.find((v) => v.isDefault)?.value ?? preferredEntry?.versions[0]?.value ?? "10.0");

    setPublishStackChoice(preferredSlug);
    setPublishVersionChoice(preferredVersion);

    if (isSiteStackConfigured(site) || onlyOneStack) {
      setPublishPhase("publish");
    } else {
      setPublishPhase("select-stack");
    }
  };

  const closePublishDialog = () => {
    setPublishTarget(null);
    setPublishPhase("publish");
    setPublishError(null);
    setPublishInfo(null);
    setIsSubmittingStack(false);
    setIsPublishing(false);
    setEntryDllInput("");
    setDeployLog(null);
    setGitConfigError(null);
    setGitConfigSaved(false);
    setGitPat("");
  };

  const handleStackChoiceChange = (slug: string) => {
    setPublishStackChoice(slug);
    const entry = stackCatalog.find((s) => s.slug === slug);
    if (entry) {
      const defaultVersion = entry.versions.find((v) => v.isDefault)?.value ?? entry.versions[0]?.value ?? "";
      setPublishVersionChoice(defaultVersion);
    }
  };

  const handleConfirmStack = async () => {
    if (!publishTarget || !subId) return;
    const session = getCustomerSession();
    if (!session) return;

    const chosenStack = stackCatalog.find((s) => s.slug === publishStackChoice);
    if (chosenStack && chosenStack.status !== "available") {
      setPublishError(`${chosenStack.name} is not yet available. Please pick another stack.`);
      return;
    }

    setIsSubmittingStack(true);
    setPublishError(null);
    setPublishInfo(null);
    try {
      const response = await updateSiteStack(session, subId, publishTarget.id, {
        stack: publishStackChoice,
        version: publishVersionChoice || null,
      });
      if (!response.success) {
        setPublishError(response.message || "Failed to configure runtime.");
        return;
      }

      setSites((current) =>
        current.map((site) =>
          site.id === publishTarget.id
            ? {
                ...site,
                stack: response.data?.stack ?? publishStackChoice,
                stackVersion: response.data?.stackVersion ?? publishVersionChoice,
                runtimeStatus: response.data?.runtimeStatus ?? site.runtimeStatus,
                runtimeMessage: response.data?.runtimeMessage ?? site.runtimeMessage,
                hasActiveRuntimeJob: response.data?.runtimeJobQueued ?? site.hasActiveRuntimeJob,
              }
            : site,
        ),
      );

      setPublishTarget((current) =>
        current
          ? {
              ...current,
              stack: response.data?.stack ?? publishStackChoice,
              stackVersion: response.data?.stackVersion ?? publishVersionChoice,
              runtimeStatus: response.data?.runtimeStatus ?? current.runtimeStatus,
              runtimeMessage: response.data?.runtimeMessage ?? current.runtimeMessage,
              hasActiveRuntimeJob: response.data?.runtimeJobQueued ?? current.hasActiveRuntimeJob,
            }
          : current,
      );

      setPublishInfo(response.message || "Runtime configuration saved.");
      setPublishPhase("publish");
      setRefreshTick((tick) => tick + 1);
    } catch (stackError) {
      setPublishError(stackError instanceof Error ? stackError.message : "Failed to configure runtime.");
    } finally {
      setIsSubmittingStack(false);
    }
  };

  const handleDownloadPublishProfile = async () => {
    if (!publishTarget || !subId) return;
    const session = getCustomerSession();
    if (!session) return;

    setIsDownloadingProfile(true);
    setPublishError(null);
    try {
      const { fileName, blob } = await downloadPublishProfile(session, subId, publishTarget.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fallbackBase = (publishTarget.siteName || publishTarget.domain.split(".")[0] || "site")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-");
      const hasValidName = fileName && fileName !== "download" && /\.PublishSettings$/i.test(fileName);
      link.download = hasValidName ? fileName : `${fallbackBase || "site"}.PublishSettings`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPublishInfo("Publish profile downloaded. Import it in Visual Studio 2022 (Publish → Import Profile).");
    } catch (downloadError) {
      setPublishError(downloadError instanceof Error ? downloadError.message : "Failed to download publish profile.");
    } finally {
      setIsDownloadingProfile(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!publishTarget || !subId) return;
    const session = getCustomerSession();
    if (!session) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishInfo(null);
    try {
      const effectiveStack = isSiteStackConfigured(publishTarget) ? publishTarget.stack : publishStackChoice;

      const needsStackConfig = !isSiteStackConfigured(publishTarget);
      const nodeStartupChanged = effectiveStack === "node" && startupCommandInput.trim();

      if (needsStackConfig || nodeStartupChanged) {
        const stackResponse = await updateSiteStack(session, subId, publishTarget.id, {
          stack: needsStackConfig ? publishStackChoice : effectiveStack,
          version: needsStackConfig ? (publishVersionChoice || null) : (publishTarget.stackVersion ?? null),
          startupCommand: effectiveStack === "node" && startupCommandInput.trim() ? startupCommandInput.trim() : null,
        });
        if (!stackResponse.success) {
          setPublishError(stackResponse.message || "Failed to configure runtime.");
          return;
        }
        setSites((current) =>
          current.map((site) =>
            site.id === publishTarget.id
              ? {
                  ...site,
                  stack: stackResponse.data?.stack ?? (needsStackConfig ? publishStackChoice : site.stack),
                  stackVersion: stackResponse.data?.stackVersion ?? (needsStackConfig ? publishVersionChoice : site.stackVersion),
                  runtimeStatus: stackResponse.data?.runtimeStatus ?? site.runtimeStatus,
                  runtimeMessage: stackResponse.data?.runtimeMessage ?? site.runtimeMessage,
                  hasActiveRuntimeJob: stackResponse.data?.runtimeJobQueued ?? site.hasActiveRuntimeJob,
                }
              : site,
          ),
        );
      }

      const response = await publishSite(session, subId, publishTarget.id, {
        entryDll: effectiveStack === "node" ? null : (entryDllInput.trim() ? entryDllInput.trim() : null),
      });
      if (!response.success) {
        setPublishError(response.message || "Failed to queue publish.");
        return;
      }

      setSites((current) =>
        current.map((site) =>
          site.id === publishTarget.id
            ? {
                ...site,
                hasActivePublishJob: true,
                lastPublishStatus: response.data?.lastPublishStatus ?? "queued",
                lastPublishMessage: null,
                lastPublishedUtc: response.data?.lastPublishedUtc ?? site.lastPublishedUtc,
              }
            : site,
        ),
      );

      setPublishInfo(
        effectiveStack === "node"
          ? "Publish queued. The server will install dependencies and configure the site."
          : "Publish queued. Visual Studio's upload will finalize shortly.",
      );
      setRefreshTick((tick) => tick + 1);
    } catch (publishErr) {
      setPublishError(publishErr instanceof Error ? publishErr.message : "Failed to publish site.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveGitConfig = async () => {
    if (!publishTarget || !subId) return;
    const session = getCustomerSession();
    if (!session) return;
    setIsSavingGitConfig(true);
    setGitConfigError(null);
    setGitConfigSaved(false);
    try {
      const response = await saveGitConfig(session, subId, publishTarget.id, {
        repoUrl: gitRepoUrl.trim(),
        branch: gitBranch.trim() || "main",
        pat: gitPat.trim() || null,
      });
      if (!response.success) {
        setGitConfigError(response.message || "Failed to save git config.");
        return;
      }
      setGitPat("");
      setGitConfigSaved(true);
      setSites((current) =>
        current.map((s) =>
          s.id === publishTarget.id
            ? { ...s, gitRepoUrl: gitRepoUrl.trim(), gitBranch: gitBranch.trim() || "main", gitHasPat: true }
            : s,
        ),
      );
    } catch (e) {
      setGitConfigError(e instanceof Error ? e.message : "Failed to save git config.");
    } finally {
      setIsSavingGitConfig(false);
    }
  };

  const handleGitDeploy = async () => {
    if (!publishTarget || !subId) return;
    const session = getCustomerSession();
    if (!session) return;
    setIsDeployingFromGit(true);
    setPublishError(null);
    setDeployLog(null);
    try {
      const response = await triggerGitDeploy(session, subId, publishTarget.id);
      if (!response.success) {
        setPublishError(response.message || "Failed to trigger git deploy.");
        return;
      }
      setSites((current) =>
        current.map((s) =>
          s.id === publishTarget.id
            ? { ...s, hasActivePublishJob: true, lastPublishStatus: "pending", lastPublishMessage: null }
            : s,
        ),
      );
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Failed to trigger git deploy.");
    } finally {
      setIsDeployingFromGit(false);
    }
  };

  const storagePercent = subscription.diskQuotaMb > 0
    ? Math.min((subscription.storageUsedBytes / (subscription.diskQuotaMb * 1024 * 1024)) * 100, 100)
    : 0;
  const serverStatus = node?.status?.toLowerCase() === "online" || node?.status?.toLowerCase() === "active"
    ? "online" : node ? "degraded" : "offline";

  return (
    <>
      {/* ── Subscription header ── */}
      <section className="ov-header">
        <div className="ov-header__left">
          <div className="ov-header__icon"><Cloud size={22} /></div>
          <div>
            <h1 className="ov-header__name">{subscription.name}</h1>
            <div className="ov-header__meta">
              <span className="ov-header__plan-badge">{subscription.planSlug.toUpperCase()}</span>
              <span className="ov-header__region">{t(regionLabel, regionLabel)}</span>
              <span className={`ov-header__status ov-header__status--${serverStatus}`}>
                <span className="ov-header__status-dot" />
                {serverStatus === "online" ? t("Server Online", "Server Online") : serverStatus === "degraded" ? t("Degraded", "Degraded") : t("Offline", "Offline")}
              </span>
            </div>
          </div>
        </div>
        <div className="ov-header__actions">
          <button type="button" className="ov-btn ov-btn--outline" onClick={() => setIsSiteModalOpen(true)}>
            <Plus size={15} />
            {t("Add Website", "Add Website")}
          </button>
          <button type="button" className="ov-btn ov-btn--outline" onClick={() => setIsDbModalOpen(true)}>
            <Database size={15} />
            {t("Add Database", "Add Database")}
          </button>
          <button type="button" className="ov-btn ov-btn--ghost" onClick={startOverviewTour} title="Guided tour">
            <HelpCircle size={15} />
          </button>
        </div>
      </section>

      {/* ── Stat bar ── */}
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

      {hasInFlightWork ? (
        <div className="inline-message">
          {t("Infrastructure updates are in progress. This page will refresh automatically.", "Infrastructure updates are in progress. This page will refresh automatically.")}
        </div>
      ) : null}

      {/* ── Websites section ── */}
      <section className="ov-section">
        <div className="ov-section__header">
          <h3 className="ov-section__title">{t("Websites", "Websites")}</h3>
        </div>

        {sites.length === 0 ? (
          <div className="ov-empty">
            <Globe size={32} strokeWidth={1.5} />
            <p>{t("No websites yet", "No websites yet")}</p>
            <button type="button" className="ov-btn ov-btn--primary ov-btn--sm" onClick={() => setIsSiteModalOpen(true)}>
              <Plus size={14} /> {t("Create your first website", "Create your first website")}
            </button>
          </div>
        ) : (
          <div className="ov-sites">
            {sites.map((site) => {
              const isActive = isHealthyStatus(site.provisioningStatus);
              const statusLabel = getStatusLabel(site.provisioningStatus);
              const configured = isSiteStackConfigured(site);
              const publishDisabled = Boolean(site.isOptimistic) || site.hasActivePublishJob || site.hasActiveRuntimeJob || isInFlightStatus(site.provisioningStatus);

              return (
                <div key={site.id} className="ov-site-card" onClick={() => openSiteDetails(site.id)}>
                  <div className="ov-site-card__main">
                    <div className="ov-site-card__icon"><Globe size={18} /></div>
                    <div className="ov-site-card__info">
                      <strong className="ov-site-card__name">{site.siteName || site.domain.split(".")[0]}</strong>
                      <a
                        href={`https://${site.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ov-site-card__domain"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {site.domain} <ExternalLink size={11} />
                      </a>
                      {(() => {
                        const customDomains = (site.hostnames ?? []).filter((h: { isSystemBinding: boolean; isDefault: boolean }) => !h.isSystemBinding && !h.isDefault);
                        if (customDomains.length === 0) return null;
                        const MAX_SHOW = 3;
                        const visible = customDomains.slice(0, MAX_SHOW);
                        const remaining = customDomains.length - MAX_SHOW;
                        return (
                          <div className="ov-site-card__bindings" onClick={(e) => e.stopPropagation()}>
                            {visible.map((h: { hostname: string }) => (
                              <a key={h.hostname} href={`https://${h.hostname}`} target="_blank" rel="noreferrer" className="ov-site-card__binding-tag">
                                {h.hostname}
                              </a>
                            ))}
                            {remaining > 0 && (
                              <Link to={`/subscription/${subId}/site/${site.id}/domains`} className="ov-site-card__binding-more">
                                {t("+{count} more", "+{count} more").replace("{count}", remaining.toString())}
                              </Link>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="ov-site-card__status-group">
                      <span className={`ov-site-card__status ${isActive ? "ov-site-card__status--active" : "ov-site-card__status--warning"}`}>
                        <span className="ov-site-card__status-dot" />
                        {t(statusLabel, statusLabel)}
                      </span>
                      <span className={configured ? "ov-site-card__stack ov-site-card__stack--configured" : "ov-site-card__stack"}>
                        {t(getStackLabel(site, stackCatalog), getStackLabel(site, stackCatalog))}
                      </span>
                    </div>
                  </div>
                  <div className="ov-site-card__actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ov-btn ov-btn--primary ov-btn--sm"
                      onClick={() => openPublishDialog(site)}
                      disabled={publishDisabled}
                    >
                      {(site.hasActivePublishJob || site.hasActiveRuntimeJob) ? (
                        <Loader2 size={13} className="al-spin" />
                      ) : (
                        <Rocket size={13} />
                      )}
                      {site.hasActivePublishJob ? t("Publishing...", "Publishing...") : site.hasActiveRuntimeJob ? t("Preparing...", "Preparing...") : t("Deploy", "Deploy")}
                    </button>
                    <Link
                      to={`/subscription/${subId}/site/${site.id}/domains`}
                      className="ov-icon-btn" title={t("Domains", "Domains")}
                    ><Globe size={15} /></Link>
                    <button type="button" className="ov-icon-btn" title={t("Files", "Files")}
                      onClick={() => openSiteFiles(site.id)} disabled={Boolean(site.isOptimistic)}
                    ><FolderOpen size={15} /></button>
                    <button type="button" className="ov-icon-btn" title={t("FTP Credentials", "FTP Credentials")}
                      onClick={() => openFtpCredentials(site)}
                      disabled={Boolean(site.isOptimistic) || !site.publish}
                    ><Key size={15} /></button>
                    <button type="button" className="ov-icon-btn" title={t("Settings", "Settings")}
                      onClick={() => openSiteDetails(site.id)}
                    ><Settings size={15} /></button>
                    <button type="button" className="ov-icon-btn ov-icon-btn--danger" title={t("Delete", "Delete")}
                      onClick={() => void handleDeleteSite(site.id, site.siteName)}
                      disabled={Boolean(site.isOptimistic)}
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Quick info cards row ── */}
      <section className="ov-info-row">
        <div className="ov-info-card">
          <div className="ov-info-card__icon"><Server size={18} /></div>
          <div className="ov-info-card__body">
            <span className="ov-info-card__label">{t("Server", "Server")}</span>
            <strong className="ov-info-card__value">{t(regionLabel, regionLabel)}</strong>
          </div>
          <span className={`ov-info-card__badge ov-info-card__badge--${serverStatus}`}>
            {serverStatus === "online" ? t("Healthy", "Healthy") : serverStatus === "degraded" ? t("Degraded", "Degraded") : t("Offline", "Offline")}
          </span>
        </div>

        <div className="ov-info-card">
          <div className="ov-info-card__icon"><Shield size={18} /></div>
          <div className="ov-info-card__body">
            <span className="ov-info-card__label">{t("Security", "Security")}</span>
            <strong className="ov-info-card__value">
              {security.alerts.length === 0 ? t("All clear", "All clear") : `${security.alerts.length} ${security.alerts.length > 1 ? t("alerts", "alerts") : t("alert", "alert")}`}
            </strong>
          </div>
          <span className={`ov-info-card__badge ${security.alerts.length > 0 ? "ov-info-card__badge--degraded" : "ov-info-card__badge--online"}`}>
            {security.alerts.length === 0 ? t("OK", "OK") : t("Action needed", "Action needed")}
          </span>
        </div>

      </section>

      {/* ── Alerts detail (only if alerts exist) ── */}
      {security.alerts.length > 0 ? (
        <section className="ov-section">
          <div className="ov-section__header">
            <h3 className="ov-section__title">{t("Alerts", "Alerts")}</h3>
            <span className="ov-alert-count">{security.alerts.length}</span>
          </div>
          {security.alerts.slice(0, 5).map((alert) => {
            const Icon = getAlertIcon(alert.severity);
            return (
              <div className="ov-alert-item" key={`${alert.type}-${alert.siteId}-${alert.detectedUtc}`}>
                <div className={`ov-alert-item__icon ${alert.severity === "critical" ? "ov-alert-item__icon--red" : "ov-alert-item__icon--amber"}`}>
                  <Icon size={14} />
                </div>
                <div>
                  <div className="ov-alert-item__title">{alert.siteName || t("System Alert", "System Alert")}</div>
                  <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>{alert.message}</p>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {isSiteModalOpen ? (
        <div className="al-modal-backdrop">
          <div className="card stack al-modal-card">
            <div className="al-modal-card__head">
              <h2>{t("Add New Site", "Add New Site")}</h2>
              <button className="text-button" onClick={() => setIsSiteModalOpen(false)} disabled={isProvisioningSite}>{t("Close", "Close")}</button>
            </div>
            <p className="muted">
              {t("This site will be provisioned under {name}. You have {slots} remaining deployment slots.", "This site will be provisioned under {name}. You have {slots} remaining deployment slots.")
                .replace("{name}", subscription.name)
                .replace("{slots}", String(subscription.siteQuota - subscription.usedSites))}
            </p>
            {siteProvisionError ? <div className="inline-message inline-message--error">{siteProvisionError}</div> : null}
            <form className="stack-sm" onSubmit={(event) => void handleCreateSite(event)}>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{t("Project Alias", "Project Alias")}</span>
                <input
                  type="text"
                  autoFocus
                  placeholder={t("e.g. My Awesome Blog", "e.g. My Awesome Blog")}
                  value={newSiteAlias}
                  onChange={(event) => setNewSiteAlias(event.target.value)}
                  disabled={isProvisioningSite}
                />
              </label>
              <button type="submit" className="primary-button" disabled={isProvisioningSite}>
                {isProvisioningSite ? t("Provisioning site...", "Provisioning site...") : t("Create Project & Site", "Create Project & Site")}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isDbModalOpen ? (
        <div className="al-modal-backdrop">
          <div className="card stack al-modal-card">
            <div className="al-modal-card__head">
              <h2>{t("Create Database", "Create Database")}</h2>
              <button className="text-button" onClick={() => setIsDbModalOpen(false)} disabled={isDbProvisioning}>{t("Close", "Close")}</button>
            </div>
            <p className="muted">{t("The backend enforces this subscription's real database quota and queues provisioning on the remote agent.", "The backend enforces this subscription's real database quota and queues provisioning on the remote agent.")}</p>
            {dbProvisionError ? <div className="inline-message inline-message--error">{dbProvisionError}</div> : null}
            <form className="stack-sm" onSubmit={(event) => void handleCreateDatabase(event)}>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{t("Database Alias", "Database Alias")}</span>
                <input
                  type="text"
                  autoFocus
                  placeholder={t("e.g. main_db", "e.g. main_db")}
                  value={newDbName}
                  onChange={(event) => setNewDbName(event.target.value)}
                  disabled={isDbProvisioning}
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={isDbProvisioning}>
                {isDbProvisioning ? t("Provisioning database...", "Provisioning database...") : t("Create Database", "Create Database")}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {ftpTarget?.publish ? (
        <div className="al-modal-backdrop" onClick={() => setFtpTarget(null)}>
          <div
            className="card al-modal-card ftp-cred-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="ftp-cred__head">
              <div className="ftp-cred__head-left">
                <div className="ftp-cred__icon"><Key size={18} /></div>
                <div>
                  <h2 className="ftp-cred__title">{t("FTP Credentials", "FTP Credentials")}</h2>
                  <p className="ftp-cred__sub">{ftpTarget.siteName} · {ftpTarget.domain}</p>
                </div>
              </div>
              <button
                type="button"
                className="ftp-cred__close"
                onClick={() => setFtpTarget(null)}
                aria-label={t("Close", "Close")}
              ><X size={18} /></button>
            </div>

            {/* Credential rows */}
            <div className="ftp-cred__rows">
              {(
                [
                  { key: "host",  label: t("Host", "Host"),     value: ftpTarget.publish.ftpHost,     secret: false },
                  { key: "user",  label: t("Username", "Username"),  value: ftpTarget.publish.ftpUser,     secret: false },
                  { key: "pass",  label: t("Password", "Password"),  value: ftpTarget.publish.ftpPassword, secret: true  },
                  { key: "port",  label: t("Port", "Port"),      value: "21",                          secret: false },
                  { key: "proto", label: t("Protocol", "Protocol"),  value: t("FTP (Passive Mode)", "FTP (Passive Mode)"),          secret: false },
                ] as const
              ).map(({ key, label, value, secret }) => {
                const isCopied = ftpCopied === key;
                const shown = secret ? (ftpPasswordVisible ? value : "••••••••••••") : value;
                return (
                  <div key={key} className="ftp-cred__row">
                    <span className="ftp-cred__label">{label}</span>
                    <code className="ftp-cred__value">{shown}</code>
                    <div className="ftp-cred__actions">
                      {secret && (
                        <button
                          type="button"
                          className="ftp-cred__btn"
                          onClick={() => setFtpPasswordVisible((v) => !v)}
                          title={ftpPasswordVisible ? t("Hide password", "Hide password") : t("Show password", "Show password")}
                        >
                          {ftpPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`ftp-cred__btn ${isCopied ? "ftp-cred__btn--copied" : ""}`}
                        onClick={() => void handleFtpCopy(value, key)}
                        title={isCopied ? t("Copied!", "Copied!") : t("Copy", "Copy")}
                      >
                        {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick-connect string */}
            <div className="ftp-cred__connect">
              <span className="ftp-cred__connect-label">{t("Quick connect string", "Quick connect string")}</span>
              <div className="ftp-cred__connect-row">
                <code className="ftp-cred__connect-val">
                  ftp://{ftpTarget.publish.ftpUser}@{ftpTarget.publish.ftpHost}
                </code>
                <button
                  type="button"
                  className={`ftp-cred__btn ${ftpCopied === "quick" ? "ftp-cred__btn--copied" : ""}`}
                  onClick={() => void handleFtpCopy(`ftp://${ftpTarget.publish!.ftpUser}@${ftpTarget.publish!.ftpHost}`, "quick")}
                  title={t("Copy", "Copy")}
                >
                  {ftpCopied === "quick" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Tip */}
            <div className="ftp-cred__tip">
              <strong>{t("Recommended client:", "Recommended client:")}</strong> {t("FileZilla (free) — use File → Site Manager and set Protocol to FTP with Passive transfer mode.", "FileZilla (free) — use File → Site Manager and set Protocol to FTP with Passive transfer mode.")}
              {" "}
              {(() => {
                const text = t("Do not upload {node_modules}; include {package_json} and the server installs dependencies automatically.", "Do not upload {node_modules}; include {package_json} and the server installs dependencies automatically.");
                const parts = text.split(/(\{node_modules\}|\{package_json\})/);
                return parts.map((part, index) => {
                  if (part === "{node_modules}") return <code key={index}>node_modules</code>;
                  if (part === "{package_json}") return <code key={index}>package.json</code>;
                  return part;
                });
              })()}
            </div>

            {/* Change password */}
            <div className="ftp-cred__change-pw">
              {!ftpChangePwMode ? (
                <div className="ftp-cred__change-pw-row">
                  {ftpChangeSuccess && (
                    <span className="ftp-cred__change-pw-ok">
                      <CheckCircle2 size={13} /> {t(ftpChangeSuccess, ftpChangeSuccess)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="ftp-cred__change-pw-btn"
                    onClick={() => { setFtpChangePwMode(true); setFtpChangeSuccess(null); }}
                  >
                    <Lock size={13} /> {t("Change FTP Password", "Change FTP Password")}
                  </button>
                </div>
              ) : (
                <form className="ftp-cred__change-pw-form" onSubmit={(e) => void handleFtpPasswordChange(e)}>
                  <p className="ftp-cred__change-pw-hint">
                    {t("New password must be ≥ 12 chars with uppercase, lowercase, number and symbol.", "New password must be ≥ 12 chars with uppercase, lowercase, number and symbol.")}
                  </p>
                  {ftpChangeError && (
                    <p className="ftp-cred__change-pw-err">{ftpChangeError}</p>
                  )}
                  <input
                    type="password"
                    className="ftp-cred__change-pw-input"
                    placeholder={t("New password", "New password")}
                    value={ftpNewPassword}
                    onChange={(e) => setFtpNewPassword(e.target.value)}
                    disabled={ftpChanging}
                    autoFocus
                    required
                  />
                  <input
                    type="password"
                    className="ftp-cred__change-pw-input"
                    placeholder={t("Confirm password", "Confirm password")}
                    value={ftpConfirmPassword}
                    onChange={(e) => setFtpConfirmPassword(e.target.value)}
                    disabled={ftpChanging}
                    required
                  />
                  <div className="ftp-cred__change-pw-actions">
                    <button
                      type="button"
                      className="ftp-cred__change-pw-cancel"
                      onClick={() => { setFtpChangePwMode(false); setFtpChangeError(null); setFtpNewPassword(""); setFtpConfirmPassword(""); }}
                      disabled={ftpChanging}
                    >{t("Cancel", "Cancel")}</button>
                    <button
                      type="submit"
                      className="ftp-cred__change-pw-submit"
                      disabled={ftpChanging}
                    >
                      {ftpChanging ? <Loader2 size={13} className="spin" /> : <Lock size={13} />}
                      {ftpChanging ? t("Updating…", "Updating…") : t("Update Password", "Update Password")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {publishTarget ? (
        <div className="al-modal-backdrop" onClick={closePublishDialog}>
          <div
            className="card stack al-modal-card al-publish-modal"
            style={{ width: "min(640px, 100%)", padding: "28px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="al-modal-card__head" style={{ marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8, fontSize: "1.35rem", fontWeight: 700 }}>
                  <Rocket size={20} style={{ color: "var(--primary)" }} />
                  {t("Publish {siteName}", "Publish {siteName}").replace("{siteName}", publishTarget.siteName)}
                </h2>
                <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                  {publishTarget.domain}
                </p>
              </div>
              <button
                type="button"
                onClick={closePublishDialog}
                disabled={isSubmittingStack || isPublishing}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-soft)";
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                <X size={18} />
              </button>
            </div>

            {publishError ? <div className="inline-message inline-message--error" style={{ marginBottom: "16px" }}>{publishError}</div> : null}
            {!publishError && publishTarget.hasActivePublishJob ? (
              <div className="inline-message" style={{ background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe", marginBottom: "16px" }}>
                <Loader2 size={14} className="al-spin" style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {t("Publishing... the agent is preparing your web container.", "Publishing... the agent is preparing your web container.")}
              </div>
            ) : null}
            {!publishError && !publishTarget.hasActivePublishJob
              && publishTarget.lastPublishStatus?.toLowerCase() === "succeeded" ? (
              <div className="inline-message" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "16px" }}>
                <span>
                  <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  {t("Publish complete", "Publish complete")}{publishTarget.lastPublishedUtc ? ` · ${formatDateTime(publishTarget.lastPublishedUtc)}` : ""}.
                </span>
                <a
                  href={`https://${publishTarget.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#065f46", fontWeight: 600, textDecoration: "underline" }}
                >
                  {t("Open site", "Open site")}
                </a>
              </div>
            ) : null}
            {!publishError && !publishTarget.hasActivePublishJob
              && publishTarget.lastPublishStatus?.toLowerCase() === "failed" ? (
              <div className="inline-message inline-message--error" style={{ marginBottom: "16px" }}>
                {t("Publish failed", "Publish failed")}{publishTarget.lastPublishMessage ? ` — ${publishTarget.lastPublishMessage}` : "."}
              </div>
            ) : null}
            {publishInfo && !publishTarget.hasActivePublishJob
              && publishTarget.lastPublishStatus?.toLowerCase() !== "succeeded"
              && publishTarget.lastPublishStatus?.toLowerCase() !== "failed" ? (
              <div className="inline-message" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", marginBottom: "16px" }}>
                <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {t(publishInfo, publishInfo)}
              </div>
            ) : null}

            {publishPhase === "select-stack" ? (
              <div className="stack-sm">
                <p className="muted" style={{ marginTop: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {t("Pick a runtime stack. The hosting agent will prepare the hosting environment automatically. This is a one-time setup; after it's done, publishing becomes a single click.", "Pick a runtime stack. The hosting agent will prepare the hosting environment automatically. This is a one-time setup; after it's done, publishing becomes a single click.")}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                  {stackCatalog.map((entry) => {
                    const isSelected = publishStackChoice === entry.slug;
                    const isAvailable = entry.status === "available";
                    
                    // Decide Stack Icon
                    let StackIcon = Lock;
                    if (entry.slug === "static") StackIcon = Globe;
                    else if (entry.slug === "netcore") StackIcon = Cpu;
                    else if (entry.slug === "node") StackIcon = Terminal;

                    return (
                      <button
                        key={entry.slug}
                        type="button"
                        onClick={() => isAvailable && handleStackChoiceChange(entry.slug)}
                        disabled={!isAvailable || isSubmittingStack}
                        style={{
                          textAlign: "left",
                          padding: "16px",
                          borderRadius: "14px",
                          border: isSelected ? "2.5px solid var(--primary)" : "1px solid var(--border)",
                          background: isSelected ? "rgba(37, 99, 235, 0.03)" : isAvailable ? "var(--surface)" : "#f8fafc",
                          cursor: isAvailable ? "pointer" : "not-allowed",
                          opacity: isAvailable ? 1 : 0.65,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          transition: "all 150ms ease",
                          boxShadow: isSelected ? "0 8px 20px rgba(37, 99, 235, 0.06)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                          <div style={{ 
                            width: "32px", 
                            height: "32px", 
                            borderRadius: "8px", 
                            background: isSelected ? "var(--primary-soft)" : "#e2e8f0", 
                            color: isSelected ? "var(--primary)" : "var(--muted)", 
                            display: "grid", 
                            placeItems: "center" 
                          }}>
                            <StackIcon size={16} />
                          </div>
                          {isSelected && <CheckCircle2 size={16} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
                        </div>
                        
                        <strong style={{ fontSize: "0.95rem", color: "var(--text)", marginTop: 6 }}>{t(entry.name, entry.name)}</strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.3 }}>{t(entry.description, entry.description)}</span>
                        {!isAvailable ? (
                          <span style={{ 
                            fontSize: "0.72rem", 
                            fontWeight: 700, 
                            color: "var(--muted)", 
                            background: "#e2e8f0", 
                            padding: "3px 8px", 
                            borderRadius: "999px",
                            display: "inline-block",
                            width: "fit-content",
                            marginTop: 4
                          }}>
                            {t("Coming soon", "Coming soon")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const chosen = stackCatalog.find((s) => s.slug === publishStackChoice);
                  if (!chosen || chosen.versions.length === 0) return null;
                  return (
                    <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>{t("Runtime version", "Runtime version")}</span>
                      <select
                        value={publishVersionChoice}
                        onChange={(event) => setPublishVersionChoice(event.target.value)}
                        disabled={isSubmittingStack}
                        style={{
                          width: "100%",
                          minHeight: "46px",
                          padding: "0 16px",
                          borderRadius: "12px",
                          border: "1.5px solid var(--border)",
                          background: "var(--surface)",
                          outline: "none",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          color: "var(--text)"
                        }}
                      >
                        {chosen.versions.map((v) => (
                          <option key={v.value} value={v.value}>{t(v.label, v.label)}</option>
                        ))}
                      </select>
                    </label>
                  );
                })()}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
                  <button 
                    type="button" 
                    className="secondary-button" 
                    onClick={closePublishDialog} 
                    disabled={isSubmittingStack}
                    style={{ minHeight: "42px", padding: "0 20px" }}
                  >
                    {t("Cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleConfirmStack()}
                    disabled={isSubmittingStack || !stackCatalog.find((s) => s.slug === publishStackChoice && s.status === "available")}
                    style={{ minHeight: "42px", padding: "0 20px", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {isSubmittingStack ? (
                      <><RefreshCw size={14} className="spin" /> {t("Preparing runtime...", "Preparing runtime...")}</>
                    ) : (
                      <>{t("Continue", "Continue")}</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack-sm">
                {/* Deploy mode tab switcher */}
                <div style={{ display: "flex", gap: 0, background: "var(--surface-soft)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", marginBottom: 4 }}>
                  {(["git", "ftp"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeployMode(mode)}
                      style={{
                        flex: 1,
                        padding: "7px 14px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        transition: "all 140ms ease",
                        background: deployMode === mode ? "var(--primary)" : "transparent",
                        color: deployMode === mode ? "#fff" : "var(--muted)",
                      }}
                    >
                      {mode === "git" ? "Deploy from GitHub" : "Manual Upload (FTP)"}
                    </button>
                  ))}
                </div>

                {deployMode === "git" && (
                  <div className="stack-sm">
                    {/* GitHub repo config */}
                    <div style={{ display: "grid", gap: 12, padding: 16, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-soft)" }}>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>Repository URL</span>
                        <input
                          type="url"
                          placeholder="https://github.com/your-org/your-repo"
                          value={gitRepoUrl}
                          onChange={(e) => setGitRepoUrl(e.target.value)}
                          disabled={isSavingGitConfig || isDeployingFromGit}
                          style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }}
                        />
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>Branch</span>
                          <input
                            type="text"
                            placeholder="main"
                            value={gitBranch}
                            onChange={(e) => setGitBranch(e.target.value)}
                            disabled={isSavingGitConfig || isDeployingFromGit}
                            style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }}
                          />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>
                            Personal Token {publishTarget.gitHasPat ? <span style={{ color: "#16a34a", fontWeight: 400 }}>✓ saved</span> : <span style={{ fontWeight: 400 }}>(optional)</span>}
                          </span>
                          <input
                            type="password"
                            placeholder={publishTarget.gitHasPat ? "Leave blank to keep existing" : "ghp_... (for private repos)"}
                            value={gitPat}
                            onChange={(e) => setGitPat(e.target.value)}
                            disabled={isSavingGitConfig || isDeployingFromGit}
                            style={{ width: "100%", minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }}
                          />
                        </label>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void handleSaveGitConfig()}
                          disabled={isSavingGitConfig || isDeployingFromGit || !gitRepoUrl.trim()}
                          style={{ minHeight: 36, padding: "0 16px", borderRadius: 10, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          {isSavingGitConfig ? <><Loader2 size={13} className="al-spin" /> Saving...</> : gitConfigSaved ? <><CheckCircle2 size={13} style={{ color: "#16a34a" }} /> Saved</> : "Save Connection"}
                        </button>
                      </div>
                      {gitConfigError ? <div className="inline-message inline-message--error" style={{ marginTop: 4 }}>{gitConfigError}</div> : null}
                    </div>

                    {/* Build log */}
                    {deployLog ? (
                      <div style={{ background: "#0f172a", color: "#94a3b8", borderRadius: 12, padding: "12px 16px", fontFamily: "monospace", fontSize: "0.75rem", maxHeight: 220, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {deployLog}
                      </div>
                    ) : null}

                    {/* Deploy button */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleGitDeploy()}
                        disabled={isDeployingFromGit || publishTarget.hasActivePublishJob || !publishTarget.gitRepoUrl}
                        style={{ minHeight: 44, padding: "0 24px", borderRadius: 12, fontSize: "0.92rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        {isDeployingFromGit || publishTarget.hasActivePublishJob ? (
                          <><Loader2 size={15} className="al-spin" /> {publishTarget.hasActivePublishJob ? "Deploying..." : "Queuing..."}</>
                        ) : (
                          <><Rocket size={15} /> Deploy from GitHub</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {deployMode === "ftp" && (() => {
                  const activeStack = isSiteStackConfigured(publishTarget) ? publishTarget.stack : publishStackChoice;
                  const isNode = activeStack === "node";
                  return (
                    <div className="stack-sm">
                      {!isNode && (
                        <div
                          style={{
                            padding: 18,
                            borderRadius: 14,
                            border: "1px solid #c7d2fe",
                            borderLeft: "4px solid var(--primary)",
                            background: "linear-gradient(180deg, #f5f7ff 0%, #eef2ff 100%)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                            <div>
                              <strong style={{ fontSize: "0.98rem", color: "#1e293b" }}>{t("Publish from Visual Studio 2022", "Publish from Visual Studio 2022")}</strong>
                              <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "0.8rem" }}>
                                {t("Download the profile and import it — VS handles the upload via Web Deploy.", "Download the profile and import it — VS handles the upload via Web Deploy.")}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => void handleDownloadPublishProfile()}
                              disabled={isDownloadingProfile || isPublishing}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minHeight: "36px", borderRadius: "10px", fontSize: "0.82rem" }}
                            >
                              {isDownloadingProfile ? (
                                <Loader2 size={14} className="al-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              <span>{t("Download profile", "Download profile")}</span>
                            </button>
                          </div>
                          <ol style={{ margin: "10px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
                            <li>
                              {t("Download the {publish_settings} file above.", "Download the {publish_settings} file above.")
                                .split(/(\{publish_settings\})/)
                                .map((part, index) => part === "{publish_settings}" ? <code key={index}>.PublishSettings</code> : part)
                              }
                            </li>
                            <li>
                              {(() => {
                                const text = t("In Visual Studio 2022, right-click the project → Publish… → Import Profile, then pick the file.", "In Visual Studio 2022, right-click the project → Publish… → Import Profile, then pick the file.");
                                const parts = text.split(/(Publish…|Import Profile)/);
                                return parts.map((part, idx) => {
                                  if (part === "Publish…") return <strong key={idx}>Publish…</strong>;
                                  if (part === "Import Profile") return <strong key={idx}>Import Profile</strong>;
                                  return part;
                                });
                              })()}
                            </li>
                            <li>
                              {(() => {
                                const text = t("Click Publish in Visual Studio — it uploads via Web Deploy.", "Click Publish in Visual Studio — it uploads via Web Deploy.");
                                const parts = text.split(/(Publish)/);
                                return parts.map((part, idx) => part === "Publish" ? <strong key={idx}>Publish</strong> : part);
                              })()}
                            </li>
                            <li>
                              {t("Back here, click Publish now below to write {web_config} and recycle the app pool.", "Back here, click Publish now below to write {web_config} and recycle the app pool.")
                                .split(/(\{web_config\})/)
                                .map((part, index) => part === "{web_config}" ? <code key={index}>web.config</code> : part)
                              }
                            </li>
                          </ol>
                        </div>
                      )}

                      {isNode && <NodeDeployGuide />}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                          padding: "16px",
                          borderRadius: "14px",
                          background: "var(--surface-soft)",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <div>
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{t("Runtime", "Runtime")}</span>
                          <strong style={{ color: "var(--text)" }}>{t(getStackLabel(publishTarget, stackCatalog), getStackLabel(publishTarget, stackCatalog))}</strong>
                        </div>
                        <div>
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{t("Runtime status", "Runtime status")}</span>
                          <strong style={{ color: "var(--text)" }}>
                            {t(publishTarget.runtimeStatus ?? "Unknown", publishTarget.runtimeStatus ?? "Unknown")}{publishTarget.runtimeMessage ? ` — ${t(publishTarget.runtimeMessage, publishTarget.runtimeMessage)}` : ""}
                          </strong>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{t("Last publish", "Last publish")}</span>
                          <strong style={{ color: "var(--text)" }}>
                            {formatDateTime(publishTarget.lastPublishedUtc)}{publishTarget.lastPublishStatus ? ` (${t(publishTarget.lastPublishStatus, publishTarget.lastPublishStatus)})` : ""}
                          </strong>
                        </div>
                      </div>

                      {isNode ? (
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>{t("Startup file (optional)", "Startup file (optional)")}</span>
                          <input
                            type="text"
                            placeholder={t("server.js (auto-detected from package.json)", "server.js (auto-detected from package.json)")}
                            value={startupCommandInput}
                            onChange={(event) => setStartupCommandInput(event.target.value)}
                            disabled={isPublishing}
                            style={{
                              width: "100%",
                              minHeight: "44px",
                              padding: "0 16px",
                              borderRadius: "12px",
                              border: "1.5px solid var(--border)",
                              background: "var(--surface)",
                              outline: "none",
                              fontSize: "0.88rem",
                            }}
                          />
                          <span className="muted" style={{ fontSize: "0.76rem" }}>
                            {t("Leave empty to auto-detect from package.json. Specify a filename if your entry point is non-standard.", "Leave empty to auto-detect from package.json. Specify a filename if your entry point is non-standard.")}
                          </span>
                        </label>
                      ) : (
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--muted)" }}>{t("Entry DLL (optional)", "Entry DLL (optional)")}</span>
                          <input
                            type="text"
                            placeholder={t("Auto-detected, e.g. {dll}", "Auto-detected, e.g. {dll}").replace("{dll}", guessEntryDll(publishTarget))}
                            value={entryDllInput}
                            onChange={(event) => setEntryDllInput(event.target.value)}
                            disabled={isPublishing}
                            style={{
                              width: "100%",
                              minHeight: "44px",
                              padding: "0 16px",
                              borderRadius: "12px",
                              border: "1.5px solid var(--border)",
                              background: "var(--surface)",
                              outline: "none",
                              fontSize: "0.88rem",
                            }}
                          />
                          <span className="muted" style={{ fontSize: "0.76rem" }}>
                            {t("Leave empty to auto-detect. Provide a filename only if your app uses a non-standard entry DLL.", "Leave empty to auto-detect. Provide a filename only if your app uses a non-standard entry DLL.")}
                          </span>
                        </label>
                      )}

                      {publishTarget.publish ? (
                        <details 
                          style={{ 
                            borderRadius: 14, 
                            border: "1px dashed var(--border)", 
                            background: "var(--surface-soft)", 
                            padding: "12px 16px",
                            transition: "all 150ms ease"
                          }}
                        >
                          <summary style={{ cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
                            {isNode ? t("FTP upload details", "FTP upload details") : t("Advanced: manual FTP upload", "Advanced: manual FTP upload")}
                          </summary>
                          <ol style={{ margin: "10px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
                            {isNode ? (
                              <>
                                <li>
                                  {t("Upload your project files to the site root via FTP:", "Upload your project files to the site root via FTP:")}
                                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}>
                                    <span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{publishTarget.publish.ftpHost}</strong></span>
                                    <span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{publishTarget.publish.ftpUser}</strong></span>
                                  </div>
                                </li>
                                <li style={{ marginTop: 6 }}>
                                  {t("Include {package_json} — do not upload {node_modules} (it will be installed on the server).", "Include package.json — do not upload node_modules (it will be installed on the server).")
                                    .split(/(\{package_json\}|\{node_modules\})/)
                                    .map((part, index) => {
                                      if (part === "{package_json}") return <code key={index}>package.json</code>;
                                      if (part === "{node_modules}") return <code key={index}>node_modules</code>;
                                      return part;
                                    })
                                  }
                                </li>
                                <li style={{ marginTop: 6 }}>
                                  {(() => {
                                    const text = t("Click Publish now to run npm install, generate web.config, and start the app.", "Click Publish now to run npm install, generate web.config, and start the app.");
                                    const parts = text.split(/(Publish now|npm install|web.config)/);
                                    return parts.map((part, idx) => {
                                      if (part === "Publish now") return <strong key={idx}>{t("Publish now", "Publish now")}</strong>;
                                      if (part === "npm install") return <code key={idx}>npm install</code>;
                                      if (part === "web.config") return <code key={idx}>web.config</code>;
                                      return part;
                                    });
                                  })()}
                                </li>
                              </>
                            ) : (
                              <>
                                <li>
                                  {t("Run {dotnet_command} locally.", "Run {dotnet_command} locally.")
                                    .split(/(\{dotnet_command\})/)
                                    .map((part, index) => part === "{dotnet_command}" ? <code key={index}>dotnet publish -c Release -o ./publish</code> : part)
                                  }
                                </li>
                                <li>
                                  {t("Upload the contents of {publish_dir} to the site root via FTP:", "Upload the contents of {publish_dir} to the site root via FTP:")}
                                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: "monospace", fontSize: "0.8rem" }}>
                                    <span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("Host", "Host")}: <strong>{publishTarget.publish.ftpHost}</strong></span>
                                    <span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px" }}>{t("User", "User")}: <strong>{publishTarget.publish.ftpUser}</strong></span>
                                  </div>
                                </li>
                                <li>
                                  {t("Click Publish now to write {web_config} and recycle the app pool.", "Click Publish now to write web.config and recycle the app pool.")
                                    .split(/(\{web_config\})/)
                                    .map((part, index) => part === "{web_config}" ? <code key={index}>web.config</code> : part)
                                  }
                                </li>
                              </>
                            )}
                          </ol>
                        </details>
                      ) : null}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 8 }}>
                        {!onlyOneStack && isSiteStackConfigured(publishTarget) ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setPublishPhase("select-stack")}
                            disabled={isPublishing}
                            style={{ minHeight: "38px", padding: "0 14px", borderRadius: "10px", fontSize: "0.85rem" }}
                          >
                            {t("Change runtime", "Change runtime")}
                          </button>
                        ) : <span />}
                        <div style={{ display: "flex", gap: 12 }}>
                          <button 
                            type="button" 
                            className="secondary-button" 
                            onClick={closePublishDialog} 
                            disabled={isPublishing}
                            style={{ minHeight: "42px", padding: "0 20px" }}
                          >
                            {t("Done", "Done")}
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleConfirmPublish()}
                            disabled={isPublishing || !canPublishSite(publishTarget, availableStacks)}
                            style={{ minHeight: "42px", padding: "0 22px", display: "inline-flex", alignItems: "center", gap: 8 }}
                          >
                            {isPublishing ? (
                              <>
                                <Loader2 size={14} className="al-spin" />
                                <span>{t("Publishing...", "Publishing...")}</span>
                              </>
                            ) : (
                              <>
                                <Rocket size={14} />
                                <span>{t("Publish now", "Publish now")}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
