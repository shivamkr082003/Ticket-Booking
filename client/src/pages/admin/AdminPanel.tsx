import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageSpinner,ConfirmModal } from "../../components/common/SharedUI/SharedUI.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import AppNavbar     from "../../components/common/Navbar/Navbar.tsx";
import DashSidebar   from "../../components/dashboard/common/DashSidebar/DashSidebar.tsx";
import OverviewTab   from "../../components/dashboard/admin/tabs/OverviewTab/OverviewTab.tsx";
import UsersTab      from "../../components/dashboard/admin/tabs/UsersTab/UsersTab.tsx";
import MoviesTab     from "../../components/dashboard/admin/tabs/MoviesTab/MoviesTab.tsx";
import TheatresTab   from "../../components/dashboard/admin/tabs/TheatresTab/TheatresTab.tsx";
import ShowsTab      from "../../components/dashboard/admin/tabs/ShowsTab/ShowsTab.tsx";
import BookingsTab   from "../../components/dashboard/admin/tabs/BookingsTab/BookingsTab.tsx";
import AnalyticsTab  from "../../components/dashboard/admin/tabs/AnalyticsTab/AnalyticsTab.tsx";
import SupportTab    from "../../components/dashboard/admin/tabs/SupportTab/SupportTab.tsx";
import ActivityTab   from "../../components/dashboard/admin/tabs/ActivityTab/ActivityTab.tsx";
import PayoutsView   from "../../components/dashboard/common/PayoutsView.tsx";
import OffersTab     from "../../components/dashboard/admin/tabs/OffersTab/OffersTab.tsx";
import MovieForm     from "../../components/dashboard/forms/MovieForm/MovieForm.tsx";
import ShowForm      from "../../components/dashboard/forms/ShowForm/ShowForm.tsx";
import { moviesApi, theatresApi, showsApi, usersApi, bookingsApi } from "../../api/index.api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import type { Movie, Theatre, Show, User, Booking } from "../../types/movie.types.ts";
import type { IconName } from "../../components/dashboard/common/Icons.tsx";
import "../../styles/dashboard.css";

type Tab = "overview"|"users"|"movies"|"theatres"|"shows"|"bookings"|"analytics"|"offers"|"payouts"|"support"|"activity";

const NAV_ITEMS: { tab: Tab; icon: IconName; label: string }[] = [
  { tab: "overview",  icon: "overview",  label: "Overview"  },
  { tab: "analytics", icon: "analytics", label: "Analytics" },
  { tab: "bookings",  icon: "bookings",  label: "Bookings"  },
  { tab: "offers",    icon: "offers",    label: "Offers"    },
  { tab: "payouts",   icon: "revenue",   label: "Payouts"   },
  { tab: "support",   icon: "support",   label: "Support"   },
  { tab: "activity",  icon: "activity",  label: "Activity"  },
  { tab: "movies",    icon: "movies",    label: "Movies"    },
  { tab: "theatres",  icon: "theatres",  label: "Theatres"  },
  { tab: "shows",     icon: "shows",     label: "Shows"     },
  { tab: "users",     icon: "users",     label: "Users"     },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as Tab) ?? "overview";
  const go  = (t: Tab) => setSp({ tab: t });

  const [movies,   setMovies]   = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [shows,    setShows]    = useState<Show[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Modals
  const [movieModal, setMovieModal] = useState<{ open: boolean; data: Movie | null }>({ open: false, data: null });
  const [showModal,  setShowModal]  = useState<{ open: boolean; data: Show  | null }>({ open: false, data: null });

  // Confirm dialogs
  const [delConf,  setDelConf]  = useState<{ type: string; id: string; label: string } | null>(null);
  const [aprConf,  setAprConf]  = useState<{ userId: string; name: string; status: "APPROVED"|"REJECTED" } | null>(null);

  const pending = users.filter(u => u.userStatus === "PENDING");

  const load = async () => {
    setLoading(true);
    try {
      const [m, t, s, u, b] = await Promise.allSettled([
        moviesApi.getAll(),
        theatresApi.getAll(),
        showsApi.getAll(),
        usersApi.getAll(),
        bookingsApi.getForOwner(),
      ]);
      if (m.status === "fulfilled") setMovies(m.value);
      if (t.status === "fulfilled") setTheatres(t.value);
      if (s.status === "fulfilled") setShows(s.value);
      if (u.status === "fulfilled") setUsers(u.value);
      if (b.status === "fulfilled") setBookings(b.value);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!delConf) return;
    try {
      if (delConf.type === "movie")   await moviesApi.delete(delConf.id);
      if (delConf.type === "theatre") await theatresApi.delete(delConf.id);
      if (delConf.type === "show")    await showsApi.delete(delConf.id);
      if (delConf.type === "user")    await usersApi.delete(delConf.id);
      showToast(`${delConf.label} deleted`);
      load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setDelConf(null); }
  };

  const handleApproval = async () => {
    if (!aprConf) return;
    try {
      await usersApi.updateStatus(aprConf.userId, aprConf.status);
      showToast(`${aprConf.name} ${aprConf.status.toLowerCase()}`);
      load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setAprConf(null); }
  };

  // Nav with pending badge
  const navItems = NAV_ITEMS.map(n =>
    n.tab === "users" ? { ...n, badge: pending.length } : n
  );

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />
      <div className="dash-shell">
      <DashSidebar
        name={user?.name ?? "Admin"}
        role="Administrator"
        activeTab={tab}
        navItems={navItems}
        onTabChange={t => go(t as Tab)}
        footerNote="Admin controls movies, users & the whole platform."
      />

      <main className="dash-main">
        {loading ? <PageSpinner /> : (
          <>
            {tab === "overview"  && <OverviewTab  users={users} movies={movies} theatres={theatres} shows={shows} bookings={bookings} onTabChange={t => go(t as Tab)} />}
            {tab === "users"     && <UsersTab     users={users} myId={user?._id ?? user?.id} onApprove={(id, status, name) => setAprConf({ userId: id, status, name })} onDelete={(id, name) => setDelConf({ type: "user", id, label: name })} />}
            {tab === "movies"    && <MoviesTab    movies={movies} onAddMovie={() => setMovieModal({ open: true, data: null })} onEditMovie={m => setMovieModal({ open: true, data: m })} onDeleteMovie={(id, name) => setDelConf({ type: "movie", id, label: name })} onRefresh={load} />}
            {tab === "theatres"  && <TheatresTab  theatres={theatres} onDeleteTheatre={(id, name) => setDelConf({ type: "theatre", id, label: name })} onRefresh={load} />}
            {tab === "shows"     && <ShowsTab     shows={shows} movies={movies} theatres={theatres} onAddShow={() => setShowModal({ open: true, data: null })} onEditShow={s => setShowModal({ open: true, data: s })} onDeleteShow={(id, label) => setDelConf({ type: "show", id, label })} />}
            {tab === "bookings"  && <BookingsTab  bookings={bookings} />}
            {tab === "analytics" && <AnalyticsTab bookings={bookings} shows={shows} theatres={theatres} />}
            {tab === "offers"    && <OffersTab />}
            {tab === "payouts"   && <PayoutsView admin />}
            {tab === "support"   && <SupportTab />}
            {tab === "activity"  && <ActivityTab />}
          </>
        )}
      </main>

      {movieModal.open && <MovieForm data={movieModal.data} onClose={() => setMovieModal({ open: false, data: null })} onSave={() => { load(); setMovieModal({ open: false, data: null }); }} />}
      {showModal.open  && <ShowForm  data={showModal.data}  movies={movies} theatres={theatres} onClose={() => setShowModal({ open: false, data: null })} onSave={() => { load(); setShowModal({ open: false, data: null }); }} />}
      {delConf && <ConfirmModal title={`DELETE ${delConf.type.toUpperCase()}`}  message={`Permanently delete "${delConf.label}"?`} danger onConfirm={handleDelete}  onCancel={() => setDelConf(null)} />}
      {aprConf && <ConfirmModal title={`${aprConf.status} USER`} message={`Mark "${aprConf.name}" as ${aprConf.status}?`} danger={aprConf.status === "REJECTED"} onConfirm={handleApproval} onCancel={() => setAprConf(null)} />}
      </div>
    </div>
  );
}