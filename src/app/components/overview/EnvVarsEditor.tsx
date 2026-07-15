import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, CheckCircle2, Loader2 } from "lucide-react";
import type { EnvVar } from "../../lib/api-types";

interface EnvVarRow {
  name: string;
  value: string;
  isExisting: boolean;
  deleted: boolean;
}

interface EnvVarsEditorProps {
  siteId: string;
  onLoad: () => Promise<{ success: boolean; data?: EnvVar[] }>;
  onSave: (items: { name: string; value?: string | null }[]) => Promise<{ success: boolean; message: string; requiresRedeploy?: boolean }>;
}

const ENV_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function EnvVarsEditor({ siteId, onLoad, onSave }: EnvVarsEditorProps) {
  // siteId used as effect dependency to re-load when site changes
  const [rows, setRows] = useState<EnvVarRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; isError: boolean; requiresRedeploy?: boolean } | null>(null);
  const [nameErrors, setNameErrors] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await onLoad();
      if (result.success && result.data) {
        setRows(result.data.map((v) => ({ name: v.name, value: "", isExisting: true, deleted: false })));
      }
    } finally {
      setIsLoading(false);
    }
  }, [onLoad]);

  useEffect(() => { load(); }, [siteId]);

  const validate = (currentRows: EnvVarRow[]): Record<number, string> => {
    const errors: Record<number, string> = {};
    const seen = new Set<string>();
    currentRows.forEach((row, i) => {
      if (row.deleted) return;
      if (!row.name) { errors[i] = "Name required"; return; }
      if (!ENV_VAR_NAME_RE.test(row.name)) { errors[i] = "Must match ^[A-Za-z_][A-Za-z0-9_]*$"; return; }
      if (seen.has(row.name)) { errors[i] = "Duplicate name"; return; }
      seen.add(row.name);
    });
    return errors;
  };

  const handleNameChange = (i: number, name: string) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, name } : r));
    setSaveMessage(null);
  };

  const handleValueChange = (i: number, value: string) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, value } : r));
    setSaveMessage(null);
  };

  const handleDelete = (i: number) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, deleted: true } : r));
    setSaveMessage(null);
  };

  const handleAdd = () => {
    setRows((prev) => [...prev, { name: "", value: "", isExisting: false, deleted: false }]);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    const errors = validate(rows);
    setNameErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const items = rows
        .filter((r) => !r.deleted)
        .map((r) => ({
          name: r.name,
          value: r.value || (r.isExisting ? null : undefined),
        }));
      const result = await onSave(items);
      if (result.success) {
        setSaveMessage({ text: result.message, isError: false, requiresRedeploy: result.requiresRedeploy });
        await load();
      } else {
        setSaveMessage({ text: result.message, isError: true });
      }
    } catch (e) {
      setSaveMessage({ text: e instanceof Error ? e.message : "Save failed.", isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const visible = rows.filter((r) => !r.deleted);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: "0.82rem", padding: "8px 0" }}>
        <Loader2 size={13} className="al-spin" /> Loading variables...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {visible.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {rows.map((row, i) => {
            if (row.deleted) return null;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "start" }}>
                <div>
                  <input
                    type="text"
                    placeholder="VARIABLE_NAME"
                    value={row.name}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    disabled={isSaving || row.isExisting}
                    style={{
                      width: "100%", minHeight: 36, padding: "0 10px", borderRadius: 8,
                      border: nameErrors[i] ? "1.5px solid #ef4444" : "1.5px solid var(--border)",
                      background: row.isExisting ? "var(--surface-soft)" : "var(--surface)",
                      fontSize: "0.82rem", outline: "none", boxSizing: "border-box",
                      fontFamily: "monospace",
                    }}
                  />
                  {nameErrors[i] && <span style={{ fontSize: "0.72rem", color: "#ef4444" }}>{nameErrors[i]}</span>}
                </div>
                <input
                  type="password"
                  placeholder={row.isExisting ? "Leave blank to keep existing" : "value"}
                  value={row.value}
                  onChange={(e) => handleValueChange(i, e.target.value)}
                  disabled={isSaving}
                  style={{
                    width: "100%", minHeight: 36, padding: "0 10px", borderRadius: 8,
                    border: "1.5px solid var(--border)", background: "var(--surface)",
                    fontSize: "0.82rem", outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleDelete(i)}
                  disabled={isSaving}
                  style={{ minHeight: 36, minWidth: 36, display: "grid", placeItems: "center", borderRadius: 8, border: "1.5px solid var(--border)", background: "none", cursor: "pointer", color: "#ef4444" }}
                  title="Remove variable"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>No environment variables set.</p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSaving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.80rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
        >
          <Plus size={13} /> Add variable
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 34, padding: "0 14px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
        >
          {isSaving ? <><Loader2 size={13} className="al-spin" /> Saving...</> : <><Save size={13} /> Save</>}
        </button>
      </div>

      {saveMessage && (
        <div style={{ fontSize: "0.80rem", color: saveMessage.isError ? "#ef4444" : "#065f46", display: "flex", alignItems: "center", gap: 5 }}>
          {!saveMessage.isError && <CheckCircle2 size={13} style={{ color: "#16a34a" }} />}
          {saveMessage.text}
          {saveMessage.requiresRedeploy && !saveMessage.isError && (
            <span style={{ marginLeft: 4, color: "#92400e", background: "#fef3c7", padding: "1px 6px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600 }}>Redeploy required</span>
          )}
        </div>
      )}
    </div>
  );
}
