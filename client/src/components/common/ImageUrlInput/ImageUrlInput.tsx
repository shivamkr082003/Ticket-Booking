import { useState } from "react";
import { showToast } from "../Toast/toast.ts";
import "./ImageUrlInput.css";

interface ImageUrlInputProps {
  label:    string;
  images:   string[];
  onChange: (images: string[]) => void;
  optional?: boolean;
}

export default function ImageUrlInput({
  label, images, onChange, optional,
}: ImageUrlInputProps) {
  const [input, setInput] = useState("");

  const add = () => {
    const url = input.trim();
    if (!url) return;
    if (!url.startsWith("http")) { showToast("Enter a valid URL", "error"); return; }
    if (!images.includes(url)) onChange([...images, url]);
    setInput("");
  };

  const remove = (url: string) => onChange(images.filter(u => u !== url));

  return (
    <div className="iui-group form-group">
      <label className="form-label">
        {label}
        {optional && <span className="iui-optional"> (optional)</span>}
      </label>

      <div className="iui-input-row">
        <input
          className="form-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Paste image URL → Enter"
        />
        <button className="btn btn-ghost btn-sm" type="button" onClick={add}>Add</button>
      </div>

      {images.length > 0 && (
        <div className="iui-previews">
          {images.map(url => (
            <div key={url} className="iui-preview">
              <img
                src={url}
                alt="preview"
                onError={e => ((e.target as HTMLImageElement).style.opacity = "0.3")}
              />
              <button
                className="iui-remove"
                type="button"
                onClick={() => remove(url)}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}