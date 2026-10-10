/**
 * Small, dependency-free chart set.
 *
 * Colour follows the validated palette: one blue hue stepped light->dark for
 * ordinal data (the funnel), and categorical slots 1-3 (blue / orange / aqua)
 * for the grouped bars -- a set that clears the all-pairs colour-blind and
 * normal-vision separation gates in both themes. Aqua sits under 3:1 against
 * the light surface, so every bar carries a visible direct label.
 */
import { useId, useState } from 'react';
import { cx } from './ui';

/* Ordinal ramp for the pipeline funnel: single hue, monotone lightness. */
const FUNNEL_STEPS = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'];

/** A rect whose far end is rounded and whose baseline end stays square. */
function barPath(x: number, y: number, w: number, h: number, r = 4, horizontal = true) {
  const radius = Math.max(0, Math.min(r, horizontal ? w : h));
  if (radius <= 0.5) return `M${x},${y}h${w}v${h}h${-w}z`;
  return horizontal
    ? `M${x},${y}h${w - radius}a${radius},${radius} 0 0 1 ${radius},${radius}v${h - 2 * radius}a${radius},${radius} 0 0 1 ${-radius},${radius}h${-(w - radius)}z`
    : `M${x},${y + radius}a${radius},${radius} 0 0 1 ${radius},${-radius}h${w - 2 * radius}a${radius},${radius} 0 0 1 ${radius},${radius}v${h - radius}h${-w}z`;
}

function Tooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs shadow-pop"
      style={{ left: x, top: y - 8 }}
      role="tooltip"
    >
      {lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'font-semibold text-ink' : 'text-ink-muted'}>{l}</div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Funnel */
export function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const first = data[0]?.count || 1;

  return (
    <ol className="space-y-3">
      {data.map((d, i) => {
        const conversion = Math.round((d.count / first) * 100);
        const prev = i > 0 ? data[i - 1].count : null;
        const dropOff = prev && prev > 0 ? Math.round(((prev - d.count) / prev) * 100) : null;

        return (
          <li
            key={d.stage}
            className="group relative"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-ink">{d.stage}</span>
              {/* Direct labels -- the lighter ramp steps sit close to the surface. */}
              <span className="shrink-0 text-xs text-ink-muted">
                <span className="font-semibold tabular-nums text-ink">{d.count}</span>
                <span className="mx-1.5 text-ink-subtle">&middot;</span>
                <span className="tabular-nums">{conversion}%</span>
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max((d.count / max) * 100, 1.5)}%`,
                  background: FUNNEL_STEPS[i % FUNNEL_STEPS.length],
                }}
              />
            </div>

            {hover === i && (
              <div className="pointer-events-none absolute right-0 top-0 z-20 -translate-y-full rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs shadow-pop">
                <div className="font-semibold text-ink">{d.stage}</div>
                <div className="whitespace-nowrap text-ink-muted">
                  {d.count} of {first} applications ({conversion}%)
                </div>
                {dropOff !== null && (
                  <div className="whitespace-nowrap text-ink-subtle">
                    {dropOff}% drop-off from {data[i - 1].stage.toLowerCase()}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------- Grouped bar (3 series) */
type Series = { key: string; label: string; color: string };

export function GroupedBars({
  rows, series, categoryKey,
}: { rows: Record<string, string | number>[]; series: Series[]; categoryKey: string }) {
  const [hover, setHover] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)));

  const W = 560, H = 230, padL = 38, padR = 10, padT = 12, padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const groupW = plotW / Math.max(1, rows.length);
  // 2px surface gap between adjacent bars.
  const barW = Math.max(5, (groupW - 16) / series.length - 2);
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label={`Grouped bar chart of ${series.map((s) => s.label).join(', ')} by ${categoryKey}`}>
        {/* Recessive grid */}
        {ticks.map((t) => {
          const y = padT + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} className="stroke-line" strokeWidth="1" />
              <text x={padL - 7} y={y + 3.5} textAnchor="end" className="fill-ink-subtle text-[10px]">{t}</text>
            </g>
          );
        })}

        {rows.map((row, ri) => {
          const gx = padL + ri * groupW;
          return (
            <g key={String(row[categoryKey])}>
              {series.map((s, si) => {
                const v = Number(row[s.key]) || 0;
                const h = Math.max(v > 0 ? 2 : 0, (v / max) * plotH);
                const x = gx + 8 + si * (barW + 2);
                const y = padT + plotH - h;
                return (
                  <g key={s.key}>
                    <path
                      d={barPath(x, y, barW, h, 4, false)}
                      fill={s.color}
                      className="transition-opacity hover:opacity-80"
                      onMouseEnter={(e) => {
                        const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                        setHover({
                          x: ((x + barW / 2) / W) * r.width,
                          y: (y / H) * r.height,
                          lines: [String(row[categoryKey]), `${s.label}: ${v}`],
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                    {/* Direct value label -- relief for the low-contrast slot. */}
                    {v > 0 && (
                      <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                            className="fill-ink-muted text-[9px] font-medium tabular-nums">
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={gx + groupW / 2} y={H - 12} textAnchor="middle"
                    className="fill-ink-muted text-[10px]">
                {String(row[categoryKey])}
              </text>
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} className="stroke-line" strokeWidth="1" />
      </svg>

      {hover && <Tooltip {...hover} />}

      {/* Legend is always present for 2+ series. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------- Single-series ranked bars */
export function BarList({
  items, valueLabel = '', tone = '#2a78d6',
}: { items: { label: string; value: number; hint?: string }[]; valueLabel?: string; tone?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) {
    return <p className="py-6 text-center text-sm text-ink-subtle">No data yet.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-ink">{i.label}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-muted">
              {i.value}{valueLabel && ` ${valueLabel}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(i.value / max) * 100}%`, background: tone }}
              title={i.hint}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------- Area / trend */
export function TrendArea({ data }: { data: { day: string; count: number }[] }) {
  const id = useId();
  const [hover, setHover] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  if (data.length < 2) {
    return <p className="py-10 text-center text-sm text-ink-subtle">Not enough history yet.</p>;
  }

  const W = 560, H = 160, padT = 10, padB = 24, padL = 8, padR = 8;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.count));
  const px = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const py = (v: number) => padT + plotH - (v / max) * plotH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(d.count).toFixed(1)}`).join('');
  const area = `${line}L${px(data.length - 1).toFixed(1)},${padT + plotH}L${px(0).toFixed(1)},${padT + plotH}z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Applications submitted over time">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a78d6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2a78d6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle
            key={d.day}
            cx={px(i)} cy={py(d.count)} r="8"
            fill="transparent"
            onMouseEnter={(e) => {
              const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              setHover({
                x: (px(i) / W) * r.width,
                y: (py(d.count) / H) * r.height,
                lines: [new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), `${d.count} applications`],
              });
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {hover && <circle cx={0} cy={0} r="0" />}
        <text x={padL} y={H - 6} className="fill-ink-subtle text-[10px]">
          {new Date(data[0].day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </text>
        <text x={W - padR} y={H - 6} textAnchor="end" className="fill-ink-subtle text-[10px]">
          {new Date(data[data.length - 1].day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </text>
      </svg>
      {hover && <Tooltip {...hover} />}
    </div>
  );
}

/* -------------------------------------------------------------- Stat tile */
export function StatTile({
  label, value, sub, tone = 'navy', icon,
}: { label: string; value: string | number; sub?: string; tone?: 'navy' | 'gold' | 'good' | 'plain'; icon?: React.ReactNode }) {
  const tones = {
    navy: 'text-navy-800 dark:text-navy-200',
    gold: 'text-gold-700 dark:text-gold-300',
    good: 'text-emerald-700 dark:text-emerald-400',
    plain: 'text-ink',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        {icon && <span className="text-ink-subtle">{icon}</span>}
      </div>
      <p className={cx('mt-2 text-2xl font-semibold tabular-nums tracking-tight', tones[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

export const SERIES = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a' };
