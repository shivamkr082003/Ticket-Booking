import { useState, useEffect, useCallback, useRef } from "react";
import ReviewCard  from "../ReviewCard/ReviewCard.tsx";
import ReviewForm  from "../ReviewForm/ReviewForm.tsx";
import Modal       from "../../common/Modal/Modal.tsx";
import { reviewsApi } from "../../../api/index.api.ts";
import { showToast }  from "../../common/Toast/toast.ts";
import { useAuth }    from "../../../context/AuthContext.tsx";
import "./ReviewSection.css";

interface ReviewSectionProps {
  movieId:        string;
  onRatingUpdate?: (avgRating: number | null) => void;
}

interface RatingDist {
  _id:   number;
  count: number;
}

interface Review {
  _id:       string;
  rating:    number;
  comment:   string;
  createdAt: string;
  likes:     string[];
  userId:    { _id: string; name: string } | string;
}

export default function ReviewSection({ movieId, onRatingUpdate }: ReviewSectionProps) {
  const { user } = useAuth();

  const [reviews,       setReviews]       = useState<Review[]>([]);
  const [myReview,      setMyReview]      = useState<Review | null>(null);
  const [loading,       setLoading]       = useState<boolean>(true);
  const [page,          setPage]          = useState<number>(1);
  const [totalPages,    setTotalPages]    = useState<number>(1);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showForm,      setShowForm]      = useState<boolean>(false);
  const [ratingDist,    setRatingDist]    = useState<RatingDist[]>([]);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);

  // Use ref to avoid fetchReviews recreation on every onRatingUpdate change
  const onRatingUpdateRef = useRef(onRatingUpdate);
  useEffect(() => { onRatingUpdateRef.current = onRatingUpdate; }, [onRatingUpdate]);

  const fetchReviews = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const data = await reviewsApi.getByMovie(movieId, p);
      const dist: RatingDist[] = data.ratingDistribution ?? [];
      setReviews(data.reviews ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setRatingDist(dist);

      // Calculate avg from fresh data and update parent
      const total = dist.reduce((a: number, r: RatingDist) => a + r.count, 0);
      const avg   = total > 0
        ? Math.round(dist.reduce((a: number, r: RatingDist) => a + r._id * r.count, 0) / total * 10) / 10
        : null;
      onRatingUpdateRef.current?.(avg);
    } catch {
      showToast("Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  const fetchMyReview = useCallback(async () => {
    if (!user) return;
    try {
      const r = await reviewsApi.getMyReview(movieId);
      setMyReview(r ?? null);
    } catch {
      setMyReview(null);
    }
  }, [movieId, user]);

  useEffect(() => {
    fetchReviews(1);
    fetchMyReview();
  }, [fetchReviews, fetchMyReview]);

  const handleCreate = async (data: { rating: number; comment: string }) => {
    await reviewsApi.create({ movieId, ...data });
    showToast("Review added! 🎉");
    setShowForm(false);
    await fetchReviews(1);
    fetchMyReview();
  };

  const handleUpdate = async (data: { rating: number; comment: string }) => {
    if (!editingReview) return;
    await reviewsApi.update(editingReview._id, data);
    showToast("Review updated!");
    setEditingReview(null);
    await fetchReviews(page);
    fetchMyReview();
  };

  const handleDelete = (reviewId: string) => {
    setDeleteId(reviewId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await reviewsApi.delete(deleteId);
      showToast("Review deleted");
      await fetchReviews(page);
      fetchMyReview();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      showToast(msg, "error");
    } finally {
      setDeleteId(null);
    }
  };

  const handleLikeToggle = (reviewId: string, liked: boolean) => {
    setReviews(prev => prev.map(r =>
      r._id === reviewId
        ? {
            ...r,
            likes: liked
              ? [...r.likes, user?._id ?? ""]
              : r.likes.filter((id: string) => id !== (user?._id ?? user?.id))
          }
        : r
    ));
  };

  // Rating summary
  const totalReviews = ratingDist.reduce((a, r) => a + r.count, 0);
  const avgRating    = totalReviews
    ? (ratingDist.reduce((a, r) => a + r._id * r.count, 0) / totalReviews).toFixed(1)
    : null;
  const maxCount = Math.max(...ratingDist.map(r => r.count), 1);

  return (
    <section className="rs-section">
      <div className="rs-header">
        <div>
          <p className="rs-eyebrow">What people say</p>
          <h2 className="rs-title">REVIEWS & RATINGS</h2>
        </div>
        {user && !myReview && !showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Write a Review
          </button>
        )}
      </div>

      {/* Rating summary */}
      {totalReviews > 0 && (
        <div className="rs-summary">
          <div className="rs-avg">
            <p className="rs-avg-num">{avgRating}</p>
            <p className="rs-avg-label">out of 10</p>
            <p className="rs-avg-count">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
          </div>
          <div className="rs-dist">
            {[10,9,8,7,6,5,4,3,2,1].map(val => {
              const found = ratingDist.find(d => d._id === val);
              const cnt   = found?.count ?? 0;
              return (
                <div key={val} className="rs-dist-row">
                  <span className="rs-dist-label">{val} ★</span>
                  <div className="rs-dist-bar">
                    <div className="rs-dist-fill"
                      style={{ width: `${(cnt / maxCount) * 100}%` }} />
                  </div>
                  <span className="rs-dist-count">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write review form */}
      {showForm && !myReview && (
        <ReviewForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* My existing review */}
      {myReview && !editingReview && (
        <div className="rs-my-review">
          <p className="rs-my-label">YOUR REVIEW</p>
          <ReviewCard
            review={myReview}
            currentUserId={user?._id ?? user?.id}
            onEdit={r => setEditingReview(r)}
            onDelete={handleDelete}
            onLikeToggle={handleLikeToggle}
          />
        </div>
      )}

      {/* Edit form */}
      {editingReview && (
        <ReviewForm
          initialData={{ rating: editingReview.rating, comment: editingReview.comment }}
          isEdit
          onSubmit={handleUpdate}
          onCancel={() => setEditingReview(null)}
        />
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />
          ))}
        </div>
      ) : reviews.length === 0 && !myReview ? (
        <div className="empty-state" style={{ padding: "32px 0" }}>
          <div className="empty-state-icon">💬</div>
          <p className="empty-state-title">No Reviews Yet</p>
          <p className="empty-state-sub">Be the first to review this movie!</p>
        </div>
      ) : (
        <div className="rs-list">
          {reviews
            .filter(r => r._id !== myReview?._id)
            .map(r => (
              <ReviewCard
                key={r._id}
                review={r}
                currentUserId={user?._id ?? user?.id}
                onEdit={r => setEditingReview(r)}
                onDelete={handleDelete}
                onLikeToggle={handleLikeToggle}
              />
            ))
          }
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="rs-pagination">
          <button className="btn btn-ghost btn-sm"
            disabled={page === 1}
            onClick={() => { const p = page - 1; setPage(p); fetchReviews(p); }}>
            ← Prev
          </button>
          <span className="rs-page-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm"
            disabled={page === totalPages}
            onClick={() => { const p = page + 1; setPage(p); fetchReviews(p); }}>
            Next →
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <Modal
          title="DELETE REVIEW"
          onClose={() => setDeleteId(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Are you sure you want to delete your review? This cannot be undone.
          </p>
        </Modal>
      )}
    </section>
  );
}