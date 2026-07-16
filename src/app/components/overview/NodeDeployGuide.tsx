import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { useLocalization } from "../../lib/i18n";

export function NodeDeployGuide() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { t } = useLocalization();

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % 3), 4200);
    return () => clearInterval(timer);
  }, [isPaused]);

  const tabs = [
    t("1  Upload Files", "1  Upload Files"),
    t("2  Click Publish", "2  Click Publish"),
    t("3  App is Live", "3  App is Live"),
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
    <div className="ndg ndg-wrapper" style={ndgStyle}>
      <div className="ndg__tabs" role="tablist">
        {tabs.map((label, i) => (
          <button key={i} type="button" role="tab" aria-selected={step === i}
            className={`ndg__tab ${step === i ? "ndg__tab--active ndg-tab--active" : ""}`}
            style={step === i ? { color: infos[i].accent, borderBottomColor: infos[i].accent } : undefined}
            onClick={() => setStep(i)}>
            {label}
          </button>
        ))}
      </div>
      <div className="ndg__body" key={step}>
        <div className="ndg__vis">
          {step === 0 && (
            <svg viewBox="0 0 120 100" className="ndg__svg" aria-hidden="true">
              <defs>
                <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#2563eb" /></linearGradient>
                <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" /></linearGradient>
              </defs>
              <g transform="translate(10, 24)">
                <path d="M2,8 L12,8 L15,12 L30,12 A2,2 0 0,1 32,14 L32,32 A2,2 0 0,1 30,34 L2,34 A2,2 0 0,1 0,32 L0,10 A2,2 0 0,1 2,8 Z" fill="url(#folderGrad)" opacity="0.85" />
                <rect x="6" y="2" width="16" height="16" rx="1.5" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" className="ndg-doc-peek" />
                <line x1="9" y1="6" x2="19" y2="6" stroke="#93c5fd" strokeWidth="1" />
                <line x1="9" y1="10" x2="16" y2="10" stroke="#93c5fd" strokeWidth="1" />
                <path d="M0,14 L32,14 L30,34 L0,34 Z" fill="url(#folderGrad)" />
              </g>
              <g transform="translate(74, 18)">
                <rect x="0" y="0" width="36" height="54" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                <rect x="4" y="4" width="28" height="2" rx="1" fill="#475569" />
                <rect x="3" y="10" width="30" height="10" rx="2" fill="url(#bladeGrad)" stroke="#334155" strokeWidth="1" />
                <circle cx="8" cy="15" r="1.5" fill="#10b981" className="ndg-led-blink" />
                <circle cx="13" cy="15" r="1" fill="#64748b" />
                <line x1="17" y1="15" x2="27" y2="15" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                <rect x="3" y="24" width="30" height="10" rx="2" fill="url(#bladeGrad)" stroke="#334155" strokeWidth="1" />
                <circle cx="8" cy="29" r="1.5" fill="#10b981" className="ndg-led-blink" style={{ animationDelay: "0.5s" }} />
                <circle cx="13" cy="29" r="1" fill="#64748b" />
                <line x1="17" y1="29" x2="27" y2="29" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                <rect x="3" y="38" width="30" height="10" rx="2" fill="url(#bladeGrad)" stroke="#334155" strokeWidth="1" />
                <circle cx="8" cy="43" r="1.5" fill="#3b82f6" className="ndg-led-blink" style={{ animationDelay: "1s" }} />
                <circle cx="13" cy="43" r="1.5" fill="#ef4444" className="ndg-led-blink" style={{ animationDelay: "0.2s" }} />
                <line x1="17" y1="43" x2="27" y2="43" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
              </g>
              <path d="M 40 42 L 74 36" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
              <g className="ndg-packet-1"><circle cx="0" cy="0" r="2.5" fill="#60a5fa" /><circle cx="0" cy="0" r="1" fill="#ffffff" /></g>
              <g className="ndg-packet-2"><circle cx="0" cy="0" r="2.5" fill="#3b82f6" /><circle cx="0" cy="0" r="1" fill="#ffffff" /></g>
            </svg>
          )}
          {step === 1 && (
            <svg viewBox="0 0 120 100" className="ndg__svg" aria-hidden="true">
              <rect x="8" y="10" width="104" height="80" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <path d="M8 16 A 6 6 0 0 1 14 10 L 106 10 A 6 6 0 0 1 112 16 L 112 24 L 8 24 Z" fill="#1e293b" />
              <circle cx="16" cy="17" r="2.5" fill="#ef4444" />
              <circle cx="23" cy="17" r="2.5" fill="#f59e0b" />
              <circle cx="30" cy="17" r="2.5" fill="#10b981" />
              <text x="60" y="18" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">bash</text>
              <g className="ndg-term-line-1"><text x="14" y="36" fill="#f8fafc" fontSize="6.5" fontFamily="monospace"><tspan fill="#34d399">$ </tspan><tspan fill="#60a5fa">npm </tspan>run publish</text></g>
              <g className="ndg-term-line-2"><text x="14" y="48" fill="#94a3b8" fontSize="5.5" fontFamily="monospace">&gt; building production...</text><g transform="translate(96, 46.5)"><g className="ndg-spinner-grp"><circle cx="0" cy="0" r="2.5" fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" /></g></g></g>
              <g className="ndg-term-line-3"><text x="14" y="60" fill="#38bdf8" fontSize="5.5" fontFamily="monospace">▲ deploying to IIS server</text></g>
              <g className="ndg-term-line-4"><text x="14" y="72" fill="#34d399" fontSize="6" fontFamily="monospace" fontWeight="bold">✓ publish successful!</text></g>
              <rect x="0" y="0" width="3.5" height="6" fill="#3b82f6" className="ndg-terminal-cursor" />
            </svg>
          )}
          {step === 2 && (
            <svg viewBox="0 0 120 100" className="ndg__svg" aria-hidden="true">
              <defs>
                <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient>
                <linearGradient id="liveBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#047857" /></linearGradient>
              </defs>
              <g className="ndg-browser-window">
                <rect x="6" y="12" width="108" height="76" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                <path d="M6 18 A 6 6 0 0 1 12 12 L 108 12 A 6 6 0 0 1 114 18 L 114 26 L 6 26 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                <circle cx="13" cy="19" r="2" fill="#ff5f56" /><circle cx="19" cy="19" r="2" fill="#ffbd2e" /><circle cx="25" cy="19" r="2" fill="#27c93f" />
                <rect x="33" y="16" width="68" height="6" rx="3" fill="#e2e8f0" />
                <text x="67" y="21.5" fill="#64748b" fontSize="4.2" fontFamily="sans-serif" textAnchor="middle">your-app.code0xff.shop</text>
                <circle cx="60" cy="46" r="11" fill="#d1fae5" /><circle cx="60" cy="46" r="8" fill="url(#successGrad)" />
                <path d="M57 46 L59 48 L63 43" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" className="ndg-check-live" />
                <g className="ndg-sparkles">
                  <path d="M42,38 L43,40 L45,41 L43,42 L42,44 L41,42 L39,41 L41,40 Z" fill="#fbbf24" />
                  <path d="M78,36 L79,38 L81,39 L79,40 L78,42 L77,40 L75,39 L77,38 Z" fill="#fbbf24" />
                  <path d="M44,60 L45,61.5 L46.5,62 L45,62.5 L44,64 L43,62.5 L41.5,62 L43,61.5 Z" fill="#60a5fa" />
                  <path d="M76,58 L77,59.5 L78.5,60 L77,60.5 L76,62 L75,60.5 L73.5,60 L75,59.5 Z" fill="#60a5fa" />
                </g>
                <text x="60" y="68" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">App is Live!</text>
                <text x="60" y="76" fill="#64748b" fontSize="4.8" fontFamily="sans-serif" textAnchor="middle">Successfully deployed</text>
              </g>
              <g className="ndg-live-badge-wrapper">
                <rect x="0" y="0" width="28" height="11" rx="5.5" fill="url(#liveBadgeGrad)" />
                <circle cx="5" cy="5.5" r="1.5" fill="#ffffff" className="ndg-live-dot" />
                <text x="17" y="7.5" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">LIVE</text>
              </g>
            </svg>
          )}
        </div>
        <div className="ndg__info">
          <strong className="ndg__info-title ndg-info-title" style={{ color: infos[step].accent }}>{infos[step].title}</strong>
          <ul className="ndg__bullets">
            {infos[step].bullets.map((b, i) => (
              <li key={i} className="ndg__bullet" style={{ animationDelay: `${i * 0.1}s` }}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="ndg__track">
        <div className="ndg__bar ndg-progress-bar" key={`bar-${step}`} style={{ background: infos[step].accent, animationPlayState: isPaused ? "paused" : "running" }} />
      </div>
      <div className="ndg__dots ndg-dots-wrap">
        {[0, 1, 2].map((i) => (
          <button key={i} type="button" className={`ndg__dot${step === i ? " ndg__dot--active ndg-dot--active" : ""}`}
            style={step === i ? { background: infos[step].accent } : undefined}
            onClick={() => { setStep(i); setIsPaused(true); }} aria-label={`Step ${i + 1}`} />
        ))}
        <button type="button" className="ndg__pause-btn ndg-pause-btn" onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? "Play autoplay" : "Pause autoplay"}
          style={{ color: infos[step].accent }}>
          {isPaused ? <Play size={10} strokeWidth={3} /> : <Pause size={10} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
}
