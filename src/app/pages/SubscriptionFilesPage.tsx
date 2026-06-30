import "../../styles/files.css";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLocalization } from "../lib/i18n";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileImage,
  FilePlus2,
  FileText,
  FileVideo2,
  Folder,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sun,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  createSiteEmptyFile,
  createSiteFolder,
  deleteSiteFile,
  downloadSiteFile,
  getSiteFileContent,
  getSiteFileBrowser,
  getSubscriptionFiles,
  renameSiteEntry,
  saveSiteFileContent,
  type SiteFileBrowserResponse,
  type SiteFileContentResponse,
  type SiteFileContentSaveResponse,
  type SiteFileEntry,
  type SubscriptionFilesSite,
  type SubscriptionFilesResponse,
  uploadSiteFiles,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";

type ViewMode = "grid" | "list";
type ComposerMode = "folder" | "file" | null;
type SortField = "name" | "size" | "date";
type SortDir = "asc" | "desc";

const EDITABLE_FILE_EXTENSIONS = new Set([
  "txt",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "json",
  "md",
  "markdown",
  "xml",
  "svg",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "config",
  "env",
  "php",
  "cshtml",
  "razor",
  "cs",
  "sql",
  "ps1",
  "cmd",
  "bat",
  "sh",
  "py",
  "java",
  "rb",
  "go",
  "rs",
  "vb",
  "scss",
  "sass",
  "less",
]);

const EDITABLE_FILE_NAMES = new Set([
  "dockerfile",
  "procfile",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  "web.config",
]);

function formatBytes(value: number) {
  if (value >= 1024 ** 3) return `${(value / (1024 ** 3)).toFixed(2)} GB`;
  if (value >= 1024 ** 2) return `${(value / (1024 ** 2)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value.toLocaleString()} B`;
}

function formatDate(value: string | null, t?: (key: string, def: string) => string) {
  return value ? new Date(value).toLocaleString() : (t ? t("Not scanned yet", "Not scanned yet") : "Not scanned yet");
}

function formatDateCompact(value: string | null, t?: (key: string, def: string) => string) {
  if (!value) {
    return t ? t("No timestamp", "No timestamp") : "No timestamp";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSearchParams(siteId: string, path: string) {
  const next = new URLSearchParams();
  if (siteId) {
    next.set("siteId", siteId);
  }
  if (path) {
    next.set("path", path);
  }
  return next;
}

function getPathSegments(path: string) {
  return path.split("/").filter(Boolean);
}

function extractRootLabel(physicalPath: string | null | undefined, fallback: string) {
  if (!physicalPath) {
    return fallback;
  }

  const normalized = physicalPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : fallback;
}

function normalizeWindowsPath(path: string | null | undefined) {
  return (path ?? "").replace(/\//g, "\\").replace(/\\+$/, "");
}

function getParentWindowsPath(path: string | null | undefined) {
  const normalized = normalizeWindowsPath(path);
  if (!normalized) {
    return "";
  }

  const lastSlash = normalized.lastIndexOf("\\");
  if (lastSlash <= 2) {
    return normalized;
  }

  return normalized.slice(0, lastSlash);
}

function splitWindowsPath(path: string) {
  const normalized = normalizeWindowsPath(path);
  if (!normalized) {
    return [];
  }

  const driveMatch = normalized.match(/^[A-Za-z]:/);
  if (!driveMatch) {
    return normalized.split("\\").filter(Boolean);
  }

  const drive = driveMatch[0];
  const remainder = normalized.slice(drive.length).replace(/^\\+/, "");
  return [drive, ...remainder.split("\\").filter(Boolean)];
}

function joinWindowsPath(parts: string[]) {
  if (parts.length === 0) {
    return "";
  }

  if (/^[A-Za-z]:$/i.test(parts[0])) {
    return parts.length === 1 ? `${parts[0]}\\` : `${parts[0]}\\${parts.slice(1).join("\\")}`;
  }

  return parts.join("\\");
}

function deriveSubscriptionRootPath(sites: SubscriptionFilesSite[]) {
  const parentPaths = sites
    .map((site) => getParentWindowsPath(site.physicalPath))
    .filter(Boolean);

  if (parentPaths.length === 0) {
    return "";
  }

  let commonParts = splitWindowsPath(parentPaths[0]);
  for (const candidate of parentPaths.slice(1)) {
    const candidateParts = splitWindowsPath(candidate);
    let nextLength = 0;
    while (
      nextLength < commonParts.length &&
      nextLength < candidateParts.length &&
      commonParts[nextLength].toLowerCase() === candidateParts[nextLength].toLowerCase()
    ) {
      nextLength += 1;
    }
    commonParts = commonParts.slice(0, nextLength);
  }

  return joinWindowsPath(commonParts) || parentPaths[0];
}

function ensureTrailingBackslash(path: string) {
  if (!path) {
    return "";
  }

  return path.endsWith("\\") ? path : `${path}\\`;
}

function buildAbsoluteFilePath(browser: SiteFileBrowserResponse | null) {
  if (!browser) {
    return "";
  }

  const basePath = browser.physicalPath.replace(/[\\/]+$/, "");
  if (basePath.startsWith('/')) {
    const rel = browser.currentPath.replace(/^\/+/, "");
    return rel ? `${basePath}/${rel}` : basePath;
  }
  const relativePath = browser.currentPath.replace(/\//g, "\\").replace(/^\\+/, "");
  return relativePath ? `${basePath}\\${relativePath}` : basePath;
}

function formatRelativeFilePath(path: string) {
  return path ? `/${path}` : "/";
}

function buildSubscriptionRelativePath(selectedSite: SubscriptionFilesSite | null, currentPath: string) {
  if (!selectedSite) {
    return "/";
  }

  const rootFolder = extractRootLabel(selectedSite.physicalPath, selectedSite.siteName);
  return currentPath ? `/${rootFolder}/${currentPath}` : `/${rootFolder}`;
}

function isEditableFileEntry(entry: SiteFileEntry) {
  if (entry.entryType !== "file") {
    return false;
  }

  const normalizedName = entry.name.trim().toLowerCase();
  const extension = normalizedName.includes(".") ? normalizedName.split(".").pop() ?? "" : "";
  return EDITABLE_FILE_NAMES.has(normalizedName) || EDITABLE_FILE_EXTENSIONS.has(extension);
}

function getEntryTone(entry: SiteFileEntry) {
  if (entry.entryType === "directory") {
    return "folder";
  }

  const extension = entry.name.includes(".") ? entry.name.split(".").pop()?.toLowerCase() ?? "" : "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "avif"].includes(extension)) {
    return "image";
  }
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(extension)) {
    return "video";
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return "archive";
  }
  if (["js", "jsx", "ts", "tsx", "css", "scss", "html", "php", "cs", "json", "xml", "yml", "yaml"].includes(extension)) {
    return "code";
  }
  return "text";
}

function renderEntryIcon(entry: SiteFileEntry) {
  const tone = getEntryTone(entry);
  if (tone === "folder") {
    return <Folder size={18} />;
  }
  if (tone === "image") {
    return <FileImage size={18} />;
  }
  if (tone === "video") {
    return <FileVideo2 size={18} />;
  }
  if (tone === "archive") {
    return <FileArchive size={18} />;
  }
  if (tone === "code") {
    return <FileCode2 size={18} />;
  }
  return <FileText size={18} />;
}

export function SubscriptionFilesPage() {
  const { t } = useLocalization();
  const { subId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSiteId = searchParams.get("siteId") ?? "";
  const currentPath = searchParams.get("path") ?? "";
  const [summary, setSummary] = useState<SubscriptionFilesResponse | null>(null);
  const [browser, setBrowser] = useState<SiteFileBrowserResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingBrowser, setLoadingBrowser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [composerValue, setComposerValue] = useState("");
  const [pathCopied, setPathCopied] = useState(false);
  const [editorFile, setEditorFile] = useState<SiteFileContentResponse | null>(null);
  const [editorDraft, setEditorDraft] = useState("");
  const [editorOriginal, setEditorOriginal] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Rename state
  const [renamingEntry, setRenamingEntry] = useState<SiteFileEntry | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Editor and drag state
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">("light");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSiteId || busyAction !== null) return;
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSiteId || busyAction !== null) return;
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSiteId || busyAction !== null) return;
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  const editorRequestRef = useRef(0);
  const editorAutoCloseTimeoutRef = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(searchText);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 3600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  useEffect(() => {
    if (!pathCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPathCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathCopied]);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId) {
      setLoadingSummary(false);
      return;
    }
    const activeSession = session;
    const currentSubId = subId;

    let active = true;
    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setError(null);
        const response = await getSubscriptionFiles(activeSession, currentSubId);
        if (active) {
          setSummary(response);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : t("Failed to load subscription files.", "Failed to load subscription files."));
          setSummary(null);
        }
      } finally {
        if (active) {
          setLoadingSummary(false);
        }
      }
    }

    void loadSummary();
    return () => {
      active = false;
    };
  }, [refreshTick, subId]);

  useEffect(() => {
    if (!summary) {
      return;
    }

    if (summary.sites.length === 0) {
      if (selectedSiteId || currentPath) {
        setSearchParams(buildSearchParams("", ""));
      }
      setError(null);
      return;
    }

    const selectedExists = summary.sites.some((site) => site.siteId === selectedSiteId);
    if (selectedSiteId && !selectedExists) {
      setError(null);
      setSearchParams(buildSearchParams("", ""));
      return;
    }

    if (!selectedSiteId && currentPath) {
      setError(null);
      setSearchParams(buildSearchParams("", ""));
    }
  }, [summary, selectedSiteId, currentPath, setSearchParams]);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId) {
      setBrowser(null);
      if (summary) {
        setError(null);
      }
      return;
    }
    const activeSession = session;
    const currentSubId = subId;

    let active = true;
    async function loadBrowser() {
      try {
        setLoadingBrowser(true);
        setError(null);
        const response = await getSiteFileBrowser(activeSession, currentSubId, selectedSiteId, currentPath);
        if (active) {
          setBrowser(response);
        }
      } catch (loadError) {
        if (active) {
          setBrowser(null);
          setError(loadError instanceof Error ? loadError.message : t("Failed to load the file browser.", "Failed to load the file browser."));
        }
      } finally {
        if (active) {
          setLoadingBrowser(false);
        }
      }
    }

    void loadBrowser();
    return () => {
      active = false;
    };
  }, [currentPath, refreshTick, selectedSiteId, subId]);

  const blockedCount = useMemo(
    () => summary?.sites.filter((site) => site.isQuotaBlocked).length ?? 0,
    [summary],
  );

  const selectedSite = useMemo(
    () => summary?.sites.find((site) => site.siteId === selectedSiteId) ?? null,
    [summary, selectedSiteId],
  );

  const siteUsagePercent = useMemo(() => {
    if (!browser || browser.diskQuotaMb <= 0) {
      return 0;
    }

    return Math.min((browser.diskUsedBytes / (browser.diskQuotaMb * 1024 * 1024)) * 100, 100);
  }, [browser]);

  const showSubscriptionRoot = !selectedSiteId;
  const virtualRootBrowser = useMemo<SiteFileBrowserResponse | null>(() => {
    if (!summary || !showSubscriptionRoot) {
      return null;
    }

    const rootPath = deriveSubscriptionRootPath(summary.sites);
    const folderEntries = summary.sites
      .map((site) => ({
        siteId: site.siteId,
        folderName: extractRootLabel(site.physicalPath, site.siteName),
        lastScannedUtc: site.lastScannedUtc,
      }))
      .sort((left, right) => left.folderName.localeCompare(right.folderName));

    return {
      subscription: summary.subscription,
      siteId: "",
      siteName: summary.subscription.name,
      domain: "",
      physicalPath: rootPath,
      currentPath: "",
      parentPath: null,
      diskUsedBytes: summary.totalDiskUsedBytes,
      diskQuotaMb: summary.subscription.diskQuotaMb,
      fileCount: summary.totalFileCount,
      fileQuotaCount: summary.subscription.fileQuotaCount,
      isQuotaBlocked: blockedCount > 0,
      lastScannedUtc: null,
      scanError: null,
      breadcrumbs: [{ name: "Home", path: "" }],
      entries: folderEntries.map((entry) => ({
        name: entry.folderName,
        relativePath: entry.siteId,
        entryType: "directory",
        sizeBytes: 0,
        lastModifiedUtc: entry.lastScannedUtc ?? new Date(0).toISOString(),
      })),
    };
  }, [blockedCount, showSubscriptionRoot, summary]);

  const activeBrowser = showSubscriptionRoot ? virtualRootBrowser : browser;

  const filteredEntries = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const entries = activeBrowser?.entries ?? [];

    const sorted = [...entries].sort((left, right) => {
      // Always directories first
      if (left.entryType !== right.entryType) {
        return left.entryType === "directory" ? -1 : 1;
      }

      let cmp = 0;
      if (sortField === "name") {
        cmp = left.name.localeCompare(right.name);
      } else if (sortField === "size") {
        cmp = (left.sizeBytes ?? 0) - (right.sizeBytes ?? 0);
      } else if (sortField === "date") {
        cmp = new Date(left.lastModifiedUtc ?? 0).getTime() - new Date(right.lastModifiedUtc ?? 0).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((entry) => {
      const target = `${entry.name} ${entry.relativePath}`.toLowerCase();
      return target.includes(query);
    });
  }, [activeBrowser?.entries, deferredSearch, sortField, sortDir]);

  const currentDirectories = useMemo(
    () => browser?.entries.filter((entry) => entry.entryType === "directory") ?? [],
    [browser],
  );

  const subscriptionRootPath = useMemo(
    () => deriveSubscriptionRootPath(summary?.sites ?? []),
    [summary?.sites],
  );

  const siteFolders = useMemo(
    () =>
      (summary?.sites ?? [])
        .map((site) => ({
          site,
          folderName: extractRootLabel(site.physicalPath, site.siteName),
        }))
        .sort((left, right) => left.folderName.localeCompare(right.folderName)),
    [summary?.sites],
  );

  const rootLabel = useMemo(
    () => extractRootLabel(subscriptionRootPath, summary?.subscription.name ?? "subscription-root"),
    [subscriptionRootPath, summary?.subscription.name],
  );

  const currentSegments = useMemo(() => getPathSegments(currentPath), [currentPath]);
  const absoluteCurrentPath = useMemo(() => buildAbsoluteFilePath(browser), [browser]);
  const displayRelativePath = useMemo(
    () => buildSubscriptionRelativePath(selectedSite, browser?.currentPath ?? currentPath),
    [browser?.currentPath, currentPath, selectedSite],
  );
  const displayedAbsolutePath = useMemo(() => {
    if (selectedSiteId) return absoluteCurrentPath;
    if (subscriptionRootPath.startsWith('/')) return subscriptionRootPath.replace(/\/+$/, '') + '/';
    return ensureTrailingBackslash(subscriptionRootPath);
  }, [absoluteCurrentPath, selectedSiteId, subscriptionRootPath]);
  const rootEntrySiteMap = useMemo(
    () => new Map(siteFolders.map(({ site }) => [site.siteId, site])),
    [siteFolders],
  );
  const editorDirty = editorFile !== null && editorDraft !== editorOriginal;
  const editorBusy = editorLoading || editorSaving;

  function clearEditorAutoClose() {
    if (editorAutoCloseTimeoutRef.current !== null) {
      window.clearTimeout(editorAutoCloseTimeoutRef.current);
      editorAutoCloseTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    editorRequestRef.current += 1;
    clearEditorAutoClose();
    setEditorFile(null);
    setEditorDraft("");
    setEditorOriginal("");
    setEditorError(null);
  }, [currentPath, selectedSiteId]);

  useEffect(() => {
    return () => {
      clearEditorAutoClose();
    };
  }, []);

  function openComposer(mode: Exclude<ComposerMode, null>) {
    setComposerMode(mode);
    setComposerValue("");
    setMessage(null);
    setError(null);
  }

  function closeComposer() {
    setComposerMode(null);
    setComposerValue("");
  }

  function closeEditor(options?: { skipConfirm?: boolean }) {
    if (!options?.skipConfirm && editorDirty && !window.confirm(t("Discard the unsaved changes in this file?", "Discard the unsaved changes in this file?"))) {
      return;
    }

    editorRequestRef.current += 1;
    clearEditorAutoClose();
    setEditorFile(null);
    setEditorDraft("");
    setEditorOriginal("");
    setEditorError(null);
    setEditorLoading(false);
    setEditorSaving(false);
  }

  async function refreshNow() {
    setMessage(null);
    setRefreshTick((tick) => tick + 1);
  }

  function updatePath(path: string) {
    setSearchParams(buildSearchParams(selectedSiteId, path));
  }

  function openSubscriptionRoot() {
    setSearchParams(buildSearchParams("", ""));
  }

  function openSiteRoot(siteId: string) {
    setSearchParams(buildSearchParams(siteId, ""));
  }

  async function handleEdit(entry: SiteFileEntry) {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId || !isEditableFileEntry(entry)) {
      return;
    }

    const requestId = editorRequestRef.current + 1;
    try {
      editorRequestRef.current = requestId;
      clearEditorAutoClose();
      setEditorLoading(true);
      setEditorError(null);
      setMessage(null);
      setEditorFile(null);
      setEditorDraft("");
      setEditorOriginal("");
      const file = await getSiteFileContent(session, subId, selectedSiteId, entry.relativePath);
      if (editorRequestRef.current !== requestId) {
        return;
      }
      setEditorFile(file);
      setEditorDraft(file.content);
      setEditorOriginal(file.content);
    } catch (editorLoadError) {
      if (editorRequestRef.current === requestId) {
        setEditorError(editorLoadError instanceof Error ? editorLoadError.message : t("Couldn't open that file for editing.", "Couldn't open that file for editing."));
      }
    } finally {
      if (editorRequestRef.current === requestId) {
        setEditorLoading(false);
      }
    }
  }

  async function handleSaveEditor() {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId || !editorFile) {
      return;
    }

    try {
      clearEditorAutoClose();
      setEditorSaving(true);
      setEditorError(null);
      const result: SiteFileContentSaveResponse = await saveSiteFileContent(session, subId, selectedSiteId, {
        path: editorFile.relativePath,
        content: editorDraft,
      });
      setEditorOriginal(editorDraft);
      setEditorFile({
        ...editorFile,
        content: editorDraft,
        sizeBytes: result.sizeBytes,
        lastModifiedUtc: result.lastModifiedUtc,
      });
      setMessage(result.message);
      setRefreshTick((tick) => tick + 1);
      editorAutoCloseTimeoutRef.current = window.setTimeout(() => {
        closeEditor({ skipConfirm: true });
      }, 1500);
    } catch (saveError) {
      setEditorError(saveError instanceof Error ? saveError.message : t("Couldn't save that file.", "Couldn't save that file."));
    } finally {
      setEditorSaving(false);
    }
  }

  async function handleCopyDisplayedPath() {
    if (!displayedAbsolutePath) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(displayedAbsolutePath);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = displayedAbsolutePath;
        textArea.setAttribute("readonly", "true");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.append(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setPathCopied(true);
      setMessage(null);
      setError(null);
    } catch {
      setError(t("Couldn't copy the file path.", "Couldn't copy the file path."));
    }
  }

  async function runAction(actionKey: string, action: () => Promise<void>) {
    try {
      setBusyAction(actionKey);
      setError(null);
      setMessage(null);
      await action();
      setRefreshTick((tick) => tick + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t("That action failed.", "That action failed."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateFolder() {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId || !composerValue.trim()) {
      return;
    }

    await runAction("create-folder", async () => {
      const result = await createSiteFolder(session, subId, selectedSiteId, {
        parentPath: currentPath,
        name: composerValue.trim(),
      });
      closeComposer();
      setMessage(result.message);
    });
  }

  async function handleCreateFile() {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId || !composerValue.trim()) {
      return;
    }

    await runAction("create-file", async () => {
      const result = await createSiteEmptyFile(session, subId, selectedSiteId, {
        parentPath: currentPath,
        name: composerValue.trim(),
      });
      closeComposer();
      setMessage(result.message);
    });
  }

  async function handleDelete(entry: SiteFileEntry) {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId) {
      return;
    }

    const confirmed = window.confirm(t("Delete {name} permanently?", "Delete {name} permanently?").replace("{name}", entry.name));
    if (!confirmed) {
      return;
    }

    await runAction(`delete:${entry.relativePath}`, async () => {
      const result = await deleteSiteFile(session, subId, selectedSiteId, entry.relativePath);
      setMessage(result.message);
      if (browser && browser.currentPath !== result.currentPath) {
        updatePath(result.currentPath);
      }
    });
  }

  function startRename(entry: SiteFileEntry) {
    setRenamingEntry(entry);
    setRenameValue(entry.name);
    setTimeout(() => {
      renameInputRef.current?.select();
    }, 50);
  }

  function cancelRename() {
    setRenamingEntry(null);
    setRenameValue("");
  }

  async function commitRename() {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId || !renamingEntry) return;
    const newName = renameValue.trim();
    if (!newName || newName === renamingEntry.name) {
      cancelRename();
      return;
    }

    const entry = renamingEntry;
    cancelRename();

    await runAction(`rename:${entry.relativePath}`, async () => {
      const result = await renameSiteEntry(session, subId, selectedSiteId, entry.relativePath, newName);
      setMessage(result.message);
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  async function handleDownload(entry: SiteFileEntry) {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId) {
      return;
    }

    await runAction(`download:${entry.relativePath}`, async () => {
      const result = await downloadSiteFile(session, subId, selectedSiteId, entry.relativePath);
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = result.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage(t("Downloaded {fileName}.", "Downloaded {fileName}.").replace("{fileName}", result.fileName));
    });
  }

  async function handleUpload(files: FileList | null) {
    const session = getCustomerSession();
    if (!session || !subId || !selectedSiteId || !files?.length) {
      return;
    }

    await runAction("upload", async () => {
      const result = await uploadSiteFiles(session, subId, selectedSiteId, currentPath, Array.from(files));
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      setMessage(result.message);
    });
  }

  async function handlePrimaryAction(entry: SiteFileEntry) {
    if (entry.entryType === "directory") {
      if (showSubscriptionRoot) {
        openSiteRoot(entry.relativePath);
        return;
      }

      updatePath(entry.relativePath);
      return;
    }

    if (isEditableFileEntry(entry)) {
      await handleEdit(entry);
      return;
    }

    await handleDownload(entry);
  }

  if (loadingSummary) {
    return <div className="empty-panel">{t("Loading file manager...", "Loading file manager...")}</div>;
  }

  if (error && !summary) {
    return <div className="inline-message inline-message--error">{error}</div>;
  }

  if (!summary) {
    return <div className="inline-message inline-message--error">{t("Subscription files module not found.", "Subscription files module not found.")}</div>;
  }

  return (
    <div className="files-workbench">
      <section className="files-workbench__toolbar">
        <div className="files-workbench__toolbar-title">
          <h1>{t("File Manager", "File Manager")}</h1>
          <p>
            {selectedSite
              ? `${selectedSite.siteName} - ${selectedSite.domain}`
              : displayedAbsolutePath || t("Open a site folder to start browsing.", "Open a site folder to start browsing.")}
          </p>
        </div>

        <div className="files-workbench__toolbar-actions">
          <label className="files-workbench__btn files-workbench__btn--primary" aria-disabled={!selectedSiteId || busyAction !== null}>
            <Upload size={16} />
            {t("Upload", "Upload")}
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              hidden
              disabled={!selectedSiteId || busyAction !== null}
              onChange={(event) => void handleUpload(event.target.files)}
            />
          </label>

          <button type="button" className="files-workbench__btn" onClick={() => openComposer("folder")} disabled={!selectedSiteId || busyAction !== null}>
            <FolderPlus size={16} />
            {t("New Folder", "New Folder")}
          </button>

          <button type="button" className="files-workbench__btn" onClick={() => openComposer("file")} disabled={!selectedSiteId || busyAction !== null}>
            <FilePlus2 size={16} />
            {t("New File", "New File")}
          </button>

          <div className="files-workbench__search">
            <Search size={16} />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={t("Search files...", "Search files...")}
              disabled={!browser && !showSubscriptionRoot}
            />
          </div>

          <div className="files-workbench__sort-group">
            <button type="button" className={`files-workbench__sort-btn ${sortField === "name" ? "is-active" : ""}`} onClick={() => toggleSort("name")}>
              {t("Name", "Name")}
              {sortField === "name" ? (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : null}
            </button>
            <button type="button" className={`files-workbench__sort-btn ${sortField === "size" ? "is-active" : ""}`} onClick={() => toggleSort("size")}>
              {t("Size", "Size")}
              {sortField === "size" ? (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : null}
            </button>
            <button type="button" className={`files-workbench__sort-btn ${sortField === "date" ? "is-active" : ""}`} onClick={() => toggleSort("date")}>
              {t("Date", "Date")}
              {sortField === "date" ? (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : null}
            </button>
          </div>

          <div className="files-workbench__view-switch" aria-label={t("View mode", "View mode")}>
            <button type="button" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")} aria-label={t("Grid view", "Grid view")}>
              <LayoutGrid size={16} />
            </button>
            <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")} aria-label={t("List view", "List view")}>
              <List size={16} />
            </button>
          </div>

          <button type="button" className="files-workbench__icon-btn" onClick={refreshNow} disabled={busyAction !== null} aria-label={t("Refresh files", "Refresh files")}>
            <RefreshCw size={16} />
          </button>
        </div>
      </section>

      <div className="files-workbench__shell">
        <aside className="files-workbench__sidebar">
          <div className="files-workbench__sidebar-site">
            <span>{t("Workspace", "Workspace")}</span>
            <select
              value={selectedSiteId}
              onChange={(event) => setSearchParams(buildSearchParams(event.target.value, ""))}
              disabled={summary.sites.length === 0 || busyAction !== null}
            >
              {summary.sites.length > 0 ? <option value="">{t("Subscription root", "Subscription root")}</option> : null}
              {summary.sites.length === 0 ? <option value="">{t("No sites", "No sites")}</option> : null}
              {summary.sites.map((site) => (
                <option key={site.siteId} value={site.siteId}>
                  {site.siteName} - {site.domain}
                </option>
              ))}
            </select>
          </div>

          <div className="files-workbench__tree">
            <div className="files-workbench__tree-heading">{t("Folders", "Folders")}</div>

            <button
              type="button"
              className={`files-workbench__tree-node files-workbench__tree-node--root ${showSubscriptionRoot ? "is-active" : ""}`}
              onClick={openSubscriptionRoot}
              disabled={busyAction !== null}
            >
              <Folder size={16} />
              <span>{rootLabel}</span>
            </button>

            <div className="files-workbench__tree-children">
              {siteFolders.map(({ site, folderName }) => {
                const isActiveSite = selectedSiteId === site.siteId;
                return (
                  <div key={site.siteId}>
                    <button
                      type="button"
                      className={`files-workbench__tree-node files-workbench__tree-node--nested ${isActiveSite && currentPath === "" ? "is-active" : ""}`}
                      onClick={() => openSiteRoot(site.siteId)}
                      disabled={busyAction !== null}
                    >
                      <Folder size={15} />
                      <span>{folderName}</span>
                    </button>

                    {isActiveSite ? (
                      <div className="files-workbench__tree-branch">
                        {currentPath ? currentSegments.map((segment, index) => {
                          const segmentPath = currentSegments.slice(0, index + 1).join("/");
                          return (
                            <button
                              key={segmentPath}
                              type="button"
                              className={`files-workbench__tree-node files-workbench__tree-node--leaf ${currentPath === segmentPath ? "is-active" : ""}`}
                              onClick={() => updatePath(segmentPath)}
                              disabled={busyAction !== null}
                            >
                              <Folder size={15} />
                              <span>{segment}</span>
                            </button>
                          );
                        }) : null}

                        {currentDirectories.map((child) => (
                          <button
                            key={child.relativePath}
                            type="button"
                            className="files-workbench__tree-node files-workbench__tree-node--leaf"
                            onClick={() => updatePath(child.relativePath)}
                            disabled={busyAction !== null}
                          >
                            <Folder size={15} />
                            <span>{child.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section
          className="files-workbench__main"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ position: "relative" }}
        >
            {isDragging && (
            <div
              className="files-workbench__drag-overlay"
              style={{
                position: "absolute",
                inset: 8,
                borderRadius: 14,
                background: "rgba(37, 99, 235, 0.06)",
                border: "2px dashed #2563eb",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "#2563eb",
                zIndex: 40,
                backdropFilter: "blur(2px)",
                pointerEvents: "none"
              }}
            >
              <Upload size={32} style={{ animation: "bounce 1s infinite" }} />
              <strong style={{ fontSize: "1.05rem" }}>{t("Drop files to upload", "Drop files to upload")}</strong>
              <span style={{ fontSize: "0.8rem", opacity: 0.85 }}>{t("Uploading to: {path}", "Uploading to: {path}").replace("{path}", currentPath || "/")}</span>
            </div>
          )}
          <div className="files-workbench__main-head">
            {showSubscriptionRoot ? (
              <div className="files-workbench__breadcrumbs">
                <span className="is-active">{t("Home", "Home")}</span>
              </div>
            ) : browser ? (
              <nav className="files-workbench__breadcrumbs" aria-label={t("File path", "File path")}>
                <button type="button" onClick={openSubscriptionRoot} disabled={busyAction !== null}>
                  {t("Home", "Home")}
                </button>
                <button
                  type="button"
                  className={browser.currentPath === "" ? "is-active" : ""}
                  onClick={() => openSiteRoot(selectedSiteId)}
                  disabled={busyAction !== null}
                >
                  {extractRootLabel(selectedSite?.physicalPath, selectedSite?.siteName ?? "site")}
                </button>
                {browser.breadcrumbs.slice(1).map((crumb) => (
                  <button
                    key={crumb.path}
                    type="button"
                    className={crumb.path === browser.currentPath ? "is-active" : ""}
                    onClick={() => updatePath(crumb.path)}
                    disabled={busyAction !== null}
                  >
                    {crumb.name}
                  </button>
                ))}
              </nav>
            ) : (
              <div className="files-workbench__breadcrumbs">
                <span className="is-active">{t("Home", "Home")}</span>
              </div>
            )}

            <div className="files-workbench__main-meta">
              <span>
                {showSubscriptionRoot
                  ? t("{count} site folders", "{count} site folders").replace("{count}", String(filteredEntries.length))
                  : browser
                    ? t("{count} items", "{count} items").replace("{count}", String(filteredEntries.length))
                    : t("No directory loaded", "No directory loaded")}
              </span>
              <span>{showSubscriptionRoot ? "/" : displayRelativePath}</span>
            </div>
          </div>

          {(browser || showSubscriptionRoot) ? (
            <div className="files-workbench__pathbar" aria-label={t("Current file path", "Current file path")}>
              <div className="files-workbench__pathbar-copy">
                <span className="files-workbench__pathbar-label">{t("File Path", "File Path")}</span>
                <strong>{showSubscriptionRoot ? "/" : displayRelativePath}</strong>
              </div>
              <div className="files-workbench__pathbar-actions">
                <code className="files-workbench__pathbar-value">{displayedAbsolutePath}</code>
                <button
                  type="button"
                  className={`files-workbench__pathbar-button ${pathCopied ? "is-copied" : ""}`}
                  onClick={() => void handleCopyDisplayedPath()}
                  disabled={!displayedAbsolutePath}
                  aria-label={pathCopied ? t("Path copied", "Path copied") : t("Copy file path", "Copy file path")}
                >
                  {pathCopied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{pathCopied ? t("Copied", "Copied") : t("Copy", "Copy")}</span>
                </button>
              </div>
            </div>
          ) : null}


          {message ? <div className="inline-message inline-message--success files-workbench__notice">{message}</div> : null}
          {error ? <div className="inline-message inline-message--error files-workbench__notice">{error}</div> : null}
          {browser?.scanError ? <div className="inline-message inline-message--error files-workbench__notice">{browser.scanError}</div> : null}
          {browser?.isQuotaBlocked ? (
            <div className="inline-message inline-message--warn files-workbench__notice">
              {t("This site is currently quota-blocked. Remove files before uploading or creating new content.", "This site is currently quota-blocked. Remove files before uploading or creating new content.")}
            </div>
          ) : null}

          {loadingBrowser ? (
            <div className="files-workbench__empty-state">
              <h2>{t("Loading files...", "Loading files...")}</h2>
              <p>{t("We're refreshing the real directory state from the hosting node.", "We're refreshing the real directory state from the hosting node.")}</p>
            </div>
          ) : !activeBrowser ? (
            <div className="files-workbench__empty-state">
              <h2>{t("Choose a site folder to open its files.", "Choose a site folder to open its files.")}</h2>
              <p>{t("The shared hosting root appears first, then each site opens inside its own physical path.", "The shared hosting root appears first, then each site opens inside its own physical path.")}</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="files-workbench__empty-state">
              <h2>{activeBrowser.entries.length === 0 ? t("This directory is empty.", "This directory is empty.") : t("No files match that search.", "No files match that search.")}</h2>
              <p>
                {activeBrowser.entries.length === 0
                  ? t("Upload files, create a folder, or add an empty file to populate this directory.", "Upload files, create a folder, or add an empty file to populate this directory.")
                  : t("Try a different search term or clear the filter to see the full directory.", "Try a different search term or clear the filter to see the full directory.")}
              </p>
            </div>
          ) : (
            <div className="files-workbench__files-area">
              {viewMode === "grid" ? (
            <div className="files-workbench__grid">
              {filteredEntries.map((entry) => {
                const tone = getEntryTone(entry);
                const rootSite = showSubscriptionRoot ? rootEntrySiteMap.get(entry.relativePath) ?? null : null;
                const isRenaming = renamingEntry?.relativePath === entry.relativePath;
                return (
                  <article key={entry.relativePath} className="files-workbench__card">
                    <button type="button" className="files-workbench__card-main" onClick={() => void handlePrimaryAction(entry)} disabled={busyAction !== null || isRenaming}>
                      <div className={`files-workbench__card-icon is-${tone}`}>
                        {renderEntryIcon(entry)}
                      </div>
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          className="files-workbench__rename-input"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") void commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          onBlur={() => void commitRename()}
                          autoFocus
                        />
                      ) : (
                        <strong>{entry.name}</strong>
                      )}
                      <span>
                        {showSubscriptionRoot
                          ? `${rootSite?.siteName ?? entry.name} - ${rootSite?.domain ?? ""}`.replace(/\s-\s$/, "")
                          : entry.entryType === "directory"
                            ? t("Folder", "Folder")
                            : formatBytes(entry.sizeBytes)}
                      </span>
                    </button>
                    <div className="files-workbench__card-footer">
                      <small>{showSubscriptionRoot ? formatBytes(rootSite?.diskUsedBytes ?? 0) : formatDateCompact(entry.lastModifiedUtc, t)}</small>
                      <div className="files-workbench__card-actions">
                        {entry.entryType === "file" ? (
                          <>
                            {isEditableFileEntry(entry) ? (
                              <button type="button" onClick={() => void handleEdit(entry)} disabled={busyAction !== null || editorLoading} title={t("Edit file", "Edit file")}>
                                <Pencil size={14} />
                              </button>
                            ) : null}
                            <button type="button" onClick={() => void handleDownload(entry)} disabled={busyAction !== null} title={t("Download", "Download")}>
                              <Download size={14} />
                            </button>
                          </>
                        ) : null}
                        {!showSubscriptionRoot ? (
                          <>
                            <button type="button" onClick={() => startRename(entry)} disabled={busyAction !== null} title={t("Rename", "Rename")}>
                              <Type size={14} />
                            </button>
                            <button type="button" className="is-danger" onClick={() => void handleDelete(entry)} disabled={busyAction !== null} title={t("Delete", "Delete")}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="files-workbench__list">
              <div className="files-workbench__list-head">
                <button type="button" className={`files-workbench__list-sort ${sortField === "name" ? "is-active" : ""}`} onClick={() => toggleSort("name")}>
                  {t("Name", "Name")} {sortField === "name" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
                </button>
                <button type="button" className={`files-workbench__list-sort ${sortField === "date" ? "is-active" : ""}`} onClick={() => !showSubscriptionRoot && toggleSort("date")}>
                  {showSubscriptionRoot ? t("Website", "Website") : <>{t("Updated", "Updated")} {sortField === "date" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}</>}
                </button>
                <button type="button" className={`files-workbench__list-sort ${sortField === "size" ? "is-active" : ""}`} onClick={() => !showSubscriptionRoot && toggleSort("size")}>
                  {showSubscriptionRoot ? t("Usage", "Usage") : <>{t("Size", "Size")} {sortField === "size" ? (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}</>}
                </button>
                <span className="is-right">{t("Actions", "Actions")}</span>
              </div>
              {filteredEntries.map((entry) => {
                const tone = getEntryTone(entry);
                const rootSite = showSubscriptionRoot ? rootEntrySiteMap.get(entry.relativePath) ?? null : null;
                const isRenaming = renamingEntry?.relativePath === entry.relativePath;
                return (
                  <div key={entry.relativePath} className="files-workbench__list-row">
                    <button type="button" className="files-workbench__list-entry" onClick={() => void handlePrimaryAction(entry)} disabled={busyAction !== null || isRenaming}>
                      <div className={`files-workbench__card-icon is-${tone}`}>
                        {renderEntryIcon(entry)}
                      </div>
                      <div>
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            type="text"
                            className="files-workbench__rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") void commitRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            onBlur={() => void commitRename()}
                            autoFocus
                          />
                        ) : (
                          <strong>{entry.name}</strong>
                        )}
                        <span>{showSubscriptionRoot ? rootSite?.physicalPath ?? displayedAbsolutePath : entry.relativePath}</span>
                      </div>
                    </button>
                    <span>{showSubscriptionRoot ? `${rootSite?.siteName ?? ""} - ${rootSite?.domain ?? ""}`.replace(/\s-\s$/, "") : formatDate(entry.lastModifiedUtc, t)}</span>
                    <span>{showSubscriptionRoot ? formatBytes(rootSite?.diskUsedBytes ?? 0) : entry.entryType === "directory" ? t("Folder", "Folder") : formatBytes(entry.sizeBytes)}</span>
                    <div className="files-workbench__card-actions is-inline">
                      {entry.entryType === "directory" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (showSubscriptionRoot) {
                              openSiteRoot(entry.relativePath);
                              return;
                            }
                            updatePath(entry.relativePath);
                          }}
                          disabled={busyAction !== null}
                        >
                          {t("Open", "Open")}
                        </button>
                      ) : (
                        <>
                          {isEditableFileEntry(entry) ? (
                            <button type="button" onClick={() => void handleEdit(entry)} disabled={busyAction !== null || editorLoading}>
                              <Pencil size={14} />
                              {t("Edit", "Edit")}
                            </button>
                          ) : null}
                          <button type="button" onClick={() => void handleDownload(entry)} disabled={busyAction !== null}>
                            <Download size={14} />
                            {t("Download", "Download")}
                          </button>
                        </>
                      )}
                      {!showSubscriptionRoot ? (
                        <>
                          <button type="button" onClick={() => startRename(entry)} disabled={busyAction !== null}>
                            <Type size={14} />
                            {t("Rename", "Rename")}
                          </button>
                          <button type="button" className="is-danger" onClick={() => void handleDelete(entry)} disabled={busyAction !== null}>
                            <Trash2 size={14} />
                            {t("Delete", "Delete")}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
              )}
            </div>
          )}
        </section>
      </div>

      {editorLoading || editorFile ? (
        <div
          className="files-workbench__editor-backdrop"
          onClick={() => {
            if (!editorSaving) {
              closeEditor();
            }
          }}
        >
          <section
            className="files-workbench__editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-editor-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (editorDirty && !editorBusy) void handleSaveEditor();
              }
              if (e.key === "Escape" && !editorSaving) closeEditor();
            }}
          >
            <header className="files-workbench__editor-head">
              <div className="files-workbench__editor-copy">
                <span className="files-workbench__editor-eyebrow">{t("Text editor", "Text editor")}</span>
                <h2 id="file-editor-title">{editorFile?.fileName ?? t("Opening file...", "Opening file...")}</h2>
                <p>{editorFile?.absolutePath ?? t("Fetching the latest text content from the hosting node.", "Fetching the latest text content from the hosting node.")}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {editorFile && (
                  <button
                    type="button"
                    title={editorTheme === "dark" ? t("Switch to light theme", "Switch to light theme") : t("Switch to dark theme", "Switch to dark theme")}
                    onClick={() => setEditorTheme(editorTheme === "dark" ? "light" : "dark")}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {editorTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                  </button>
                )}
                <button
                  type="button"
                  className="files-workbench__editor-close"
                  onClick={() => closeEditor()}
                  disabled={editorSaving}
                  aria-label={t("Close editor", "Close editor")}
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {editorLoading && !editorFile ? (
              <div className="files-workbench__editor-loading">
                <h3>{t("Opening file...", "Opening file...")}</h3>
                <p>{t("We're loading the latest contents from the hosting node.", "We're loading the latest contents from the hosting node.")}</p>
              </div>
            ) : editorFile ? (
              <>
                <div className="files-workbench__editor-meta">
                  <span>{editorFile.relativePath}</span>
                  <span>{formatBytes(editorFile.sizeBytes)}</span>
                  <span>{formatDate(editorFile.lastModifiedUtc, t)}</span>
                  <span className={editorDirty ? "is-dirty" : "is-saved"}>
                    {editorDirty ? t("Unsaved changes", "Unsaved changes") : t("All changes saved", "All changes saved")}
                  </span>
                </div>

                {editorError ? <div className="inline-message inline-message--error files-workbench__notice">{editorError}</div> : null}

                <div className={`files-workbench__editor-surface ${editorTheme === "dark" ? "is-dark-theme" : ""}`}>
                  <textarea
                    ref={editorTextareaRef}
                    value={editorDraft}
                    onChange={(event) => {
                      clearEditorAutoClose();
                      setEditorDraft(event.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const el = e.currentTarget;
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        const next = editorDraft.slice(0, start) + "    " + editorDraft.slice(end);
                        setEditorDraft(next);
                        requestAnimationFrame(() => {
                          if (editorTextareaRef.current) {
                            editorTextareaRef.current.selectionStart = start + 4;
                            editorTextareaRef.current.selectionEnd = start + 4;
                          }
                        });
                      }
                    }}
                    spellCheck={false}
                    disabled={editorBusy}
                    aria-label={t("Edit {fileName}", "Edit {fileName}").replace("{fileName}", editorFile.fileName)}
                  />
                </div>

                <footer className="files-workbench__editor-actions">
                  <button type="button" className="files-workbench__btn" onClick={() => closeEditor()} disabled={editorSaving}>
                    {t("Close", "Close")}
                  </button>
                  <button
                    type="button"
                    className="files-workbench__btn files-workbench__btn--primary"
                    onClick={() => void handleSaveEditor()}
                    disabled={!editorDirty || editorBusy}
                  >
                    <Save size={16} />
                    {editorSaving ? t("Saving...", "Saving...") : editorDirty ? t("Save changes", "Save changes") : t("Saved", "Saved")}
                  </button>
                </footer>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {composerMode ? (
        <div
          className="files-workbench__prompt-backdrop"
          onClick={closeComposer}
        >
          <div
            className="files-workbench__prompt"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeComposer();
            }}
          >
            <div className="files-workbench__prompt-icon">
              {composerMode === "folder" ? <FolderPlus size={22} /> : <FilePlus2 size={22} />}
            </div>
            <div className="files-workbench__prompt-body">
              <h3>{composerMode === "folder" ? t("New Folder", "New Folder") : t("New File", "New File")}</h3>
              <p>
                {composerMode === "folder"
                  ? t("Creating inside: {path}", "Creating inside: {path}").replace("{path}", displayRelativePath)
                  : t("Creating inside: {path}", "Creating inside: {path}").replace("{path}", displayRelativePath)}
              </p>
              <input
                type="text"
                className="files-workbench__prompt-input"
                value={composerValue}
                onChange={(e) => setComposerValue(e.target.value)}
                placeholder={composerMode === "folder" ? t("folder-name", "folder-name") : t("file.txt", "file.txt")}
                disabled={busyAction !== null}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && composerValue.trim()) {
                    void (composerMode === "folder" ? handleCreateFolder() : handleCreateFile());
                  }
                  if (e.key === "Escape") closeComposer();
                }}
              />
            </div>
            <div className="files-workbench__prompt-actions">
              <button type="button" className="files-workbench__btn" onClick={closeComposer} disabled={busyAction !== null}>
                {t("Cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="files-workbench__btn files-workbench__btn--primary"
                onClick={() => void (composerMode === "folder" ? handleCreateFolder() : handleCreateFile())}
                disabled={!composerValue.trim() || busyAction !== null}
              >
                {busyAction ? t("Creating...", "Creating...") : composerMode === "folder" ? t("Create Folder", "Create Folder") : t("Create File", "Create File")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="files-workbench__footer">
        <div className="files-workbench__footer-copy">
          <HardDrive size={16} />
          <span>
            {t("Storage", "Storage")}: {selectedSiteId && browser ? t("{used} of {total} MB used", "{used} of {total} MB used").replace("{used}", formatBytes(browser.diskUsedBytes)).replace("{total}", browser.diskQuotaMb.toLocaleString()) : t("{used} across subscription", "{used} across subscription").replace("{used}", formatBytes(summary.totalDiskUsedBytes))}
          </span>
        </div>

        <div className="files-workbench__footer-meta">
          <div className="files-workbench__storage-bar">
            <span style={{ width: `${siteUsagePercent}%` }} />
          </div>
          <span>{selectedSiteId && browser ? `${Math.round(siteUsagePercent)}%` : t("{count} blocked", "{count} blocked").replace("{count}", String(blockedCount))}</span>
        </div>

        <div className="files-workbench__footer-status">
          {selectedSiteId && browser?.isQuotaBlocked ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
          <span>
            {selectedSiteId && browser?.isQuotaBlocked
              ? t("Quota block active", "Quota block active")
              : displayedAbsolutePath || t("All actions stay inside the shared hosting root.", "All actions stay inside the shared hosting root.")}
          </span>
        </div>
      </footer>
    </div>
  );
}

