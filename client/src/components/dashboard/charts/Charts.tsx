import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./Charts.css";

/* ── helpers ─────────────────────────────────────────────── */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round a max up to a clean axis value and return evenly spaced ticks */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw  = max / count;
  const mag  = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

// Evenly spaced x labels that always include the last point without colliding with it
const showLabel = (i: number, len: number, every: number) =>
  i === len - 1 || (i % every === 0 && len - 1 - i >= every * 0.75);

const compact = (n: number) =>
  n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`;

/* ── Chart card shell ────────────────────────────────────── */

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function ChartCard({ title, subtitle, action, children, className = "" }: ChartCardProps) {
  return (
    <section className={`cc-card ${className}`}>
      <header className="cc-head">
        <div>
          <h3 className="cc-title">{title}</h3>
          {subtitle && <p className="cc-sub">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ChartEmpty({ children = "No data in this period yet" }: { children?: ReactNode }) {
  return <div className="cc-empty">{children}</div>;
}

/* ── Range tabs (7D / 30D / 90D) ─────────────────────────── */

export function RangeTabs<T extends number>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="cc-range" role="tablist" aria-label="Date range">
      {options.map(o => (
        <button key={o} role="tab" aria-selected={o === value}
          className={o === value ? "active" : ""} onClick={() => onChange(o)}>
          {o}D
        </button>
      ))}
    </div>
  );
}

/* ── Area trend (single series, crosshair tooltip) ──────── */

interface TrendPoint { label: string; value: number }
interface AreaTrendProps {
  data: TrendPoint[];
  format: (v: number) => string;
  seriesLabel: string;
  height?: number;
}
export function AreaTrend({ data, format, seriesLabel, height = 240 }: AreaTrendProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const fillId = `cc-fill-${useId().replace(/:/g, "")}`;
  const pad = { top: 16, right: 12, bottom: 28, left: 52 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;

  const max   = Math.max(...data.map(d => d.value), 0);
  const ticks = niceTicks(max);
  const top   = ticks[ticks.length - 1];
  const x = (i: number) => (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => h - (v / top) * h;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1).toFixed(1)},${h}L${x(0).toFixed(1)},${h}Z`;

  // ~6 evenly spaced x labels, always including the last day
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel  = (e.clientX - rect.left) / rect.width;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(rel * (data.length - 1)))));
  };

  return (
    <div className="cc-plot" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${seriesLabel} trend`}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cc-trend)" stopOpacity=".22" />
              <stop offset="100%" stopColor="var(--cc-trend)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform={`translate(${pad.left},${pad.top})`}>
            {ticks.map(t => (
              <g key={t}>
                <line x1={0} x2={w} y1={y(t)} y2={y(t)} className={t === 0 ? "cc-baseline" : "cc-grid"} />
                <text x={-10} y={y(t)} className="cc-tick" textAnchor="end" dominantBaseline="middle">{compact(t)}</text>
              </g>
            ))}
            {data.map((d, i) => showLabel(i, data.length, labelEvery) && (
              <text key={i} x={x(i)} y={h + 18} className="cc-tick"
                textAnchor={i === data.length - 1 ? "end" : i === 0 ? "start" : "middle"}>{d.label}</text>
            ))}
            {max > 0 && <path d={area} fill={`url(#${fillId})`} />}
            <path d={line} className="cc-line" />
            {max > 0 && hover === null && (
              <g>
                <circle cx={x(peak)} cy={y(data[peak].value)} r={4.5} className="cc-dot" />
                <text x={Math.min(Math.max(x(peak), 30), w - 30)} y={y(data[peak].value) - 12} className="cc-peak" textAnchor="middle">
                  {format(data[peak].value)}
                </text>
              </g>
            )}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} className="cc-crosshair" />
                <circle cx={x(hover)} cy={y(data[hover].value)} r={5} className="cc-dot" />
              </g>
            )}
            <rect x={0} y={0} width={w} height={h} fill="transparent"
              onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          </g>
        </svg>
      )}
      {hover !== null && (
        <div className="cc-tooltip" style={{
          left: Math.min(Math.max(pad.left + x(hover), 70), width - 70),
          top: pad.top + y(data[hover].value) - 12,
        }}>
          <span className="cc-tooltip-label">{data[hover].label}</span>
          <span className="cc-tooltip-row"><i className="cc-key cc-key--trend" />{seriesLabel}<b>{format(data[hover].value)}</b></span>
        </div>
      )}
    </div>
  );
}

/* ── Column chart (single series, per-bar tooltip) ───────── */

interface ColumnChartProps {
  data: TrendPoint[];
  format: (v: number) => string;
  seriesLabel: string;
  height?: number;
  color?: string;
}
export function ColumnChart({ data, format, seriesLabel, height = 220, color = "var(--cc-series-1)" }: ColumnChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 14, right: 8, bottom: 28, left: 40 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;

  const max   = Math.max(...data.map(d => d.value), 0);
  const ticks = niceTicks(max);
  const top   = ticks[ticks.length - 1];
  const band  = data.length ? w / data.length : 0;
  const barW  = Math.min(24, Math.max(3, band - 4));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  // 4px rounded data-end, square at the baseline
  const bar = (cx: number, v: number) => {
    const bh = (v / top) * h;
    if (bh <= 0) return "";
    const r = Math.min(4, bh, barW / 2);
    const x0 = cx - barW / 2, x1 = cx + barW / 2, y0 = h - bh;
    return `M${x0},${h}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${h}Z`;
  };

  return (
    <div className="cc-plot" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${seriesLabel} by day`}>
          <g transform={`translate(${pad.left},${pad.top})`}>
            {ticks.map(t => (
              <g key={t}>
                <line x1={0} x2={w} y1={h - (t / top) * h} y2={h - (t / top) * h} className={t === 0 ? "cc-baseline" : "cc-grid"} />
                <text x={-8} y={h - (t / top) * h} className="cc-tick" textAnchor="end" dominantBaseline="middle">{compact(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = band * i + band / 2;
              return (
                <g key={i}>
                  <path d={bar(cx, d.value)} fill={color} opacity={hover === null || hover === i ? 1 : .45} />
                  {showLabel(i, data.length, labelEvery) && (
                    <text x={cx} y={h + 18} className="cc-tick" textAnchor="middle">{d.label}</text>
                  )}
                  {/* hit target wider than the mark */}
                  <rect x={band * i} y={0} width={band} height={h} fill="transparent"
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {hover !== null && band > 0 && (
        <div className="cc-tooltip" style={{
          left: Math.min(Math.max(pad.left + band * hover + band / 2, 70), width - 70),
          top: pad.top + h - (data[hover].value / top) * h - 12,
        }}>
          <span className="cc-tooltip-label">{data[hover].label}</span>
          <span className="cc-tooltip-row"><i className="cc-key" style={{ background: color }} />{seriesLabel}<b>{format(data[hover].value)}</b></span>
        </div>
      )}
    </div>
  );
}

/* ── Donut + legend ──────────────────────────────────────── */

export interface DonutSlice { key: string; label: string; value: number; color: string; icon?: string }
interface DonutProps {
  slices: DonutSlice[];
  centerLabel: string;
  format?: (v: number) => string;
}
export function Donut({ slices, centerLabel, format = v => v.toLocaleString("en-IN") }: DonutProps) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const size = 168, stroke = 22, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const gap = total > 0 && slices.filter(s => s.value > 0).length > 1 ? 2 : 0;

  let offset = 0;
  const arcs = slices.map(s => {
    const len = total ? (s.value / total) * c : 0;
    const arc = { ...s, dash: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });
  const active = slices.find(s => s.key === hover);

  return (
    <div className="cc-donut">
      <div className="cc-donut-ring">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
          <circle cx={size / 2} cy={size / 2} r={r} className="cc-donut-track" strokeWidth={stroke} fill="none" />
          {total > 0 && arcs.map(a => a.dash > 0 && (
            <circle key={a.key} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={a.color} strokeWidth={hover === a.key ? stroke + 4 : stroke}
              strokeDasharray={`${a.dash} ${c - a.dash}`} strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              opacity={hover && hover !== a.key ? .35 : 1}
              onMouseEnter={() => setHover(a.key)} onMouseLeave={() => setHover(null)}
              style={{ transition: "opacity .2s, stroke-width .2s" }} />
          ))}
        </svg>
        <div className="cc-donut-center">
          <span className="cc-donut-value">{format(active ? active.value : total)}</span>
          <span className="cc-donut-label">{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="cc-legend">
        {slices.map(s => (
          <li key={s.key} className={hover === s.key ? "active" : ""}
            onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
            <i className="cc-key" style={{ background: s.color }} />
            <span className="cc-legend-label">{s.icon && <span aria-hidden="true">{s.icon} </span>}{s.label}</span>
            <span className="cc-legend-value">{format(s.value)}</span>
            <span className="cc-legend-pct">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── KPI tile with delta + sparkline ─────────────────────── */

interface KpiProps {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  trend?: number[];
  hint?: string;
  onClick?: () => void;
}
export function Kpi({ label, value, icon, delta, deltaLabel = "vs prev.", trend, hint, onClick }: KpiProps) {
  const spark = useMemo(() => {
    if (!trend || trend.length < 2) return null;
    const max = Math.max(...trend, 1), W = 96, H = 30;
    const pts = trend.map((v, i) => [(i / (trend.length - 1)) * W, H - 2 - (v / max) * (H - 4)]);
    return { W, H, d: pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(""), last: pts[pts.length - 1] };
  }, [trend]);

  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`kpi ${onClick ? "kpi--link" : ""}`} onClick={onClick}>
      <div className="kpi-top">
        <span className="kpi-icon" aria-hidden="true">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {delta === undefined ? (
          <span className="kpi-hint">{hint}</span>
        ) : delta === null ? (
          <span className="kpi-hint">New this period</span>
        ) : (
          <span className={`kpi-delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta).toFixed(Math.abs(delta) < 10 ? 1 : 0)}%
            <span className="kpi-delta-label">{deltaLabel}</span>
          </span>
        )}
        {spark && (
          <svg width={spark.W} height={spark.H} className="kpi-spark" aria-hidden="true">
            <path d={spark.d} />
            <circle cx={spark.last[0]} cy={spark.last[1]} r={3} />
          </svg>
        )}
      </div>
    </Tag>
  );
}

/* ── Ranked list (posters, meter, value) ─────────────────── */

interface RankListProps {
  rows: { id: string; name: string; sub?: string; image?: string; value: number; meta?: string }[];
  format: (v: number) => string;
  emptyText?: string;
}
export function RankList({ rows, format, emptyText }: RankListProps) {
  if (!rows.length) return <ChartEmpty>{emptyText}</ChartEmpty>;
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <ol className="rank">
      {rows.map((r, i) => (
        <li key={r.id} className="rank-row">
          <span className="rank-pos">{i + 1}</span>
          {r.image
            ? <img className="rank-img" src={r.image} alt="" loading="lazy" />
            : <span className="rank-img rank-img--blank" aria-hidden="true">🏛</span>}
          <div className="rank-body">
            <div className="rank-line">
              <span className="rank-name">{r.name}</span>
              <span className="rank-value">{format(r.value)}</span>
            </div>
            <div className="rank-meter"><span style={{ width: `${(r.value / max) * 100}%` }} /></div>
            {(r.sub || r.meta) && <span className="rank-sub">{[r.sub, r.meta].filter(Boolean).join(" · ")}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Horizontal meter list (slots, cities, occupancy) ────── */

interface MeterListProps {
  rows: { key: string; label: string; sub?: string; value: number; display?: string }[];
  max?: number;
  tone?: (value: number) => "good" | "warn" | "hot" | undefined;
}
export function MeterList({ rows, max, tone }: MeterListProps) {
  const top = max ?? Math.max(...rows.map(r => r.value), 1);
  return (
    <ul className="meters">
      {rows.map(r => (
        <li key={r.key}>
          <div className="meter-line">
            <span className="meter-label">{r.label}{r.sub && <small>{r.sub}</small>}</span>
            <span className="meter-value">{r.display ?? r.value.toLocaleString("en-IN")}</span>
          </div>
          <div className="meter-track">
            <span className={`meter-fill ${tone?.(r.value) ? `meter-fill--${tone(r.value)}` : ""}`}
              style={{ width: `${top ? Math.max((r.value / top) * 100, r.value > 0 ? 2 : 0) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
