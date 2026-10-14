import { useState } from "react";
import "./TagInput.css";

interface TagInputProps {
  label:        string;
  values:       string[];
  onChange:     (v: string[]) => void;
  placeholder?: string;
  options?:     string[];
}

export default function TagInput({
  label, values, onChange, placeholder, options,
}: TagInputProps) {
  const [input, setInput] = useState("");

  const add = (val: string) => {
    const v = val.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };

  const remove = (v: string) => onChange(values.filter(x => x !== v));

  return (
    <div className="ti-group form-group">
      <label className="form-label">{label}</label>

      {options && (
        <div className="ti-options">
          {options.map(o => (
            <button
              key={o} type="button"
              className={`amenity-toggle ${values.includes(o) ? "active" : ""}`}
              onClick={() => values.includes(o) ? remove(o) : onChange([...values, o])}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      <div className="ti-input-row">
        <input
          className="form-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add(input))}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => add(input)}>
          Add
        </button>
      </div>

      {values.length > 0 && (
        <div className="ti-tags">
          {values.map(v => (
            <span key={v} className="ti-tag">
              {v}
              <button type="button" className="ti-tag-remove" onClick={() => remove(v)}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}