import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppNavbar     from "../../../components/common/Navbar/Navbar.tsx";
import { SearchBar, PageSpinner } from "../../../components/common/SharedUI/SharedUI.tsx";
import { showToast } from "../../../components/common/Toast/toast.ts";
import Modal         from "../../../components/common/Modal/Modal.tsx";
import TheatreCard   from "../../../components/theatre/TheatreCard/TheatreCard.tsx";
import { theatresApi } from "../../../api/index.api.ts";
import { useAuth }   from "../../../context/AuthContext.tsx";
import { useCity }   from "../../../context/CityContext.tsx";
import type { ShowFormat, Theatre } from "../../../types/movie.types.ts";
import { SHOW_FORMATS, PREMIUM_FORMATS } from "../../../constants/movies.data.ts";
import { distanceKm, getMyLocation, hasPin } from "../../../utils/geo.ts";
import type { GeoPoint } from "../../../types/movie.types.ts";
import "./TheatresPage.css";

export default function TheatresPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [params, setParams] = useSearchParams();

  // ?format=IMAX — only theatres with upcoming shows in that format (filtered server-side)
  const rawFormat = params.get("format");
  const format    = SHOW_FORMATS.includes(rawFormat as ShowFormat) ? (rawFormat as ShowFormat) : null;

  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [me,       setMe]       = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);

  const nearMe = () => {
    if (me) { setMe(null); return; }
    setLocating(true);
    getMyLocation()
      .then(setMe)
      .catch((e: Error) => showToast(e.message, "error"))
      .finally(() => setLocating(false));
  };

  const isAdmin = user?.userRole === "ADMIN" || user?.userRole === "CLIENT";
  const { city, setCity, openPicker } = useCity();

  const load = useCallback(() => {
    setLoading(true);
    theatresApi.getAll({ limit: "100", ...(format ? { format } : {}), ...(city ? { city } : {}) })
      .then(setTheatres)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [format, city]);

  useEffect(() => { load(); }, [load]);

  const pickFormat = (f: ShowFormat | null) =>
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (f) next.set("format", f); else next.delete("format");
      return next;
    }, { replace: true });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await theatresApi.delete(deleteId);
      showToast("Theatre removed.");
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Something went wrong", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const matches = theatres.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.city.toLowerCase().includes(search.toLowerCase()) ||
    t.address.toLowerCase().includes(search.toLowerCase())
  );
  // "Near me": pinned cinemas nearest first, unpinned ones after
  const distOf = (t: Theatre) => (me && hasPin(t) ? distanceKm(me, t.location) : null);
  const filtered = me
    ? [...matches].sort((a, b) => (distOf(a) ?? Infinity) - (distOf(b) ?? Infinity))
    : matches;

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <div className="container">
        <div className="tp-header">
          <div>
            <p className="tp-eyebrow">
              {city ? <>Cinemas in {city} · <button className="tp-city-link" onClick={openPicker}>Change</button></> : "Cinemas Near You"}
            </p>
            <h1 className="tp-title">{format ? `${format.toUpperCase()} THEATRES` : "ALL THEATRES"}</h1>
          </div>
          {isAdmin && (
            <button className="btn btn-primary"
              onClick={() => navigate("/dashboard?tab=theatres")}>
              + Add Theatre
            </button>
          )}
        </div>

        <div className="tp-toolbar">
          <div className="tp-search">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name, city…"
            />
          </div>

          <button className={`tp-near ${me ? "active" : ""}`} onClick={nearMe} disabled={locating} aria-pressed={!!me}>
            📍 {locating ? "Locating…" : me ? "Nearest first" : "Near me"}
          </button>

          <div className="tp-formats" role="tablist" aria-label="Screen format">
            <button role="tab" aria-selected={!format}
              className={`tp-format ${!format ? "active" : ""}`}
              onClick={() => pickFormat(null)}>
              All
            </button>
            {SHOW_FORMATS.map(f => (
              <button key={f} role="tab" aria-selected={format === f}
                className={`tp-format ${format === f ? "active" : ""} ${PREMIUM_FORMATS.has(f) ? "is-premium" : ""}`}
                onClick={() => pickFormat(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏛</div>
            <p className="empty-state-title">No Theatres Found</p>
            <p className="empty-state-sub">
              {format ? `No theatres${city ? ` in ${city}` : ""} have upcoming ${format} shows right now`
                : city && !search ? `We don't have cinemas in ${city} yet` : "Try a different search"}
            </p>
            {format && (
              <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => pickFormat(null)}>
                Show All Theatres
              </button>
            )}
            {!format && city && (
              <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => setCity(null)}>
                Show All Cities
              </button>
            )}
          </div>
        ) : (
          <div className="tp-grid">
            {filtered.map(t => (
              <TheatreCard
                key={t._id}
                theatre={t}
                distance={distOf(t)}
                isAdmin={isAdmin}
                onClick={() => navigate(`/theatres/${t._id}`)}
                onEdit={() => navigate(`/dashboard?tab=theatres&edit=${t._id}`)}
                onDelete={() => setDeleteId(t._id)}
              />
            ))}
          </div>
        )}
      </div>

      {deleteId && (
        <Modal
          title="DELETE THEATRE"
          onClose={() => setDeleteId(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            This action is permanent. All shows in this theatre will also be removed.
          </p>
        </Modal>
      )}
    </div>
  );
}