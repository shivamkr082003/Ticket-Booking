import { useMemo } from "react";
import { useAuth } from "../../../../../context/AuthContext.tsx";
import type { Movie, Theatre, Show, Booking, User } from "../../../../../types/movie.types.ts";
import { daySeries, delta, inWindow, inr, movieOf, num, occupancyOf, revenueOf, statusMix, theatreOf, ticketsOf, topMovies } from "../../../analytics.ts";
import { AreaTrend, ChartCard, ChartEmpty, Donut, Kpi, MeterList, RankList } from "../../../charts/Charts.tsx";
import { useGreeting } from "../../../charts/useGreeting.ts";
import RecentBookings from "../../../common/RecentBookings.tsx";
import Icon from "../../../common/Icons.tsx";

interface OverviewTabProps {
  users:    User[];
  movies:   Movie[];
  theatres: Theatre[];
  shows:    Show[];
  bookings: Booking[];
  onTabChange: (tab: string) => void;
}

export default function OverviewTab({
  users, movies, theatres, shows, bookings, onTabChange,
}: OverviewTabProps) {
  const { user } = useAuth();
  const { greeting, date } = useGreeting();

  const week     = useMemo(() => inWindow(bookings, 7), [bookings]);
  const lastWeek = useMemo(() => inWindow(bookings, 7, 7), [bookings]);
  const trend    = useMemo(() => daySeries(inWindow(bookings, 14), 14), [bookings]);
  const status   = statusMix(week);

  const pending  = users.filter(u => u.userStatus === "PENDING");
  const upcoming = shows.filter(s => new Date(s.showTime) > new Date() && s.isActive !== false);
  const movies7  = topMovies(week, 5);
  const nextShows = [...upcoming]
    .sort((a, b) => new Date(a.showTime).getTime() - new Date(b.showTime).getTime())
    .slice(0, 5)
    .map(s => {
      const pct = s.noOfSeats ? Math.round(((s.bookedSeats?.length ?? 0) / s.noOfSeats) * 100) : 0;
      return {
        key: s._id,
        label: movieOf(s)?.name ?? "Show",
        sub: `${new Date(s.showTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${theatreOf(s)?.name ?? s.screen}`,
        value: pct,
        display: `${pct}%`,
      };
    });

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">{date}</p>
          <h1 className="dash-page-title">{greeting}, {user?.name?.split(" ")[0] ?? "Admin"}</h1>
          <p className="dash-page-sub">Here's how Cineverse is performing this week.</p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onTabChange("analytics")}><Icon name="analytics" size={15} /> Full analytics</button>
          <button className="btn btn-primary btn-sm" onClick={() => onTabChange("shows")}><Icon name="plus" size={15} /> Schedule show</button>
        </div>
      </div>

      {pending.length > 0 && (
        <button className="dash-alert" onClick={() => onTabChange("users")}>
          <span className="dash-alert-icon"><Icon name="alert" /></span>
          <span>
            <strong>{pending.length} theatre owner{pending.length > 1 ? "s" : ""} awaiting approval</strong>
            <span>Review their accounts so they can start listing shows.</span>
          </span>
          <span className="dash-alert-cta">Review →</span>
        </button>
      )}

      <div className="kpi-grid">
        <Kpi label="Revenue · 7 days" icon={<Icon name="revenue" />} value={inr(revenueOf(week), true)}
          delta={delta(revenueOf(week), revenueOf(lastWeek))} deltaLabel="vs last week"
          trend={trend.map(d => d.revenue)} onClick={() => onTabChange("analytics")} />
        <Kpi label="Tickets sold · 7 days" icon={<Icon name="tickets" />} value={num(ticketsOf(week))}
          delta={delta(ticketsOf(week), ticketsOf(lastWeek))} deltaLabel="vs last week"
          trend={trend.map(d => d.tickets)} onClick={() => onTabChange("bookings")} />
        <Kpi label="Upcoming shows" icon={<Icon name="shows" />} value={num(upcoming.length)}
          hint={`${occupancyOf(upcoming)}% seats already booked`} onClick={() => onTabChange("shows")} />
        <Kpi label="Catalogue" icon={<Icon name="movies" />} value={`${movies.length} films`}
          hint={`${theatres.length} theatres · ${users.length} users`} onClick={() => onTabChange("movies")} />
      </div>

      <div className="dash-grid">
        <ChartCard className="span-3" title="Revenue · last 14 days" subtitle={`${inr(revenueOf(inWindow(bookings, 14)))} from paid bookings`}>
          <AreaTrend data={trend.map(d => ({ label: d.label, value: d.revenue }))} format={v => inr(v)} seriesLabel="Revenue" />
        </ChartCard>

        <ChartCard title="This week's bookings" subtitle={`${week.length} started`}>
          {week.length ? (
            <Donut centerLabel="bookings" slices={[
              { key: "ok",   label: "Confirmed",   value: status.SUCCESSFUL, color: "var(--cc-good)",     icon: "✓" },
              { key: "wait", label: "In progress", value: status.IN_PROCESS, color: "var(--cc-warning)",  icon: "⏳" },
              { key: "cx",   label: "Cancelled",   value: status.CANCELLED,  color: "var(--cc-critical)", icon: "✕" },
              { key: "exp",  label: "Expired",     value: status.EXPIRED,    color: "var(--cc-neutral)",  icon: "⌛" },
            ]} />
          ) : <ChartEmpty>No bookings this week yet</ChartEmpty>}
        </ChartCard>

        <ChartCard title="Trending this week" subtitle="Top movies by revenue">
          <RankList rows={movies7.map(m => ({ ...m, value: m.revenue, meta: `${num(m.tickets)} tickets` }))} format={v => inr(v, true)} emptyText="No paid bookings this week" />
        </ChartCard>

        <ChartCard title="Next up" subtitle="Upcoming shows · seats booked">
          {nextShows.length
            ? <MeterList rows={nextShows} max={100} tone={v => (v >= 75 ? "hot" : v >= 40 ? "warn" : "good")} />
            : <ChartEmpty>No upcoming shows scheduled</ChartEmpty>}
        </ChartCard>
      </div>

      <div className="dash-section-head">
        <h2 className="dash-section-title">Recent bookings</h2>
        <button className="dash-link" onClick={() => onTabChange("bookings")}>View all →</button>
      </div>
      <RecentBookings bookings={bookings} />
    </div>
  );
}
