import { useState } from "react";
import UserAvatar  from "../../dashboard/common/UserAvatar/UserAvatar.tsx";
import { reviewsApi } from "../../../api/index.api.ts";
import { showToast }  from "../../common/Toast/toast.ts";
import "./ReviewCard.css";

export interface Review {
  _id:       string;
  rating:    number;
  comment:   string;
  createdAt: string;
  likes:     string[];
  userId:    { _id: string; name: string } | string;
}

interface ReviewCardProps {
  review:          Review;
  currentUserId?:  string;
  onEdit:          (review: Review) => void;
  onDelete:        (reviewId: string) => void;
  onLikeToggle:    (reviewId: string, liked: boolean) => void;
}

export default function ReviewCard({
  review, currentUserId, onEdit, onDelete, onLikeToggle,
}: ReviewCardProps) {
  const [liking, setLiking] = useState<boolean>(false);

  const user    = typeof review.userId === "object" ? review.userId : null;
  const isOwner = !!(currentUserId && user?._id === currentUserId);
  const liked   = !!(currentUserId && review.likes.includes(currentUserId));

  const handleLike = async () => {
    if (!currentUserId) { showToast("Login to like reviews", "error"); return; }
    setLiking(true);
    try {
      const res = await reviewsApi.toggleLike(review._id);
      onLikeToggle(review._id, res.liked);
    } catch {
      showToast("Failed to like", "error");
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="rc">
      <div className="rc-header">
        <UserAvatar name={user?.name ?? "?"} size="md" />
        <div className="rc-user-info">
          <p className="rc-user-name">{user?.name ?? "Anonymous"}</p>
          <p className="rc-date">
            {new Date(review.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        {/* Stars */}
        <div className="rc-stars">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`rc-star ${i < review.rating ? "filled" : ""}`}>★</span>
          ))}
          <span className="rc-rating-num">{review.rating}/10</span>
        </div>
      </div>

      <p className="rc-comment">{review.comment}</p>

      <div className="rc-footer">
        <button
          className={`rc-like-btn ${liked ? "liked" : ""}`}
          onClick={handleLike}
          disabled={liking}
        >
          {liked ? "♥" : "♡"} {review.likes.length}
        </button>

        {isOwner && (
          <div className="rc-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(review)}>
              Edit
            </button>
            <button className="btn btn-ghost btn-sm rc-delete-btn"
              onClick={() => onDelete(review._id)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}