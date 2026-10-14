import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Movie, Theatre } from "../../../types/movie.types.ts";
import { useCity } from "../../../context/CityContext.tsx";
import { sameCity } from "../../../utils/city.ts";
import { loadSearchIndex, searchMovies, searchTheatres, type SearchIndex } from "./searchIndex.ts";
import "./SearchPalette.css";

interface Item { key: string; group: string; title: string; sub: string; thumb?: string; icon?: string; go: () => void }

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { city, setCity, cities } = useCity();
  const [index,  setIndex]  = useState<SearchIndex | null>(null);
  const [query,  setQuery]  = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadSearchIndex().then(idx => { if (!cancelled) setIndex(idx); });
    return () => { cancelled = true; };
  }, []);

  const go = (path: string) => () => { onClose(); navigate(path); };

  const items = useMemo<Item[]>(() => {
    if (!index) return [];
    const q = query.trim();
    const movieItem = (m: Movie): Item => ({
      key: `m-${m._id}`, group: "Movies", title: m.name, thumb: m.posterUrl,
      sub: [m.genre?.slice(0, 2).join(", "), m.languages?.[0], m.releaseStatus === "COMING_SOON" ? "Coming soon" : null].filter(Boolean).join(" · "),
      go: go(`/movies/${m._id}`),
    });
    const theatreItem = (t: Theatre): Item => ({
      key: `t-${t._id}`, group: "Cinemas", title: t.name, icon: "🏛",
      sub: `${t.address ? `${t.address}, ` : ""}${t.city}`, go: go(`/theatres/${t._id}`),
    });

    if (!q) {
      const local = index.theatres.filter(t => !city || sameCity(t.city, city));
      return [
        ...index.movies.filter(m => m.releaseStatus !== "COMING_SOON").slice(0, 5).map(m => ({ ...movieItem(m), group: "Now showing" })),
        ...local.slice(0, 3).map(t => ({ ...theatreItem(t), group: city ? `Cinemas in ${city}` : "Cinemas" })),
        { key: "p-prime", group: "Shortcuts", title: "Prime Pass", sub: "15% off tickets & full refunds", icon: "✦", go: go("/prime") },
        { key: "p-bookings", group: "Shortcuts", title: "My bookings", sub: "Tickets, food orders & refunds", icon: "🎟", go: go("/my-bookings") },
      ];
    }

    const cityHits = cities.filter(c => c.city.toLowerCase().startsWith(q.toLowerCase())).slice(0, 3).map<Item>(c => ({
      key: `c-${c.city}`, group: "Cities", title: `Switch to ${c.city}`, icon: "📍",
      sub: `${c.theatres} ${c.theatres === 1 ? "cinema" : "cinemas"}`, go: () => { setCity(c.city); onClose(); },
    }));
    return [
      ...searchMovies(index.movies, q).map(movieItem),
      ...searchTheatres(index.theatres, q).map(theatreItem),
      ...cityHits,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, query, city, cities]);

  const sel = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((sel + 1) % Math.max(1, items.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((sel - 1 + items.length) % Math.max(1, items.length)); }
    else if (e.key === "Enter") { e.preventDefault(); items[sel]?.go(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  let lastGroup = "";

  return createPortal(
    <div className="sp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-box" role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKey}>
        <div className="sp-input-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input autoFocus value={query} onChange={e => { setQuery(e.target.value); setActive(0); }}
            placeholder="Search movies, actors, cinemas, cities…" aria-label="Search"
            role="combobox" aria-expanded="true" aria-controls="sp-list" aria-activedescendant={items[sel] ? `sp-${items[sel].key}` : undefined} />
          <kbd className="sp-kbd" onClick={onClose}>Esc</kbd>
        </div>

        <div className="sp-list" id="sp-list" role="listbox" ref={listRef}>
          {!index && <p className="sp-empty">Loading…</p>}
          {index && items.length === 0 && <p className="sp-empty">No results for “{query}”. Try a movie title, actor or city.</p>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? <p className="sp-group" key={`g-${it.group}`}>{it.group}</p> : null;
            lastGroup = it.group;
            return [
              header,
              <button key={it.key} id={`sp-${it.key}`} data-idx={i} role="option" aria-selected={i === sel}
                className={`sp-item ${i === sel ? "is-active" : ""}`} onMouseMove={() => setActive(i)} onClick={it.go}>
                {it.thumb
                  ? <img className="sp-thumb" src={it.thumb} alt="" loading="lazy" />
                  : <span className="sp-icon" aria-hidden="true">{it.icon}</span>}
                <span className="sp-text">
                  <span className="sp-title">{it.title}</span>
                  {it.sub && <span className="sp-sub">{it.sub}</span>}
                </span>
                <span className="sp-enter" aria-hidden="true">↵</span>
              </button>,
            ];
          })}
        </div>

        <div className="sp-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
