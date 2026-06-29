# Fix theme colors in index.css - safe version
# Reads the file with proper encoding, applies regex replacements, writes back preserving newlines

$file = "c:\Users\Administrator\Desktop\hosting_web\customer-control-panel\src\styles\index.css"
$content = [System.IO.File]::ReadAllText($file)

Write-Host "Original file size: $($content.Length) chars"

# ========== STEP 1: Replace :root block to add theme variables ==========
$oldRoot = @"
:root {
  color-scheme: light;
  --bg: #f4f7fb;
  --surface: #ffffff;
  --surface-soft: #f8fbff;
  --border: #dfe7f3;
  --text: #162033;
  --muted: #637089;
  --primary: #2563eb;
  --primary-soft: #e8f0ff;
  --success: #169b62;
  --warning: #c07a13;
  --error: #dc2626;
  --error-soft: #fef2f2;
  --shadow: 0 24px 60px rgba(43, 73, 125, 0.08);
  --radius: 24px;
  font-family: "Inter", "Segoe UI", -apple-system, sans-serif;
}
"@

$newRoot = @"
:root {
  color-scheme: light;
  --bg: #f4f7fb;
  --surface: #ffffff;
  --surface-soft: #f8fbff;
  --border: #dfe7f3;
  --text: #162033;
  --muted: #637089;
  --primary: #2563eb;
  --primary-soft: #e8f0ff;
  --success: #169b62;
  --warning: #c07a13;
  --error: #dc2626;
  --error-soft: #fef2f2;
  --shadow: 0 24px 60px rgba(43, 73, 125, 0.08);
  --radius: 24px;
  font-family: "Inter", "Segoe UI", -apple-system, sans-serif;

  /* Theme-specific custom styles */
  --bg-gradient-top: #f9fbff;
  --bg-gradient-radial: rgba(37, 99, 235, 0.08);
  --topbar-bg: rgba(255, 255, 255, 0.88);
  --topbar-border: rgba(223, 231, 243, 0.9);
  --card-bg-top: rgba(255, 255, 255, 0.98);
  --card-bg-bottom: rgba(247, 250, 255, 0.98);
  --input-bg: #ffffff;
  --input-border: #dfe7f3;
}

:root.theme-dark {
  color-scheme: dark;
  --bg: #0b0f19;
  --surface: #151b2c;
  --surface-soft: #1e263d;
  --border: #24304f;
  --text: #f3f4f6;
  --muted: #9ca3af;
  --primary: #3b82f6;
  --primary-soft: #1e293b;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --error-soft: #451a1a;
  --shadow: 0 24px 60px rgba(0, 0, 0, 0.5);

  --bg-gradient-top: #0e1322;
  --bg-gradient-radial: rgba(59, 130, 246, 0.15);
  --topbar-bg: rgba(21, 27, 44, 0.88);
  --topbar-border: rgba(36, 48, 79, 0.9);
  --card-bg-top: rgba(21, 27, 44, 0.98);
  --card-bg-bottom: rgba(15, 20, 35, 0.98);
  --input-bg: #151b2c;
  --input-border: #24304f;
}

:root.theme-classic {
  color-scheme: light;
  --bg: #f4eae1;
  --surface: #fffdfa;
  --surface-soft: #faf3ea;
  --border: #e6d3c0;
  --text: #2c2520;
  --muted: #7d6b5e;
  --primary: #8b5a2b;
  --primary-soft: #f4eae1;
  --success: #3f6844;
  --warning: #aa7a1e;
  --error: #a83232;
  --error-soft: #fbebeb;
  --shadow: 0 24px 60px rgba(139, 90, 43, 0.08);

  --bg-gradient-top: #fbf6f0;
  --bg-gradient-radial: rgba(139, 90, 43, 0.06);
  --topbar-bg: rgba(255, 253, 250, 0.88);
  --topbar-border: rgba(230, 211, 192, 0.9);
  --card-bg-top: rgba(255, 253, 250, 0.98);
  --card-bg-bottom: rgba(250, 243, 234, 0.98);
  --input-bg: #fffdfa;
  --input-border: #e6d3c0;
}
"@

$content = $content.Replace($oldRoot, $newRoot)

# ========== STEP 2: Replace body background to use variables ==========
$content = $content.Replace(
  "radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 28%),`n    linear-gradient(180deg, #f9fbff 0%, var(--bg) 100%);",
  "radial-gradient(circle at top left, var(--bg-gradient-radial), transparent 28%),`n    linear-gradient(180deg, var(--bg-gradient-top) 0%, var(--bg) 100%);"
)

# ========== STEP 3: Replace .topbar background ==========
$content = $content.Replace(
  "background: rgba(255, 255, 255, 0.88);`n  backdrop-filter: blur(18px);`n  border-bottom: 1px solid rgba(223, 231, 243, 0.9);",
  "background: var(--topbar-bg);`n  backdrop-filter: blur(18px);`n  border-bottom: 1px solid var(--topbar-border);"
)

# ========== STEP 4: Replace .card background ==========
$content = $content.Replace(
  "background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.98));",
  "background: linear-gradient(180deg, var(--card-bg-top), var(--card-bg-bottom));"
)

# ========== STEP 5: Bulk replace all hardcoded white backgrounds ==========
# Solid whites
$content = $content.Replace("background: #ffffff;", "background: var(--surface);")
$content = $content.Replace("background: #fff;", "background: var(--surface);")

# High-opacity rgba whites
$content = $content.Replace("background: rgba(255, 255, 255, 0.98);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.96);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.95);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.94);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.92);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.9);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.82);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.8);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.78);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.76);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.75);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.72);", "background: var(--surface);")
$content = $content.Replace("background: rgba(255, 255, 255, 0.62);", "background: var(--surface-soft);")

# Light backgrounds
$content = $content.Replace("background: #f1f5f9;", "background: var(--surface-soft);")
$content = $content.Replace("background: #f8fbff;", "background: var(--surface-soft);")
$content = $content.Replace("background: #f9fbff;", "background: var(--surface-soft);")

# Hardcoded text and border colors
$content = $content.Replace("color: #162033;", "color: var(--text);")
$content = $content.Replace("border: 1px solid #d4dcec;", "border: 1px solid var(--border);")
$content = $content.Replace("color: #516079;", "color: var(--muted);")

# Replace input/select border
$content = $content.Replace("border: 1px solid var(--border);`n  background: var(--surface);`n  color: var(--text);", "border: 1px solid var(--input-border);`n  background: var(--input-bg);`n  color: var(--text);")

# ========== STEP 6: Add transition rule after body rule ==========
$bodyEnd = "color: var(--text);`n}"
$bodyEndWithTransition = @"
color: var(--text);
}

body, .card, .topbar, input, select, textarea {
  transition: background 250ms ease, background-color 250ms ease, border-color 250ms ease, color 250ms ease, box-shadow 250ms ease;
}
"@
# Only add if not already present
if ($content -notmatch 'transition: background 250ms') {
  $content = $content.Replace($bodyEnd, $bodyEndWithTransition)
}

# ========== STEP 7: Append modal/language/theme styles at end ==========
$appendStyles = @"

/* Language selector button and theme toggle in topbar */
.nav-lang-selector,
.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 32px;
  margin-right: 12px;
}

.nav-lang-selector:hover,
.theme-toggle-btn:hover {
  background: var(--border);
  border-color: var(--muted);
  color: var(--text);
}

/* Modal backdrop */
.lang-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  padding: 20px;
  animation: modal-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.lang-modal-box {
  width: min(400px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 20px;
  text-align: left;
}

.lang-modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
}

.lang-modal-subtitle {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 4px 0 0 0;
}

.lang-modal-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lang-modal-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lang-modal-select {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.lang-modal-select:focus {
  border-color: var(--primary);
  background: var(--surface-soft);
}

.lang-modal-select option {
  background: var(--surface);
  color: var(--text);
}

.lang-modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.lang-modal-actions button {
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-modal-actions .btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.lang-modal-actions .btn-secondary:hover {
  background: var(--surface-soft);
}

.lang-modal-actions .btn-primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: white;
}

.lang-modal-actions .btn-primary:hover {
  opacity: 0.9;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
"@

$content = $content + $appendStyles

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)

$finalSize = (Get-Item $file).Length
Write-Host "Final file size: $finalSize bytes"
Write-Host "Theme replacement complete."
