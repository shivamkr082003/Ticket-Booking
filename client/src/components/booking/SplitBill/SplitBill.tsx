import { useState } from "react";
import Modal from "../../common/Modal/Modal.tsx";
import { showToast } from "../../common/Toast/toast.ts";
import "./SplitBill.css";

interface SplitBillProps {
  total:   number;
  seats:   string[];
  movie:   string;
  when:    string;
  place:   string;
  onClose: () => void;
}

// Works out each friend's share and sends them a ready-to-pay message
export default function SplitBill({ total, seats, movie, when, place, onClose }: SplitBillProps) {
  const [people, setPeople] = useState(Math.max(2, seats.length));
  const share = Math.ceil(total / people);
  const text = `🎬 ${movie} — ${when}\n📍 ${place}\n💺 Seats ${seats.join(", ")}\n\nTickets came to ₹${total}. Your share is ₹${share} 🙏`;

  const send = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${movie} — your share`, text }); return; } catch { /* dismissed */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const copy = () => navigator.clipboard?.writeText(text).then(() => showToast("Message copied")).catch(() => {});

  return (
    <Modal title="SPLIT WITH FRIENDS" onClose={onClose} maxWidth={440}
      footer={<>
        <button className="btn btn-ghost" onClick={copy}>Copy message</button>
        <button className="btn btn-primary" onClick={send}>💬 Send request</button>
      </>}>
      <div className="sb">
        <div className="sb-people">
          <span>Splitting between</span>
          <div className="ssp-best-n" role="group" aria-label="Number of people">
            <button onClick={() => setPeople(p => Math.max(2, p - 1))} aria-label="Fewer people">−</button>
            <span>{people}</span>
            <button onClick={() => setPeople(p => Math.min(20, p + 1))} aria-label="More people">+</button>
          </div>
          <span>people</span>
        </div>
        <div className="sb-share">
          <p>Each person pays</p>
          <strong>₹{share.toLocaleString("en-IN")}</strong>
          <small>₹{total.toLocaleString("en-IN")} total{share * people !== total ? ` · rounded up by ₹${share * people - total}` : ""}</small>
        </div>
        <pre className="sb-preview">{text}</pre>
      </div>
    </Modal>
  );
}
