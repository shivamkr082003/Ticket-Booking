import { useEffect, useState } from "react";
import { payoutsApi } from "../../../api/index.api.ts";
import type { PayoutReport } from "../../../types/movie.types.ts";
import { inr, num } from "../analytics.ts";
import { ChartCard, ChartEmpty, ColumnChart, Kpi } from "../charts/Charts.tsx";
import { downloadCsv } from "./csv.ts";
import Icon from "./Icons.tsx";

const RANGES = [3, 6, 12] as const;
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

/** Earnings after refunds and platform commission — owners see their cinemas, admins see all */
export default function PayoutsView({ admin = false }: { admin?: boolean }) {
  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [data,   setData]   = useState<PayoutReport | null>(null);
  const [error,  setError]  = useState("");

  useEffect(() => {
    let cancelled = false;
    payoutsApi.get(months)
      .then(r => { if (!cancelled) { setData(r); setError(""); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load payouts"); });
    return () => { cancelled = true; };
  }, [months]);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`cineverse-payouts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Month", "Booking", "Ticket", "Status", "Cinema", "Movie", "Show time", "Tickets",
       "Sales (₹)", "Refunded (₹)", "Kept (₹)", `Commission ${data.commissionPct}% (₹)`, "Payout (₹)", "Booking fees (₹)", "Promos (₹)"],
      data.rows.map(r => [
        new Date(r.date).toLocaleDateString("en-IN"), r.month, r.bookingId, r.ticketCode, r.status, r.theatre, r.movie,
        r.showTime ? new Date(r.showTime).toLocaleString("en-IN") : "", r.tickets,
        r.sales, r.refunded, r.kept, r.commission, r.payout, r.bookingFees, r.promos,
      ]));
  };

  const t = data?.totals;
  const chron = [...(data?.months ?? [])].reverse();

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">Finance</p>
          <h1 className="dash-page-title">Payouts</h1>
          <p className="dash-page-sub">
            {admin ? "What each cinema earns" : "What your cinemas earn"} after refunds and the {data?.commissionPct ?? 10}% platform commission.
            Prime discounts and coupons are platform-funded and never reduce your payout.
          </p>
        </div>
        <div className="po-actions">
          <div className="cc-range" role="tablist" aria-label="Months">
            {RANGES.map(r => (
              <button key={r} role="tab" aria-selected={r === months} className={r === months ? "active" : ""} onClick={() => setMonths(r)}>{r}M</button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!data?.rows.length}><Icon name="bookings" size={15} /> Export CSV</button>
        </div>
      </div>

      {error && <p className="dash-alert">{error}</p>}

      <div className="kpi-grid">
        <Kpi label="Ticket & food sales" icon={<Icon name="tickets" />} value={t ? inr(t.sales, true) : "—"} hint={t ? `${num(t.tickets)} tickets · ${num(t.bookings)} bookings` : undefined} />
        <Kpi label="Refunded" icon={<Icon name="alert" />} value={t ? inr(t.refunded, true) : "—"} hint="Your share of cancellations" />
        <Kpi label={`Commission · ${data?.commissionPct ?? 10}%`} icon={<Icon name="revenue" />} value={t ? inr(t.commission, true) : "—"} />
        <Kpi label="Net payout" icon={<Icon name="analytics" />} value={t ? inr(t.payout, true) : "—"}
          hint={admin && t ? `Platform also kept ${inr(t.bookingFees, true)} in fees, spent ${inr(t.promos, true)} on promos` : "Paid out monthly"} />
      </div>

      <div className="dash-grid">
        <ChartCard className="span-2" title="Net payout by month" subtitle="After refunds and commission">
          {chron.some(m => m.payout > 0)
            ? <ColumnChart data={chron.map(m => ({ label: monthLabel(m.month), value: m.payout }))} format={v => inr(v)} seriesLabel="Payout" />
            : <ChartEmpty>No paid bookings in this period yet</ChartEmpty>}
        </ChartCard>
        <ChartCard title={admin ? "By cinema" : "By theatre"} subtitle="Net payout">
          {data?.theatres.length ? (
            <ul className="po-theatres">
              {data.theatres.slice(0, 8).map(th => (
                <li key={th.theatreId}><span>{th.theatre}</span><b>{inr(th.payout)}</b></li>
              ))}
            </ul>
          ) : <ChartEmpty />}
        </ChartCard>
      </div>

      <div className="dash-table-wrap" style={{ marginTop: 18 }}>
        <table className="dash-table">
          <thead><tr><th>Month</th><th className="num">Bookings</th><th className="num">Sales</th><th className="num">Refunded</th><th className="num">Commission</th><th className="num">Payout</th></tr></thead>
          <tbody>
            {(data?.months ?? []).map(m => (
              <tr key={m.month}>
                <td><strong>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong></td>
                <td className="num">{num(m.bookings)}</td>
                <td className="num">{inr(m.sales)}</td>
                <td className="num cell-muted">{m.refunded ? `− ${inr(m.refunded)}` : "—"}</td>
                <td className="num cell-muted">{m.commission ? `− ${inr(m.commission)}` : "—"}</td>
                <td className="num"><strong>{inr(m.payout)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
