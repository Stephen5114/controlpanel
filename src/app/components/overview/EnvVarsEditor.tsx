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
      <div className="env-loading">
        <Loader2 size={13} className="al-spin" /> Loading variables...
      </div>
    );
  }

  return (
    <div className="env-container">
      {visible.length > 0 ? (
        <div className="env-list">
          {rows.map((row, i) => {
            if (row.deleted) return null;
            return (
              <div key={i} className="env-row">
                <div className="env-field">
                  <input
                    type="text"
                    placeholder="VARIABLE_NAME"
                    value={row.name}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    disabled={isSaving || row.isExisting}
                    className={`env-input${nameErrors[i] ? " env-input--error" : ""}${row.isExisting ? " env-input--existing" : " env-input--editable"}`}
                  />
                  {nameErrors[i] && <span className="env-error-text">{nameErrors[i]}</span>}
                </div>
                <input
                  type="password"
                  placeholder={row.isExisting ? "Leave blank to keep existing" : "value"}
                  value={row.value}
                  onChange={(e) => handleValueChange(i, e.target.value)}
                  disabled={isSaving}
                  className="env-input env-input--editable env-input--pw"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(i)}
                  disabled={isSaving}
                  className="env-delete-btn"
                  aria-label="Remove variable"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="env-empty-text">No environment variables set.</p>
      )}

      <div className="env-footer">
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSaving}
          className="env-add-btn"
        >
          <Plus size={13} /> Add variable
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="env-save-btn"
        >
          {isSaving ? <><Loader2 size={13} className="al-spin" /> Saving...</> : <><Save size={13} /> Save</>}
        </button>
      </div>

      {saveMessage && (
        <div className={`env-msg${saveMessage.isError ? " env-msg--error" : " env-msg--success"}`}>
          {!saveMessage.isError && <CheckCircle2 size={13} className="env-msg-icon" style={{ color: "#16a34a" }} />}
          {saveMessage.text}
          {saveMessage.requiresRedeploy && !saveMessage.isError && (
            <span className="env-redeploy-badge">Redeploy required</span>
          )}
        </div>
      )}
    </div>
  );
}
