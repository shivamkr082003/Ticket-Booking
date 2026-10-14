import { useMemo, useState } from "react";
import type { Booking, Show } from "../../../types/movie.types.ts";
import {
  daySeries, delta, formatMix, inWindow, inr, num, occupancyOf, primeStats,
  revenueOf, refundsOf, slotMix, statusMix, ticketsOf, topMovies, topTheatres, movieOf, theatreOf, showOf, isPaid, bookingAmount,
} from "../analytics.ts";
import { AreaTrend, ChartCard, ChartEmpty, ColumnChart, Donut, Kpi, MeterList, RangeTabs, RankList } from "../charts/Charts.tsx";
import Icon from "./Icons.tsx";

const RANGES = [7, 30, 90];
const FORMAT_COLORS: Record<string, string> = {
  "2D": "var(--cc-series-1)", "3D": "var(--cc-series-2)", IMAX: "var(--cc-series-3)",
  "4DX": "var(--cc-series-4)", "Dolby Atmos": "var(--cc-series-5)",
};

interface AnalyticsViewProps {
  eyebrow:  string;
  title:    string;
  bookings: Booking[];
  shows:    Show[];
  /** Theatre owners see per-show occupancy instead of a theatre leaderboard */
  scope:    "platform" | "owner";
}

export default function AnalyticsView({ eyebrow, title, bookings, shows, scope }: AnalyticsViewProps) {
  const [range, setRange] = useState(30);

  const cur  = useMemo(() => inWindow(bookings, range), [bookings, range]);
  const prev = useMemo(() => inWindow(bookings, range, range), [bookings, range]);
  const days = useMemo(() => daySeries(cur, range), [cur, range]);

  const revenue  = revenueOf(cur),  revenuePrev = revenueOf(prev);
  const tickets  = ticketsOf(cur),  ticketsPrev = ticketsOf(prev);
  const avgTicket     = tickets ? revenue / tickets : 0;
  const avgTicketPrev = ticketsPrev ? revenuePrev / ticketsPrev : 0;
  const status   = statusMix(cur);
  const cancelRate = cur.length ? Math.round(((status.CANCELLED + status.EXPIRED) / cur.length) * 100) : 0;
  const prime    = primeStats(cur);

  const formats  = formatMix(cur).map(f => ({ ...f, color: FORMAT_COLORS[f.key] }));
  const slots    = slotMix(cur);
  const movies   = topMovies(cur, 5);
  const theatres = topTheatres(cur, 5);

  const cities = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of cur.filter(isPaid)) {
      const city = theatreOf(showOf(b))?.city;
      if (city) map.set(city, (map.get(city) ?? 0) + bookingAmount(b));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [cur]);

  const upcomingShows = shows.filter(s => new Date(s.showTime) > new Date() && s.isActive !== false);
  const showOccupancy = upcomingShows
    .map(s => ({
      key: s._id,
      label: movieOf(s)?.name ?? "Show",
      sub: new Date(s.showTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) + ` · ${s.format}`,
      value: s.noOfSeats ? Math.round(((s.bookedSeats?.length ?? 0) / s.noOfSeats) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(r => ({ ...r, display: `${r.value}%` }));

  const spark = (pick: (d: typeof days[number]) => number) => days.slice(-14).map(pick);

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">{eyebrow}</p>
          <h1 className="dash-page-title">{title}</h1>
          <p className="dash-page-sub">Last {range} days compared with the {range} days before</p>
        </div>
        <RangeTabs value={range} options={RANGES} onChange={setRange} />
      </div>

      <div className="kpi-grid">
        <Kpi label="Revenue" icon={<Icon name="revenue" />} value={inr(revenue, true)}
          delta={delta(revenue, revenuePrev)} trend={spark(d => d.revenue)} />
        <Kpi label="Tickets sold" icon={<Icon name="tickets" />} value={num(tickets)}
          delta={delta(tickets, ticketsPrev)} trend={spark(d => d.tickets)} />
        <Kpi label="Avg. ticket value" icon={<Icon name="seat" />} value={inr(avgTicket)}
          delta={delta(avgTicket, avgTicketPrev)} />
        <Kpi label="Live occupancy" icon={<Icon name="shows" />} value={`${occupancyOf(upcomingShows)}%`}
          hint={`${upcomingShows.length} upcoming show${upcomingShows.length === 1 ? "" : "s"}`} />
        <Kpi label="Cancellation rate" icon={<Icon name="alert" />} value={`${cancelRate}%`}
          hint={`${inr(refundsOf(cur), true)} refunded · ${status.CANCELLED + status.EXPIRED} of ${cur.length}`} />
      </div>

      <div className="dash-grid">
        <ChartCard className="span-3" title="Revenue" subtitle={`Net of refunds · ${inr(revenue)} total`}>
          <AreaTrend data={days.map(d => ({ label: d.label, value: d.revenue }))} format={v => inr(v)} seriesLabel="Revenue" height={260} />
        </ChartCard>

        <ChartCard className="span-2" title="Tickets per day" subtitle={`${num(tickets)} seats sold`}>
          <ColumnChart data={days.map(d => ({ label: d.label, value: d.tickets }))} format={v => `${v} tickets`} seriesLabel="Tickets" height={300} />
        </ChartCard>

        <ChartCard title="Screen formats" subtitle="Tickets sold by format">
          {tickets ? <Donut slices={formats} centerLabel="tickets" /> : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Top movies" subtitle="By revenue">
          <RankList rows={movies.map(m => ({ ...m, value: m.revenue, meta: `${num(m.tickets)} tickets` }))} format={v => inr(v, true)} emptyText="No paid bookings in this period" />
        </ChartCard>

        {scope === "platform" ? (
          <ChartCard title="Top theatres" subtitle="By revenue">
            <RankList rows={theatres.map(t => ({ ...t, value: t.revenue, meta: `${num(t.tickets)} tickets` }))} format={v => inr(v, true)} emptyText="No paid bookings in this period" />
          </ChartCard>
        ) : (
          <ChartCard title="Upcoming show occupancy" subtitle="Seats booked so far">
            {showOccupancy.length
              ? <MeterList rows={showOccupancy} max={100} tone={v => (v >= 75 ? "hot" : v >= 40 ? "warn" : "good")} />
              : <ChartEmpty>No upcoming shows scheduled</ChartEmpty>}
          </ChartCard>
        )}

        <ChartCard title="When audiences watch" subtitle="Tickets by show time">
          {tickets ? <MeterList rows={slots.map(s => ({ ...s, sub: s.range }))} /> : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Booking outcomes" subtitle={`${cur.length} bookings started`}>
          {cur.length ? (
            <Donut centerLabel="bookings" slices={[
              { key: "ok",   label: "Confirmed",   value: status.SUCCESSFUL, color: "var(--cc-good)",     icon: "✓" },
              { key: "wait", label: "In progress", value: status.IN_PROCESS, color: "var(--cc-warning)",  icon: "⏳" },
              { key: "cx",   label: "Cancelled",   value: status.CANCELLED,  color: "var(--cc-critical)", icon: "✕" },
              { key: "exp",  label: "Expired",     value: status.EXPIRED,    color: "var(--cc-neutral)",  icon: "⌛" },
            ]} />
          ) : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Prime Pass impact" subtitle="Member bookings in this period">
          <div className="prime-impact">
            <div className="prime-impact-stat">
              <span className="prime-impact-value">{prime.share}%</span>
              <span className="prime-impact-label">of paid bookings were Prime</span>
            </div>
            <div className="prime-impact-row"><span>Prime bookings</span><b>{num(prime.bookings)}</b></div>
            <div className="prime-impact-row"><span>Discounts given</span><b>{inr(prime.savings)}</b></div>
            <div className="meter-track"><span className="meter-fill meter-fill--gold" style={{ width: `${prime.share}%` }} /></div>
          </div>
        </ChartCard>

        {scope === "platform" && (
          <ChartCard title="Revenue by city">
            {cities.length
              ? <MeterList rows={cities.map(([city, rev]) => ({ key: city, label: city, value: rev, display: inr(rev, true) }))} />
              : <ChartEmpty />}
          </ChartCard>
        )}
      </div>
    </div>
  );
}
