import { useState, useRef, type ChangeEvent } from "react";
import { api } from "../../../api/index.api.ts";
import "./MultiImageUpload.css";

interface MultiImageUploadProps {
  label:    string;
  images:   string[];
  onChange: (images: string[]) => void;
  folder?:  string;
  max?:     number;
  optional?: boolean;
}

export default function MultiImageUpload({
  label, images, onChange, folder = "cineverse",
  max = 10, optional,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput,  setUrlInput]  = useState("");
  const [error,     setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = max - images.length;
    const toUpload  = files.slice(0, remaining);

    setUploading(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        toUpload.map(async file => {
          const formData = new FormData();
          formData.append("image", file);
          formData.append("folder", folder);
          const res = await api.post("/upload/image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return res.data.data.url as string;
        })
      );

      const urls = results
        .filter(r => r.status === "fulfilled")
        .map(r => (r as PromiseFulfilledResult<string>).value);

      onChange([...images, ...urls]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleUrlAdd = () => {
    const url = urlInput.trim();
    if (!url.startsWith("http")) { setError("Enter a valid URL"); return; }
    if (images.includes(url))    { setError("Already added"); return; }
    onChange([...images, url]);
    setUrlInput("");
    setError("");
  };

  const remove = (url: string) => onChange(images.filter(u => u !== url));

  return (
    <div className="miu-wrap form-group">
      <label className="form-label">
        {label}
        {optional && <span className="miu-optional"> (optional)</span>}
        <span className="miu-count"> {images.length}/{max}</span>
      </label>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="miu-grid">
          {images.map((url, i) => (
            <div key={i} className="miu-thumb">
              <img src={url} alt={`img ${i + 1}`}
                onError={e => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
              <button type="button" className="miu-remove" onClick={() => remove(url)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {images.length < max && (
        <>
          {/* Upload button */}
          <div className="miu-actions">
            <button
              type="button"
              className="miu-upload-btn"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading…</>
                : "📁 Upload Images"
              }
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFiles}
            />

            {/* URL input */}
            <div className="miu-url-row">
              <input
                className="form-input"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleUrlAdd())}
                placeholder="Or paste URL → Enter"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleUrlAdd}>
                Add
              </button>
            </div>
          </div>
        </>
      )}

      {error && <p className="miu-error">⚠ {error}</p>}
    </div>
  );
}