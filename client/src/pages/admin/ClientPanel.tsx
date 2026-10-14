import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppNavbar       from "../../components/common/Navbar/Navbar.tsx";
import { PageSpinner, ConfirmModal} from "../../components/common/SharedUI/SharedUI.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import DashSidebar     from "../../components/dashboard/common/DashSidebar/DashSidebar.tsx";
import ClientOverviewTab  from "../../components/dashboard/client/tabs/OverviewTab/OverviewTab.tsx";
import ClientTheatresTab  from "../../components/dashboard/client/tabs/TheatresTab/TheatresTab.tsx";
import ClientShowsTab     from "../../components/dashboard/client/tabs/ShowsTab/ShowsTab.tsx";
import ClientBookingsTab  from "../../components/dashboard/client/tabs/BookingsTab/BookingsTab.tsx";
import ClientAnalyticsTab from "../../components/dashboard/client/tabs/AnalyticsTab/AnalyticsTab.tsx";
import PayoutsView        from "../../components/dashboard/common/PayoutsView.tsx";
import CheckInTab         from "../../components/dashboard/client/tabs/CheckInTab/CheckInTab.tsx";
import ProfileTab         from "../../components/dashboard/client/tabs/ProfileTab/ProfileTab.tsx";
import TheatreForm        from "../../components/dashboard/forms/TheatreForm/TheatreForm.tsx";
import ShowForm           from "../../components/dashboard/forms/ShowForm/ShowForm.tsx";
import AddMovieToTheatreModal from "./AddMovieToTheatreModal.tsx";
import { moviesApi, theatresApi, showsApi, bookingsApi, usersApi } from "../../api/index.api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import type { Movie, Theatre, Show, Booking } from "../../types/movie.types.ts";
import type { IconName } from "../../components/dashboard/common/Icons.tsx";
import "../../styles/dashboard.css";

type Tab = "overview"|"theatres"|"shows"|"bookings"|"analytics"|"checkin"|"payouts"|"profile";

const NAV_ITEMS: { tab: Tab; icon: IconName; label: string }[] = [
  { tab: "overview",  icon: "overview",  label: "Overview"    },
  { tab: "analytics", icon: "analytics", label: "Analytics"   },
  { tab: "bookings",  icon: "bookings",  label: "Bookings"    },
  { tab: "checkin",   icon: "scan",      label: "Check-in"    },
  { tab: "payouts",   icon: "revenue",   label: "Payouts"     },
  { tab: "theatres",  icon: "theatres",  label: "My Theatres" },
  { tab: "shows",     icon: "shows",     label: "Shows"       },
  { tab: "profile",   icon: "profile",   label: "Profile"     },
];

export default function ClientPanel() {
  const { user: me, updateUser } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as Tab) ?? "overview";
  const go  = (t: Tab) => setSp({ tab: t });

  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [shows,    setShows]    = useState<Show[]>([]);
  const [movies,   setMovies]   = useState<Movie[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [theatreModal, setTheatreModal] = useState<{ open: boolean; data: Theatre | null }>({ open: false, data: null });
  const [showModal,    setShowModal]    = useState<{ open: boolean; data: Show    | null }>({ open: false, data: null });
  const [addMvModal,   setAddMvModal]   = useState<{ open: boolean; theatreId: string; theatreName: string } | null>(null);
  const [delConf,      setDelConf]      = useState<{ type: "theatre" | "show"; id: string; label: string } | null>(null);

  // Refresh user status on mount
  useEffect(() => {
    const id = me?.id ?? me?._id;
    if (!id) return;
    usersApi.getById(id).then(fresh => {
      if (fresh.userStatus !== me?.userStatus) updateUser(fresh);
    }).catch(() => {});
  }, [me?.id, me?._id, me?.userStatus, updateUser]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      theatresApi.getAll(),
      showsApi.getAll(),
      moviesApi.getAll(),
      bookingsApi.getForOwner(),
    ]).then(([t, s, m, b]) => {
      if (t.status === "fulfilled") setTheatres(t.value as Theatre[]);
      if (s.status === "fulfilled") setShows(s.value as Show[]);
      if (m.status === "fulfilled") setMovies(m.value as Movie[]);
      if (b.status === "fulfilled") setBookings(b.value as Booking[]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Only theatres this owner registered — the server rejects edits to anyone else's
  const myId = me?.id ?? me?._id;
  const myTheatres = useMemo(() => theatres.filter(t => {
    const owner = t.owner as unknown;
    const ownerId = owner && typeof owner === "object" ? (owner as { _id?: string })._id : owner;
    return !ownerId || String(ownerId) === String(myId);
  }), [theatres, myId]);
  const myShows    = useMemo(() => shows.filter(s => {
    const tId = typeof s.theatreId === "object" ? (s.theatreId as Theatre)._id : s.theatreId;
    return myTheatres.some(t => t._id === tId);
  }), [shows, myTheatres]);
  const myBookings = useMemo(() => bookings.filter(b => {
    const show = b.showId as Show;
    return myShows.some(s => s._id === show?._id);
  }), [bookings, myShows]);

  const approved = String(me?.userStatus ?? "").toUpperCase() === "APPROVED";

  const handleDelete = async () => {
    if (!delConf) return;
    try {
      if (delConf.type === "theatre") await theatresApi.delete(delConf.id);
      if (delConf.type === "show")    await showsApi.delete(delConf.id);
      showToast("Deleted successfully");
      load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error", "error"); }
    finally { setDelConf(null); }
  };

  if (!approved) return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="pending-wall">
        <div className="pending-wall-icon">⏳</div>
        <h2 className="pending-wall-title">ACCOUNT PENDING APPROVAL</h2>
        <p className="pending-wall-sub">Your theatre owner account is under review. Once an admin approves it, you'll get full access to manage theatres, create shows, and view analytics.</p>
        <span className="badge badge-yellow" style={{ fontSize: 13, padding: "8px 20px" }}>Status: Pending</span>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />
      <div className="dash-shell">
        <DashSidebar
          name={me?.name ?? "Client"}
          role="Theatre Owner"
          activeTab={tab}
          navItems={NAV_ITEMS}
          onTabChange={t => go(t as Tab)}
          footerNote="Manage your theatres, shows & revenue."
        />

        <main className="dash-main">
          {loading ? <PageSpinner /> : (
            <>
              {tab === "overview"  && <ClientOverviewTab  myTheatres={myTheatres} myShows={myShows} myBookings={myBookings} movies={movies} onTabChange={t => go(t as Tab)} />}
              {tab === "theatres"  && <ClientTheatresTab  theatres={myTheatres} movies={movies} onAddTheatre={() => setTheatreModal({ open: true, data: null })} onEditTheatre={t => setTheatreModal({ open: true, data: t })} onDeleteTheatre={(id, name) => setDelConf({ type: "theatre", id, label: name })} onAddMovie={(theatreId, theatreName) => setAddMvModal({ open: true, theatreId, theatreName })} />}
              {tab === "shows"     && <ClientShowsTab     myShows={myShows} movies={movies} myTheatres={myTheatres} onAddShow={() => setShowModal({ open: true, data: null })} onEditShow={s => setShowModal({ open: true, data: s })} onDeleteShow={(id, label) => setDelConf({ type: "show", id, label })} />}
              {tab === "bookings"  && <ClientBookingsTab  myBookings={myBookings} />}
              {tab === "analytics" && <ClientAnalyticsTab myBookings={myBookings} myShows={myShows} movies={movies} />}
              {tab === "payouts"   && <PayoutsView />}
              {tab === "checkin"   && <CheckInTab bookings={myBookings} />}
              {tab === "profile"   && <ProfileTab         user={me!} onUpdated={updated => updateUser(updated)} />}
            </>
          )}
        </main>
      </div>

      {theatreModal.open && <TheatreForm data={theatreModal.data} onClose={() => setTheatreModal({ open: false, data: null })} onSave={() => { load(); setTheatreModal({ open: false, data: null }); }} />}
      {showModal.open    && <ShowForm    data={showModal.data}    movies={movies} theatres={myTheatres} onClose={() => setShowModal({ open: false, data: null })} onSave={() => { load(); setShowModal({ open: false, data: null }); }} />}
      {addMvModal?.open  && <AddMovieToTheatreModal theatreId={addMvModal.theatreId} theatreName={addMvModal.theatreName} allMovies={movies} onClose={() => setAddMvModal(null)} onSave={() => { load(); setAddMvModal(null); }} />}
      {delConf && <ConfirmModal title={`DELETE ${delConf.type.toUpperCase()}`} message={`Permanently delete "${delConf.label}"?`} danger onConfirm={handleDelete} onCancel={() => setDelConf(null)} />}
    </div>
  );
}