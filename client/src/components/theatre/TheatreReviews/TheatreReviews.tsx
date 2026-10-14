import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { theatresApi } from "../../../api/index.api.ts";
import { useAuth } from "../../../context/AuthContext.tsx";
import { showToast } from "../../common/Toast/toast.ts";
import Stars from "../../common/Stars/Stars.tsx";
import { timeAgo } from "../../common/NotificationBell/timeAgo.ts";
import type { TheatreReview, TheatreReviewsResponse } from "../../../types/movie.types.ts";
import "./TheatreReviews.css";

type Aspect = "cleanliness" | "sound" | "seating";
const ASPECTS: { key: Aspect; label: string; icon: string }[] = [
  { key: "cleanliness", label: "Cleanliness", icon: "🧼" },
  { key: "sound",       label: "Sound",       icon: "🔊" },
  { key: "seating",     label: "Seating",     icon: "💺" },
];

interface Draft { rating: number; cleanliness?: number; sound?: number; seating?: number; comment: string }

export default function TheatreReviews({ theatreId, onRated }: { theatreId: string; onRated?: () => void }) {
  const { user } = useAuth();
  const [data,     setData]     = useState<TheatreReviewsResponse | null>(null);
  const [mine,     setMine]     = useState<TheatreReview | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState<Draft>({ rating: 0, comment: "" });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(() => {
    theatresApi.reviews(theatreId).then(setData).catch(() => setData(null));
  }, [theatreId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    theatresApi.myReview(theatreId).then(r => { setMine(r.review); setCanWrite(r.canReview); }).catch(() => {});
  }, [theatreId, user]);

  const startEdit = () => {
    setDraft(mine ? { rating: mine.rating, cleanliness: mine.cleanliness, sound: mine.sound, seating: mine.seating, comment: mine.comment } : { rating: 0, comment: "" });
    setEditing(true);
  };

  const save = async () => {
    if (!draft.rating) { showToast("Pick an overall star rating", "error"); return; }
    setSaving(true);
    try {
      const r = await theatresApi.saveReview(theatreId, { ...draft, comment: draft.comment.trim() });
      setMine(r.review); setEditing(false); load(); onRated?.();
      showToast("Thanks for reviewing this cinema!");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Couldn't save your review", "error");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm("Delete your review?")) return;
    try { await theatresApi.deleteReview(theatreId); setMine(null); load(); onRated?.(); showToast("Review deleted"); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", "error"); }
  };

  const summary = data?.summary;
  const total = summary?.count ?? 0;

  return (
    <section className="trv container" id="reviews">
      <p className="tdt-label">Reviews</p>
      <h2 className="tdt-title">WHAT MOVIEGOERS SAY</h2>

      <div className="trv-grid">
        <div className="trv-summary">
          {total > 0 ? (
            <>
              <p className="trv-avg">{summary!.avg.toFixed(1)}<span>/5</span></p>
              <Stars value={summary!.avg} size={20} label="Average rating" />
              <p className="trv-count">{total} verified {total === 1 ? "review" : "reviews"}</p>
              <div className="trv-dist">
                {data!.distribution.map(d => (
                  <div key={d.star} className="trv-dist-row">
                    <span>{d.star}★</span>
                    <div className="trv-dist-bar"><i style={{ width: `${total ? (d.count / total) * 100 : 0}%` }} /></div>
                    <span className="trv-dist-n">{d.count}</span>
                  </div>
                ))}
              </div>
              <div className="trv-aspects">
                {ASPECTS.filter(a => summary![a.key] > 0).map(a => (
                  <div key={a.key}><span aria-hidden="true">{a.icon}</span> {a.label} <b>{summary![a.key].toFixed(1)}</b></div>
                ))}
              </div>
            </>
          ) : (
            <p className="trv-none">No reviews yet{canWrite && !mine ? " — be the first." : "."}</p>
          )}

          {!user ? (
            <p className="trv-hint"><Link to="/login">Sign in</Link> to review a cinema you've visited.</p>
          ) : mine && !editing ? (
            <div className="trv-mine">
              <p className="trv-hint">Your review · <Stars value={mine.rating} size={13} /></p>
              <div className="trv-mine-actions">
                <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={remove}>Delete</button>
              </div>
            </div>
          ) : canWrite && !editing ? (
            <button className="btn btn-primary btn-sm trv-write" onClick={startEdit}>★ Rate this cinema</button>
          ) : !canWrite ? (
            <p className="trv-hint">Only guests who've watched a show here can review — keeps ratings honest.</p>
          ) : null}
        </div>

        <div className="trv-list">
          {editing && (
            <div className="trv-form">
              <div className="trv-form-row"><span>Overall</span><Stars value={draft.rating} onChange={v => setDraft(d => ({ ...d, rating: v }))} size={26} label="Overall rating" /></div>
              {ASPECTS.map(a => (
                <div key={a.key} className="trv-form-row trv-form-row--sm">
                  <span><span aria-hidden="true">{a.icon}</span> {a.label}</span>
                  <Stars value={draft[a.key] ?? 0} onChange={v => setDraft(d => ({ ...d, [a.key]: v }))} size={18} label={a.label} />
                </div>
              ))}
              <textarea className="form-input" rows={3} maxLength={600} value={draft.comment}
                placeholder="How were the seats, sound, snacks and staff?" onChange={e => setDraft(d => ({ ...d, comment: e.target.value }))} />
              <div className="trv-form-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Post review"}</button>
              </div>
            </div>
          )}

          {(data?.reviews ?? []).map(r => {
            const who = typeof r.userId === "object" ? r.userId.name : "Moviegoer";
            return (
              <article key={r._id} className="trv-item">
                <header>
                  <span className="trv-avatar" aria-hidden="true">{who.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <p className="trv-name">{who} <span className="trv-verified">✓ Verified visit</span></p>
                    <p className="trv-meta"><Stars value={r.rating} size={12} /> · {timeAgo(r.createdAt)}</p>
                  </div>
                </header>
                {r.comment && <p className="trv-comment">{r.comment}</p>}
                {(r.cleanliness || r.sound || r.seating) && (
                  <p className="trv-tags">
                    {ASPECTS.filter(a => r[a.key]).map(a => <span key={a.key}>{a.icon} {a.label} {r[a.key]}/5</span>)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
