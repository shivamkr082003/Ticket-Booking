import { useState, useRef, type ChangeEvent } from "react";
import { api } from "../../../api/index.api.ts";
import "./ImageUpload.css";

interface ImageUploadProps {
  label:       string;
  value:       string;
  onChange:    (url: string) => void;
  folder?:     string;
  aspectRatio?: "poster" | "banner" | "square" | "wide";
  optional?:   boolean;
}

export default function ImageUpload({
  label, value, onChange, folder = "cineverse",
  aspectRatio = "wide", optional,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [urlInput,  setUrlInput]  = useState("");
  const [mode,      setMode]      = useState<"upload" | "url">("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectMap = {
    poster: "2/3",
    banner: "16/6",
    square: "1/1",
    wide:   "16/9",
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);

      const res = await api.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onChange(res.data.data.url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim().startsWith("http")) {
      setError("Enter a valid URL");
      return;
    }
    onChange(urlInput.trim());
    setUrlInput("");
    setError("");
  };

  return (
    <div className="iu-wrap form-group">
      <div className="iu-label-row">
        <label className="form-label">
          {label}
          {optional && <span className="iu-optional"> (optional)</span>}
        </label>
        <div className="iu-mode-toggle">
          <button
            type="button"
            className={`iu-mode-btn ${mode === "upload" ? "active" : ""}`}
            onClick={() => setMode("upload")}
          >📁 Upload</button>
          <button
            type="button"
            className={`iu-mode-btn ${mode === "url" ? "active" : ""}`}
            onClick={() => setMode("url")}
          >🔗 URL</button>
        </div>
      </div>

      {/* Preview */}
      {value && (
        <div className="iu-preview" style={{ aspectRatio: aspectMap[aspectRatio] }}>
          <img
            src={value}
            alt="preview"
            onError={e => ((e.target as HTMLImageElement).style.opacity = "0.3")}
          />
          <button
            type="button"
            className="iu-remove"
            onClick={() => onChange("")}
          >✕</button>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div
          className={`iu-dropzone ${uploading ? "uploading" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const dt = new DataTransfer();
              dt.items.add(file);
              if (inputRef.current) {
                inputRef.current.files = dt.files;
                handleFile({ target: inputRef.current } as ChangeEvent<HTMLInputElement>);
              }
            }
          }}
        >
          {uploading ? (
            <div className="iu-uploading">
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <p>Uploading…</p>
            </div>
          ) : (
            <>
              <div className="iu-dropzone-icon">📷</div>
              <p className="iu-dropzone-text">Click or drag & drop</p>
              <p className="iu-dropzone-sub">PNG, JPG, WEBP · Max 5MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && (
        <div className="iu-url-row">
          <input
            className="form-input"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
            placeholder="https://example.com/image.jpg"
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleUrlSubmit}
          >Add</button>
        </div>
      )}

      {error && <p className="iu-error">⚠ {error}</p>}
    </div>
  );
}