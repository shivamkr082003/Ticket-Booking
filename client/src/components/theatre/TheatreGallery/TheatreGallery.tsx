import { useEffect, useState } from "react";
import "./TheatreGallery.css";

interface TheatreGalleryProps {
  images:          string[];
  theatreName:     string;
  representative?: boolean;   // stock photos — labelled as such
}

export default function TheatreGallery({ images, theatreName, representative }: TheatreGalleryProps) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen(i => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft")  setOpen(i => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  if (images.length === 0) return null;

  const tiles = images.slice(0, 5);
  const extra = images.length - tiles.length;

  return (
    <section className="tg-section">
      <div className="container">
        <div className="tg-head">
          <div>
            <p className="tg-label">Gallery</p>
            <h2 className="tg-title">INSIDE {theatreName.toUpperCase()}</h2>
          </div>
          {representative && <span className="tg-note">Images for representation only</span>}
        </div>

        <div className={`tg-mosaic tg-mosaic--${tiles.length}`}>
          {tiles.map((img, i) => (
            <button key={img + i} className="tg-tile" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${images.length}`}>
              <img src={img} alt={`${theatreName} — photo ${i + 1}`} loading="lazy"
                onError={e => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
              {i === tiles.length - 1 && extra > 0 && <span className="tg-more">+{extra} photos</span>}
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <div className="tg-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setOpen(null)}>
          <button className="tg-lb-close" aria-label="Close" onClick={() => setOpen(null)}>✕</button>
          <button className="tg-lb-nav tg-lb-prev" aria-label="Previous photo"
            onClick={e => { e.stopPropagation(); setOpen((open - 1 + images.length) % images.length); }}>‹</button>
          <img className="tg-lb-img" src={images[open]} alt={`${theatreName} — photo ${open + 1}`} onClick={e => e.stopPropagation()} />
          <button className="tg-lb-nav tg-lb-next" aria-label="Next photo"
            onClick={e => { e.stopPropagation(); setOpen((open + 1) % images.length); }}>›</button>
          <span className="tg-lb-count">{open + 1} / {images.length}</span>
        </div>
      )}
    </section>
  );
}
