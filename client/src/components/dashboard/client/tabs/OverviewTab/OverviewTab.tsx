import { useMemo } from "react";
import { useAuth } from "../../../../../context/AuthContext.tsx";
import type { Movie, Theatre, Show, Booking } from "../../../../../types/movie.types.ts";
import { daySeries, delta, inWindow, inr, movieOf, num, occupancyOf, revenueOf, ticketsOf, topMovies } from "../../../analytics.ts";
import { AreaTrend, ChartCard, ChartEmpty, Kpi, MeterList, RankList } from "../../../charts/Charts.tsx";
import { useGreeting } from "../../../charts/useGreeting.ts";
import RecentBookings from "../../../common/RecentBookings.tsx";
import Icon from "../../../common/Icons.tsx";

interface ClientOverviewTabProps {
  myTheatres:  Theatre[];
  myShows:     Show[];
  myBookings:  Booking[];
  movies:      Movie[];
  onTabChange: (tab: string) => void;
}

export default function ClientOverviewTab({
  myTheatres, myShows, myBookings, onTabChange,
}: ClientOverviewTabProps) {
  const { user } = useAuth();
  const { greeting, date } = useGreeting();

  const today      = useMemo(() => inWindow(myBookings, 1), [myBookings]);
  const yesterday  = useMemo(() => inWindow(myBookings, 1, 1), [myBookings]);
  const week       = useMemo(() => inWindow(myBookings, 7), [myBookings]);
  const trend      = useMemo(() => daySeries(inWindow(myBookings, 14), 14), [myBookings]);

  const todayStr   = new Date().toDateString();
  const showsToday = myShows.filter(s => new Date(s.showTime).toDateString() === todayStr);
  const upcoming   = myShows
    .filter(s => new Date(s.showTime) > new Date() && s.isActive !== false)
    .sort((a, b) => new Date(a.showTime).getTime() - new Date(b.showTime).getTime());

  const nextShows = upcoming.slice(0, 5).map(s => {
    const pct = s.noOfSeats ? Math.round(((s.bookedSeats?.length ?? 0) / s.noOfSeats) * 100) : 0;
    return {
      key: s._id,
      label: movieOf(s)?.name ?? "Show",
      sub: `${new Date(s.showTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${s.screen} · ${s.format}`,
      value: pct,
      display: `${pct}%`,
    };
  });

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">{date}</p>
          <h1 className="dash-page-title">{greeting}, {user?.name?.split(" ")[0] ?? "there"}</h1>
          <p className="dash-page-sub">Box office for your {myTheatres.length} theatre{myTheatres.length === 1 ? "" : "s"}.</p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onTabChange("analytics")}><Icon name="analytics" size={15} /> Full analytics</button>
          <button className="btn btn-primary btn-sm" onClick={() => onTabChange("shows")}><Icon name="plus" size={15} /> Add show</button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Revenue today" icon={<Icon name="revenue" />} value={inr(revenueOf(today))}
          delta={delta(revenueOf(today), revenueOf(yesterday))} deltaLabel="vs yesterday"
          trend={trend.map(d => d.revenue)} onClick={() => onTabChange("analytics")} />
        <Kpi label="Tickets today" icon={<Icon name="tickets" />} value={num(ticketsOf(today))}
          delta={delta(ticketsOf(today), ticketsOf(yesterday))} deltaLabel="vs yesterday"
          trend={trend.map(d => d.tickets)} onClick={() => onTabChange("bookings")} />
        <Kpi label="Shows today" icon={<Icon name="shows" />} value={num(showsToday.length)}
          hint={`${occupancyOf(showsToday)}% average occupancy`} onClick={() => onTabChange("shows")} />
        <Kpi label="Revenue · 7 days" icon={<Icon name="analytics" />} value={inr(revenueOf(week), true)}
          hint={`${num(ticketsOf(week))} tickets sold`} onClick={() => onTabChange("analytics")} />
      </div>

      <div className="dash-grid">
        <ChartCard className="span-3" title="Revenue · last 14 days" subtitle="Paid bookings across your theatres">
          <AreaTrend data={trend.map(d => ({ label: d.label, value: d.revenue }))} format={v => inr(v)} seriesLabel="Revenue" />
        </ChartCard>

        <ChartCard className="span-2" title="Next up" subtitle="Upcoming shows · seats booked">
          {nextShows.length
            ? <MeterList rows={nextShows} max={100} tone={v => (v >= 75 ? "hot" : v >= 40 ? "warn" : "good")} />
            : <ChartEmpty>No upcoming shows — schedule one to start selling</ChartEmpty>}
        </ChartCard>

        <ChartCard title="Best sellers · 7 days" subtitle="By revenue">
          <RankList rows={topMovies(week, 5).map(m => ({ ...m, value: m.revenue, meta: `${num(m.tickets)} tickets` }))} format={v => inr(v, true)} emptyText="No paid bookings this week" />
        </ChartCard>
      </div>

      <div className="dash-section-head">
        <h2 className="dash-section-title">Recent bookings</h2>
        <button className="dash-link" onClick={() => onTabChange("bookings")}>View all →</button>
      </div>
      <RecentBookings bookings={myBookings} />
    </div>
  );
}
