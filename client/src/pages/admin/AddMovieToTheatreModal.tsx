import { useState } from "react";
import { theatresApi } from "../../api/index.api.ts";
import { showToast } from "../../components/common/Toast/toast.ts";
import type { Movie } from "../../types/movie.types.ts";

interface Props {
  theatreId:   string;
  theatreName: string;
  allMovies:   Movie[];
  onClose:     () => void;
  onSave:      () => void;
}

export default function AddMovieToTheatreModal({ theatreId, theatreName, allMovies, onClose, onSave }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [saving,     setSaving]     = useState(false);

  const selected = allMovies.find(m => m._id === selectedId);

  const handleSave = async () => {
    if (!selectedId) { showToast("Select a movie.", "error"); return; }
    try {
      setSaving(true);
      await theatresApi.addMovie(theatreId, selectedId);
      showToast(`Movie added to ${theatreName}!`);
      onSave();
    } catch (e: unknown) { 
      showToast((e as Error).message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">ADD MOVIE TO THEATRE</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Theatre: <strong style={{ color: "var(--text-primary)" }}>{theatreName}</strong>
          </p>

          <div className="field">
            <label>Select Movie</label>
            <select className="input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Choose a movie…</option>
              {allMovies.map(m => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.genre?.join(", ")})
                </option>
              ))}
            </select>
          </div>

          {/* Movie preview */}
          {selected && (
            <div style={{ display: "flex", gap: 12, background: "rgba(var(--fg-rgb),0.03)", border: "1px solid var(--border-dim)", borderRadius: 10, padding: "12px 14px" }}>
              {selected.posterUrl && (
                <img src={selected.posterUrl} alt={selected.name}
                  style={{ width: 46, height: 66, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                  onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
              )}
              <div>
                <p style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>{selected.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                  🎬 {selected.genre?.join(", ")}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  ⏱ {selected.duration}m &nbsp;·&nbsp; 🎤 {selected.languages?.join(", ")}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  🎥 Dir: {selected.director} &nbsp;·&nbsp; ★ {selected.rating?.toFixed(1)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selectedId}>
            {saving ? "Adding…" : "Add Movie"}
          </button>
        </div>
      </div>
    </div>
  );
}