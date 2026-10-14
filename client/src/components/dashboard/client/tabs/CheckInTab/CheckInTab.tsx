import { useEffect, useMemo, useRef, useState } from "react";
import { bookingsApi } from "../../../../../api/index.api.ts";
import type { Booking, Movie, Show, Theatre, User } from "../../../../../types/movie.types.ts";
import Icon from "../../../common/Icons.tsx";
import "./CheckInTab.css";

// Chromium's BarcodeDetector isn't in the TS DOM lib yet
interface DetectedCode { rawValue: string }
interface BarcodeDetectorLike { detect: (src: HTMLVideoElement) => Promise<DetectedCode[]> }
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;
const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

type Result =
  | { ok: true;  booking: Booking; at: string }
  | { ok: false; code: string; reason: string; at: string };

const HOUR = 3_600_000;

interface ShowTally { id: string; movie: string; poster?: string; time: string; screen: string; admitted: number; total: number }

// Shows from 4 h ago to 18 h ahead, with guests admitted vs booked
function tallyShows(bookings: Booking[], admittedNow: Set<string>, now: number): ShowTally[] {
  const byShow = new Map<string, ShowTally>();
  for (const b of bookings) {
    if (b.status !== "SUCCESSFUL") continue;
    const s = b.showId as Show | undefined;
    if (!s || typeof s !== "object") continue;
    const t = new Date(s.showTime).getTime();
    if (t < now - 4 * HOUR || t > now + 18 * HOUR) continue;
    const row = byShow.get(s._id) ?? {
      id: s._id, movie: (s.movieId as Movie)?.name ?? "Show", poster: (s.movieId as Movie)?.posterUrl,
      time: s.showTime, screen: s.screen, admitted: 0, total: 0,
    };
    row.total += b.seats.length;
    if (b.checkedInAt || admittedNow.has(b._id)) row.admitted += b.seats.length;
    byShow.set(s._id, row);
  }
  return [...byShow.values()].sort((a, b) => a.time.localeCompare(b.time));
}

const timeNow = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function CheckInTab({ bookings = [] }: { bookings?: Booking[] }) {
  const [code,     setCode]     = useState("");
  const [busy,     setBusy]     = useState(false);
  const [result,   setResult]   = useState<Result | null>(null);
  const [log,      setLog]      = useState<Result[]>([]);
  const [scanning, setScanning] = useState(false);
  const [camErr,   setCamErr]   = useState("");

  const [admittedNow, setAdmittedNow] = useState<Set<string>>(() => new Set());
  const [now] = useState(() => Date.now());
  const tallies = useMemo(() => tallyShows(bookings, admittedNow, now), [bookings, admittedNow, now]);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef   = useRef(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const admit = async (raw: string) => {
    const ticketCode = raw.trim().toUpperCase();
    if (!ticketCode || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const booking = await bookingsApi.checkIn(ticketCode);
      const r: Result = { ok: true, booking, at: timeNow() };
      setResult(r); setLog(l => [r, ...l].slice(0, 12)); setCode("");
      setAdmittedNow(s => new Set(s).add(booking._id));
    } catch (e: unknown) {
      const r: Result = { ok: false, code: ticketCode, reason: e instanceof Error ? e.message : "Check-in failed", at: timeNow() };
      setResult(r); setLog(l => [r, ...l].slice(0, 12));
    } finally { busyRef.current = false; setBusy(false); }
  };

  const startCamera = async () => {
    setCamErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
    } catch {
      setCamErr("Camera unavailable — allow camera access or type the code below.");
    }
  };

  // Attach the stream once the <video> mounts, then poll frames for a QR
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current || !Detector) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play();
    const detector = new Detector({ formats: ["qr_code"] });
    let last = "";
    const timer = window.setInterval(async () => {
      if (busyRef.current || video.readyState < 2) return;
      try {
        const [hit] = await detector.detect(video);
        if (hit?.rawValue && hit.rawValue !== last) { last = hit.rawValue; void admit(hit.rawValue); }
      } catch { /* frame not ready */ }
    }, 400);
    return () => window.clearInterval(timer);
  }, [scanning]);

  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  const b = result?.ok ? result.booking : null;
  const show    = b?.showId as Show | undefined;
  const movie   = show?.movieId as Movie | undefined;
  const theatre = show?.theatreId as Theatre | undefined;
  const guest   = b?.userId as User | undefined;

  return (
    <div className="anim-fadeup">
      <div className="dash-page-header">
        <p className="dash-eyebrow">Entrance</p>
        <h1 className="dash-page-title">Ticket check-in</h1>
        <p className="dash-page-sub">Scan the QR on a guest's ticket or type the code. Each ticket can be admitted once, from 3 hours before showtime.</p>
      </div>

      <div className="ci-grid">
        <section className="ci-card">
          <div className={`ci-viewport ${scanning ? "is-live" : ""}`}>
            {scanning ? (
              <>
                <video ref={videoRef} muted playsInline />
                <span className="ci-reticle" aria-hidden="true" />
              </>
            ) : (
              <div className="ci-placeholder">
                <Icon name="scan" size={40} />
                <p>{Detector ? "Point the camera at a ticket QR" : "QR scanning isn't supported in this browser — use the code instead."}</p>
              </div>
            )}
          </div>
          {Detector && (
            <button className={`btn ${scanning ? "btn-ghost" : "btn-primary"} ci-cam-btn`} onClick={scanning ? stopCamera : startCamera}>
              {scanning ? "Stop camera" : "Start scanning"}
            </button>
          )}
          {camErr && <p className="ci-cam-err">{camErr}</p>}

          <form className="ci-manual" onSubmit={e => { e.preventDefault(); void admit(code); }}>
            <label className="form-label" htmlFor="ci-code">Ticket code</label>
            <div className="ci-manual-row">
              <input id="ci-code" className="form-input" value={code} placeholder="e.g. CV-8K2P4Q"
                onChange={e => setCode(e.target.value.toUpperCase())} autoComplete="off" />
              <button className="btn btn-primary" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Admit"}</button>
            </div>
          </form>
        </section>

        <section className="ci-card ci-result-card" aria-live="polite">
          {!result && (
            <div className="ci-idle">
              <span className="ci-idle-icon">🎟</span>
              <p>Results appear here as tickets are scanned.</p>
            </div>
          )}
          {result && !result.ok && (
            <div className="ci-verdict is-bad">
              <span className="ci-verdict-icon">✕</span>
              <div>
                <p className="ci-verdict-title">Not admitted</p>
                <p className="ci-verdict-sub">{result.reason}</p>
                <p className="ci-verdict-code">{result.code}</p>
              </div>
            </div>
          )}
          {b && (
            <>
              <div className="ci-verdict is-ok">
                <span className="ci-verdict-icon">✓</span>
                <div>
                  <p className="ci-verdict-title">Admit {b.seats.length} {b.seats.length > 1 ? "guests" : "guest"}</p>
                  <p className="ci-verdict-sub">{guest?.name ?? "Guest"} · {b.ticketCode}</p>
                </div>
              </div>
              <dl className="ci-facts">
                <div><dt>Movie</dt><dd>{movie?.name ?? "—"}</dd></div>
                <div><dt>Show</dt><dd>{show?.showTime ? new Date(show.showTime).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "—"}{theatre?.name ? ` · ${theatre.name}` : ""}</dd></div>
                <div><dt>Seats</dt><dd className="ci-seats">{b.seats.map(s => <span key={s}>{s}</span>)}</dd></div>
              </dl>
              {(b.addOns?.length ?? 0) > 0 && (
                <div className="ci-food">
                  <p className="ci-food-title">🍿 Hand over at counter</p>
                  <ul>{b.addOns!.map(a => <li key={a.itemId}><b>{a.qty}×</b> {a.name}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {tallies.length > 0 && (
        <section className="ci-tally" aria-label="Today's shows">
          <p className="ci-tally-title">Today's shows · guests admitted</p>
          <div className="ci-tally-grid">
            {tallies.map(t => {
              const pct = t.total ? Math.round((t.admitted / t.total) * 100) : 0;
              return (
                <div key={t.id} className="ci-tally-card">
                  {t.poster && <img src={t.poster} alt="" />}
                  <div className="ci-tally-body">
                    <p className="ci-tally-movie">{t.movie}</p>
                    <p className="ci-tally-meta">{new Date(t.time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · {t.screen}</p>
                    <div className="ci-tally-bar" role="progressbar" aria-valuenow={t.admitted} aria-valuemin={0} aria-valuemax={t.total}
                      aria-label={`${t.admitted} of ${t.total} guests admitted`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <p className="ci-tally-count"><b>{t.admitted}</b> / {t.total} in</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {log.length > 0 && (
        <div className="dash-table-wrap" style={{ marginTop: 20 }}>
          <table className="dash-table">
            <thead><tr><th>Time</th><th>Ticket</th><th>Result</th></tr></thead>
            <tbody>
              {log.map((r, i) => (
                <tr key={i}>
                  <td className="cell-muted">{r.at}</td>
                  <td><strong>{r.ok ? r.booking.ticketCode : r.code}</strong>{r.ok && <small>{(r.booking.userId as User | undefined)?.name} · {r.booking.seats.join(", ")}</small>}</td>
                  <td>{r.ok ? <span className="badge badge-green">Admitted</span> : <span className="badge badge-red">{r.reason}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
