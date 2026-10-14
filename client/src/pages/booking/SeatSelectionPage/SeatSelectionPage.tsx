import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppNavbar      from "../../../components/common/Navbar/Navbar.tsx";
import { PageSpinner} from "../../../components/common/SharedUI/SharedUI.tsx";
import { showToast } from "../../../components/common/Toast/toast.ts";
import SeatGrid       from "../../../components/booking/SeatGrid/SeatGrid.tsx";
import BookingSummary from "../../../components/booking/BookingSummary/BookingSummary.tsx";
import FoodPicker     from "../../../components/booking/FoodPicker/FoodPicker.tsx";
import OfferPicker    from "../../../components/booking/OfferPicker/OfferPicker.tsx";
import { showsApi, bookingsApi, walletApi } from "../../../api/index.api.ts";
import { bookingFeeFor } from "../../../utils/fees.ts";
import { useAuth }    from "../../../context/AuthContext.tsx";
import { useShowSocket } from "../../../hooks/useShowSocket.ts";
import { isPrimeMember, primeDiscountFor } from "../../../utils/prime.ts";
import { bestAvailable, layoutFor, priceSelection } from "../../../utils/seatLayout.ts";
import { TAG_ICON } from "../../../constants/showTags.ts";
import type { Show, Movie, Theatre, OrderQuote, AddOn } from "../../../types/movie.types.ts";
import "./SeatSelectionPage.css";

const MAX_SEATS = 10;

export default function SeatSelectionPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [show,      setShow]      = useState<Show | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<string[]>([]);
  const [initiating, setInitiating] = useState(false);
  const [step,       setStep]       = useState<"seats" | "food">("seats");
  const [foodQty,    setFoodQty]    = useState<Record<string, number>>({});
  const [coupon,     setCoupon]     = useState<string | null>(null);
  const [couponErr,  setCouponErr]  = useState("");
  const [quote,      setQuote]      = useState<OrderQuote | null>(null);
  const [bestN,      setBestN]      = useState(2);
  const [wallet,     setWallet]     = useState(0);
  const [useWallet,  setUseWallet]  = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    walletApi.get().then(w => { if (!cancelled) { setWallet(w.balance); setUseWallet(w.balance > 0); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const addOnsPayload = useMemo(
    () => Object.entries(foodQty).filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty })),
    [foodQty],
  );

  // Server quote (tickets, Prime, food, coupon) — debounced; the server is the source of truth
  useEffect(() => {
    if (!showId || selected.length === 0) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      bookingsApi.quote(showId, selected, { addOns: addOnsPayload, couponCode: coupon })
        .then(q => { if (!cancelled) setQuote(q); })
        .catch((e: unknown) => {
          if (cancelled || !coupon) return;
          // Coupon no longer applies (min order, limits…) — explain and drop it
          setCouponErr(e instanceof Error ? e.message : "This coupon can't be applied");
          setCoupon(null);
        });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [showId, selected, addOnsPayload, coupon]);

  // Real-time seat state via socket
  const { bookedSeats, tempBlocked, selectSeats, deselectSeats, isSeatTaken } = useShowSocket(
    showId,
    user?.id ?? user?._id,
    show?.bookedSeats ?? []
  );

  useEffect(() => {
    if (!showId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const s = await showsApi.getById(showId);
        if (!cancelled) setShow(s);
      } catch {
        if (!cancelled) showToast("Failed to load show", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [showId]);

  const menu = useMemo(() => {
    const th = show && typeof show.theatreId === "object" ? (show.theatreId as Theatre) : null;
    return (th?.menu ?? []).filter(m => m._id);
  }, [show]);
  const hasMenu = menu.some(m => m.available !== false);

  const handleSeatClick = useCallback((seat: string) => {
    if (isSeatTaken(seat)) return;

    if (!selected.includes(seat) && selected.length >= MAX_SEATS) {
      showToast(`You can book up to ${MAX_SEATS} seats at a time`, "error");
      return;
    }

    setSelected(prev => {
      if (prev.includes(seat)) {
        // Deselect — notify others
        deselectSeats([seat]);
        return prev.filter(s => s !== seat);
      } else {
        // Select — notify others
        selectSeats([seat]);
        return [...prev, seat];
      }
    });
  }, [isSeatTaken, selectSeats, deselectSeats, selected]);

  // Group booking: send friends this showtime so they can see the seats being held
  const invite = async () => {
    if (!show) return;
    const m = typeof show.movieId === "object" ? (show.movieId as Movie).name : "a movie";
    const th = typeof show.theatreId === "object" ? (show.theatreId as Theatre).name : "";
    const when = new Date(show.showTime).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    const text = `Movie plan? 🍿 ${m} · ${when}${th ? ` · ${th}` : ""}${selected.length ? `\nI'm looking at seats ${selected.join(", ")}` : ""}`;
    const url = `${window.location.origin}/shows/${show._id}/seats`;
    if (navigator.share) { try { await navigator.share({ title: m, text, url }); return; } catch { /* dismissed */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener");
  };

  // Swap the current selection for the n best adjacent seats
  const pickBest = () => {
    if (!show) return;
    const taken = new Set([...bookedSeats, ...tempBlocked].filter(s => !selected.includes(s)));
    const seats = bestAvailable(layoutFor(show), bestN, taken);
    if (!seats.length) { showToast(`No ${bestN} seats together right now — try fewer, or pick them yourself`, "error"); return; }
    if (selected.length) deselectSeats(selected);
    selectSeats(seats);
    setSelected(seats);
  };

  const handleProceed = async () => {
    if (selected.length === 0) { showToast("Please select at least one seat", "error"); return; }
    if (!showId) return;
    if (step === "seats" && hasMenu) { setStep("food"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    setInitiating(true);
    try {
      const result = await bookingsApi.initiate(showId, selected, { addOns: addOnsPayload, couponCode: coupon, useWallet: useWallet && wallet > 0 });
      if (result.paidWithWallet) {
        showToast("🎉 Paid from your wallet — booking confirmed!");
        navigate(`/ticket/${result.bookingId}`);
        return;
      }
      // Navigate to payment with booking data
      navigate("/payment", { state: { booking: result } });
    } catch (e: unknown) {
      showToast((e instanceof Error ? e.message : "Something went wrong") ?? "Failed to initiate booking", "error");
      // Re-fetch show to get updated seat state
      const updated = await showsApi.getById(showId!);
      setShow(updated);
      setSelected([]);
    } finally {
      setInitiating(false);
    }
  };

  if (loading) return <div className="page-wrapper"><AppNavbar /><PageSpinner /></div>;

  if (!show) return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">🎬</div>
        <p className="empty-state-title">Show Not Found</p>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  );

  const movie   = typeof show.movieId   === "object" ? show.movieId   as Movie   : null;
  const theatre = typeof show.theatreId === "object" ? show.theatreId as Theatre : null;

  const showInfo = {
    movieName: movie?.name    ?? "Movie",
    poster:    movie?.posterUrl,
    theatre:   theatre?.name  ?? "Theatre",
    showTime:  show.showTime,
    format:    show.format,
    language:  show.language,
    screen:    show.screen,
    price:     show.price,
  };

  // Instant local preview; the coupon line comes from the latest server quote
  const { lineItems, subtotal } = priceSelection(show, selected);
  const primeSavings = primeDiscountFor(subtotal);
  const isPrime      = isPrimeMember(user);
  const addOns: AddOn[] = addOnsPayload.flatMap(({ itemId, qty }) => {
    const item = menu.find(m => m._id === itemId);
    return item ? [{ itemId, name: item.name, price: item.price, qty }] : [];
  });
  const liveQuote = selected.length > 0 ? quote : null;
  const couponDiscount = coupon && liveQuote?.couponCode === coupon ? liveQuote.couponDiscount : 0;
  const fee = bookingFeeFor(selected.length, isPrime);
  const orderTotal = subtotal - (isPrime ? primeSavings : 0) + addOns.reduce((a, f) => a + f.price * f.qty, 0) - couponDiscount + fee.bookingFee + fee.bookingFeeGst;
  const walletApplied = useWallet && step === "food" || useWallet && !hasMenu ? Math.min(wallet, orderTotal) : 0;

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <div className="ssp-container container">
        {/* Header */}
        <div className="ssp-header">
          <button className="btn btn-ghost btn-sm" onClick={() => (step === "food" ? setStep("seats") : navigate(-1))}>← Back</button>
          <div>
            <h1 className="ssp-title">{movie?.name ?? "Select Seats"}</h1>
            <p className="ssp-sub">
              {theatre?.name} · {new Date(show.showTime).toLocaleString("en-IN", {
                weekday: "short", day: "numeric", month: "short",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
            {((show.tags?.length ?? 0) > 0 || (show.priceAdjustments?.length ?? 0) > 0) && (
              <div className="ssp-chips">
                {show.tags?.map(t => <span key={t} className="ssp-chip"><span aria-hidden="true">{TAG_ICON[t]}</span> {t}</span>)}
                {show.priceAdjustments?.map(a => (
                  <span key={a.label} className={`ssp-chip ${a.pct < 0 ? "is-deal" : "is-surge"}`}
                    title={`${a.label} pricing applied to this show`}>
                    {a.label} {a.pct > 0 ? "+" : ""}{a.pct}%
                  </span>
                ))}
              </div>
            )}
          </div>
          {hasMenu && (
            <ol className="ssp-steps" aria-label="Checkout steps">
              <li className={step === "seats" ? "active" : "done"}>Seats</li>
              <li className={step === "food" ? "active" : ""}>Food &amp; drinks</li>
              <li>Payment</li>
            </ol>
          )}
        </div>

        <div className="ssp-layout">
          {/* Seat Grid */}
          <div className="ssp-grid-wrap">
            {step === "seats" && (
              <div className="ssp-best">
                <span className="ssp-best-label">✨ Best available</span>
                <div className="ssp-best-n" role="group" aria-label="Number of seats">
                  <button onClick={() => setBestN(n => Math.max(1, n - 1))} aria-label="Fewer seats">−</button>
                  <span>{bestN}</span>
                  <button onClick={() => setBestN(n => Math.min(MAX_SEATS, n + 1))} aria-label="More seats">+</button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={pickBest}>Pick {bestN === 1 ? "a seat" : `${bestN} seats`} for me</button>
                <button className="btn btn-ghost btn-sm" onClick={invite} title="Share this showtime with friends">👥 Invite friends</button>
              </div>
            )}
            {step === "seats" ? (
              <SeatGrid
                layout={layoutFor(show)}
                selectedSeats={selected}
                bookedSeats={bookedSeats}
                tempBlocked={tempBlocked}
                onSeatClick={handleSeatClick}
              />
            ) : (
              <FoodPicker
                menu={menu}
                qty={foodQty}
                onChange={(id, q) => setFoodQty(prev => ({ ...prev, [id]: q }))}
              />
            )}
          </div>

          {/* Booking Summary */}
          <div className="ssp-summary-wrap">
            <BookingSummary
              show={showInfo}
              selectedSeats={selected}
              onConfirm={handleProceed}
              confirming={initiating}
              disabled={initiating}
              ctaLabel={step === "seats" && hasMenu ? "Continue" : addOns.length === 0 && step === "food" ? "Skip & Pay" : "Proceed to Pay"}
              lineItems={lineItems}
              discount={isPrime ? primeSavings : 0}
              primeSavings={isPrime ? 0 : primeSavings}
              addOns={addOns}
              couponCode={coupon}
              couponDiscount={couponDiscount}
              prime={isPrime}
              walletApplied={walletApplied}
              policy={theatre?.cancellationPolicy}
            >
              {selected.length > 0 && wallet > 0 && (step === "food" || !hasMenu) && (
                <label className="bs-wallet">
                  <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
                  <span>Use wallet balance <small>₹{wallet.toLocaleString("en-IN")} available</small></span>
                </label>
              )}
              {selected.length > 0 && (
                <OfferPicker
                  applied={couponDiscount > 0 ? coupon : null}
                  discount={couponDiscount}
                  error={couponErr}
                  onApply={code => { setCouponErr(""); setCoupon(code); }}
                  onRemove={() => { setCoupon(null); setCouponErr(""); }}
                />
              )}
            </BookingSummary>
          </div>
        </div>
      </div>
    </div>
  );
}