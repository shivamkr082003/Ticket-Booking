import { SearchBar } from "../../common/SharedUI/SharedUI.tsx";
import "./MovieFilters.css";

const GENRES = [
  "All","Action","Comedy","Drama","Horror","Sci-Fi",
  "Thriller","Romance","Fantasy","Animation","Crime","Adventure","Biography"
];

interface MovieFiltersProps {
  search:       string;
  genre:        string;
  sortBy:       string;
  onSearch:     (v: string) => void;
  onGenre:      (v: string) => void;
  onSort:       (v: string) => void;
  resultCount:  number;
  loading:      boolean;
  error:        string;
}

export default function MovieFilters({
  search, genre, sortBy,
  onSearch, onGenre, onSort,
  resultCount, loading, error,
}: MovieFiltersProps) {
  return (
    <>
      {/* Hero */}
      <div className="mf-hero">
        <div className="mf-hero-glow" />
        <div className="container">
          <p className="mf-eyebrow">Now Showing &amp; Upcoming</p>
          <h1 className="mf-title">Find Your Next Watch</h1>
          <div className="mf-search-wrap">
            <SearchBar
              value={search}
              onChange={onSearch}
              placeholder="Search title, genre, director…"
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mf-bar">
        <div className="container mf-bar-inner">
          <div className="mf-genres-scroll">
            {GENRES.map(g => (
              <button
                key={g}
                className={`mf-chip ${genre === g ? "active" : ""}`}
                onClick={() => onGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="mf-sort">
            <span className="mf-sort-label">Sort</span>
            <select
              className="mf-sort-select"
              value={sortBy}
              onChange={e => onSort(e.target.value)}
            >
              <option value="rating">Top Rated</option>
              <option value="name">A – Z</option>
              <option value="date">Latest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="mf-count container">
        {loading ? "Loading…" : error ? error : `${resultCount} film${resultCount !== 1 ? "s" : ""}`}
      </p>
    </>
  );
}