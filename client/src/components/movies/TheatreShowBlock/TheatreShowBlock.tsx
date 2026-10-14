import ShowCard from "../ShowCard/ShowCard.tsx";
import type { Show, Theatre } from "../../../types/movie.types.ts";
import "./TheatreShowBlock.css";

interface TheatreShowBlockProps {
  theatre: Theatre;
  shows:   Show[];
  onBook:  (showId: string) => void;
}

export default function TheatreShowBlock({ theatre, shows, onBook }: TheatreShowBlockProps) {
  return (
    <div className="tsb">
      <div className="tsb-header">
        <h3 className="tsb-name">{theatre.name}</h3>
        <p className="tsb-addr">
          📍 {theatre.address}, {theatre.city} — {theatre.pincode}
        </p>
      </div>
      <div className="tsb-shows">
        {shows.map(s => (
          <ShowCard key={s._id} show={s} onBook={onBook} />
        ))}
      </div>
    </div>
  );
}