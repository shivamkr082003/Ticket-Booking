import { useRef, useState, type ChangeEvent } from "react";
import { api } from "../../../api/index.api.ts";
import "./PhotoSlot.css";

interface PhotoSlotProps {
  value:     string;
  onChange:  (url: string) => void;
  folder?:   string;
  /** Shown in the empty thumbnail (e.g. the stock photo that will be used instead) */
  fallback?: string;
  label?:    string;
}

// Compact single-photo picker: thumbnail + Upload / Paste URL / Remove
export default function PhotoSlot({ value, onChange, folder = "cineverse", fallback, label }: PhotoSlotProps) {
  const [uploading, setUploading] = useState(false);
  const [pasting,   setPasting]   = useState(false);
  const [url,       setUrl]       = useState("");
  const [error,     setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("folder", folder);
      const res = await api.post("/upload/image", form, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const savePasted = () => {
    if (!/^https?:\/\/\S+$/.test(url.trim())) { setError("Enter a valid image URL"); return; }
    onChange(url.trim());
    setUrl(""); setPasting(false); setError("");
  };

  return (
    <div className="ps">
      <div className={`ps-thumb ${value ? "" : "ps-thumb--empty"}`}>
        {value || fallback
          ? <img src={value || fallback} alt={label ?? ""} />
          : <span aria-hidden="true">📷</span>}
        {!value && fallback && <span className="ps-stock">Stock</span>}
      </div>

      <div className="ps-body">
        {label && <p className="ps-label">{label}</p>}
        {pasting ? (
          <div className="ps-paste">
            <input className="form-input" value={url} autoFocus placeholder="https://…"
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); savePasted(); } }} />
            <button type="button" className="btn btn-primary btn-sm" onClick={savePasted}>Add</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPasting(false); setError(""); }}>✕</button>
          </div>
        ) : (
          <div className="ps-actions">
            <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </button>
            <button type="button" className="ps-link" onClick={() => setPasting(true)}>Paste URL</button>
            {value && <button type="button" className="ps-link ps-link--danger" onClick={() => onChange("")}>Remove</button>}
          </div>
        )}
        {error && <p className="ps-error">{error}</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={upload} />
    </div>
  );
}
