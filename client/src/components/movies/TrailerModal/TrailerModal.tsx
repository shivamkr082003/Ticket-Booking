import "./TrailerModal.css";

interface TrailerModalProps {
  trailerUrl: string;
  movieName:  string;
  onClose:    () => void;
}

export default function TrailerModal({ trailerUrl, movieName, onClose }: TrailerModalProps) {
  const embedUrl = trailerUrl.includes("watch?v=")
    ? trailerUrl.replace("watch?v=", "embed/")
    : trailerUrl;

  return (
    <div className="tm-backdrop" onClick={onClose}>
      <div className="tm-inner" onClick={e => e.stopPropagation()}>
        <button className="tm-close btn btn-ghost btn-sm" onClick={onClose}>
          ✕ Close
        </button>
        <div className="tm-frame-wrap">
          <iframe
            src={embedUrl}
            className="tm-frame"
            allowFullScreen
            title={`${movieName} Trailer`}
          />
        </div>
      </div>
    </div>
  );
}