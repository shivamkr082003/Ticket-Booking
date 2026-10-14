import { theatresApi } from "../../../../../api/index.api.ts";
import { showToast }   from "../../../../common/Toast/toast.ts";
import type { Theatre } from "../../../../../types/movie.types.ts";

interface TheatresTabProps {
  theatres:       Theatre[];
  onDeleteTheatre:(id: string, name: string) => void;
  onRefresh:      () => void;
}

export default function TheatresTab({ theatres, onDeleteTheatre, onRefresh }: TheatresTabProps) {

  const handleToggle = async (t: Theatre) => {
    try {
      await theatresApi.setStatus(t._id, t.isActive === false);
      showToast(`Theatre ${t.isActive === false ? "activated" : "suspended"}`);
      onRefresh();
    } catch (e: unknown) { 
      if(e instanceof Error){
        showToast(e.message, "error"); 
      }else{
        showToast("An error occurred");
      }
    }
  };

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">Theatres</h1>
          <p className="dash-page-sub">{theatres.length} registered</p>
        </div>
      </div>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr><th>Theatre</th><th>Location</th><th>Screens</th><th>Movies</th><th>Amenities</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {theatres.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No theatres yet</td></tr>
            )}
            {theatres.map(t => (
              <tr key={t._id}>
                <td>
                  <strong style={{ color: "var(--text-primary)" }}>{t.name}</strong>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{t.address}</p>
                </td>
                <td style={{ fontSize: 12 }}>{t.city}{t.state ? `, ${t.state}` : ""}</td>
                <td>{t.totalScreens ?? 1}</td>
                <td><span className="badge badge-blue">{t.movies?.length ?? 0}</span></td>
                <td style={{ fontSize: 11 }}>{t.amenities?.slice(0, 2).join(", ") || "—"}</td>
                <td>
                  <span className={`badge badge-${t.isActive !== false ? "green" : "red"}`}>
                    {t.isActive !== false ? "Active" : "Suspended"}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(t)}>
                      {t.isActive !== false ? "🚫" : "✅"}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteTheatre(t._id, t.name)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}