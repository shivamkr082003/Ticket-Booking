import "./ShowFilters.css";

export interface ShowFilterState {
  format:   string;
  language: string;
  city:     string;
}

interface ShowFiltersProps {
  filters:    ShowFilterState;
  onChange:   (f: ShowFilterState) => void;
  formats:    string[];
  languages:  string[];
  cities:     string[];
}

export default function ShowFilters({
  filters, onChange, formats, languages, cities,
}: ShowFiltersProps) {
  const set = (key: keyof ShowFilterState, val: string) =>
    onChange({ ...filters, [key]: val });

  const hasFilter = filters.format || filters.language || filters.city;

  return (
    <div className="sf-wrap">
      {/* City */}
      {cities.length > 0 && (
        <div className="sf-group">
          <p className="sf-label">📍 City</p>
          <div className="sf-chips">
            <button
              className={`sf-chip ${!filters.city ? "active" : ""}`}
              onClick={() => set("city", "")}
            >All</button>
            {cities.map(c => (
              <button
                key={c}
                className={`sf-chip ${filters.city === c ? "active" : ""}`}
                onClick={() => set("city", c)}
              >{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* Format */}
      {formats.length > 0 && (
        <div className="sf-group">
          <p className="sf-label">🎥 Format</p>
          <div className="sf-chips">
            <button
              className={`sf-chip ${!filters.format ? "active" : ""}`}
              onClick={() => set("format", "")}
            >All</button>
            {formats.map(f => (
              <button
                key={f}
                className={`sf-chip ${filters.format === f ? "active" : ""}`}
                onClick={() => set("format", f)}
              >{f}</button>
            ))}
          </div>
        </div>
      )}

      {/* Language */}
      {languages.length > 0 && (
        <div className="sf-group">
          <p className="sf-label">🌐 Language</p>
          <div className="sf-chips">
            <button
              className={`sf-chip ${!filters.language ? "active" : ""}`}
              onClick={() => set("language", "")}
            >All</button>
            {languages.map(l => (
              <button
                key={l}
                className={`sf-chip ${filters.language === l ? "active" : ""}`}
                onClick={() => set("language", l)}
              >{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* Clear */}
      {hasFilter && (
        <button
          className="sf-clear"
          onClick={() => onChange({ format: "", language: "", city: "" })}
        >
          Clear Filters ✕
        </button>
      )}
    </div>
  );
}