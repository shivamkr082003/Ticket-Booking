import { useState } from "react";
import "./ReviewForm.css";

interface ReviewFormProps {
  initialData?: { rating: number; comment: string };
  isEdit?:      boolean;
  onSubmit:     (data: { rating: number; comment: string }) => Promise<void>;
  onCancel?:    () => void;
}

export default function ReviewForm({
  initialData, isEdit, onSubmit, onCancel,
}: ReviewFormProps) {
  const [rating,  setRating]  = useState<number>(initialData?.rating  ?? 0);
  const [comment, setComment] = useState<string>(initialData?.comment ?? "");
  const [hover,   setHover]   = useState<number>(0);
  const [saving,  setSaving]  = useState<boolean>(false);
  const [error,   setError]   = useState<string>("");

  const handleSubmit = async () => {
    if (rating === 0)              { setError("Please select a rating"); return; }
    if (comment.trim().length < 10){ setError("Comment must be at least 10 characters"); return; }
    setError("");
    setSaving(true);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      if (!isEdit) { setRating(0); setComment(""); }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit review";
      setError(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="rf-wrap">
      <p className="rf-heading">{isEdit ? "EDIT YOUR REVIEW" : "WRITE A REVIEW"}</p>

      {/* Star rating */}
      <div className="rf-rating-section">
        <p className="rf-label">Your Rating</p>
        <div className="rf-stars">
          {Array.from({ length: 10 }, (_, i) => {
            const val = i + 1;
            return (
              <button
                key={val}
                className={`rf-star ${val <= (hover || rating) ? "active" : ""}`}
                onClick={() => setRating(val)}
                onMouseEnter={() => setHover(val)}
                onMouseLeave={() => setHover(0)}
                type="button"
                aria-label={`Rate ${val}`}
              >★</button>
            );
          })}
          {rating > 0 && (
            <span className="rf-rating-val">{rating}/10</span>
          )}
        </div>
      </div>

      {/* Comment */}
      <div className="rf-comment-section">
        <p className="rf-label">Your Review</p>
        <textarea
          className="form-input rf-textarea"
          rows={4}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your thoughts about this movie… (min 10 characters)"
          maxLength={1000}
        />
        <p className="rf-char-count">{comment.length}/1000</p>
      </div>

      {error && <p className="rf-error">⚠ {error}</p>}

      <div className="rf-actions">
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel} type="button">
            Cancel
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={saving}
          type="button"
        >
          {saving
            ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting…</>
            : isEdit ? "Save Changes" : "Submit Review"
          }
        </button>
      </div>
    </div>
  );
}