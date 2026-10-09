'use client';

/*
 * Charts for the admin dashboards, in plain SVG and HTML.
 * Rules they follow: one hue per series (--viz), status colours only for status, thin marks,
 * solid hairline grid, values reachable without hovering (each panel also has a table view).
 */
import { useEffect, useRef, useState } from 'react';
import type { Bar, Meter, Share, Trend } from '@/lib/admin';
import { figure, niceScale, ringArcs, thin } from '@/lib/admin/chart-math';

/**
 * Trend for a stat tile: the past in the de-emphasis grey, the current period as an accent dot.
 * It is drawn on a 100 × 28 canvas that stretches with the tile; the dot is HTML so it stays round.
 */
export function Sparkline({ values: all }: { values: number[] }) {
  if (all.length < 2) return null;
  const W = 100, H = 28, padX = 6, padY = 6;
  const values = thin(all, 12);
  const min = Math.min(...values), span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => [padX + (i / (values.length - 1)) * (W - 2 * padX), H - padY - ((v - min) / span) * (H - 2 * padY)]);
  const [ex, ey] = pts[pts.length - 1];
  return (
    <span className="viz-spark" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline points={pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')} fill="none" stroke="var(--viz-mute)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <i style={{ left: ex + '%', top: (ey / H) * 100 + '%' }} />
    </span>
  );
}

/** Size of an element, kept current, so a chart is drawn at its real size instead of being scaled. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * One series over time: a 2px line over a light wash, with the latest value labelled.
 * Pointer or arrow keys move a crosshair that snaps to the nearest point and shows its value.
 */
export function TrendChart({ trend }: { trend: Trend }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pts = trend.points, n = pts.length, last = n - 1, unit = trend.unit;
  if (!n) return null;

  // Margins: y ticks on the left, the end label above, x labels below.
  const L = 48, R = 14, T = 22, B = 26;
  const pw = Math.max(0, w - L - R), ph = Math.max(0, h - T - B);
  const { top, step } = niceScale(Math.max(...pts.map((p) => p.y)), unit === 'count');
  const X = (i: number) => L + (n === 1 ? pw / 2 : (i / last) * pw);
  const Y = (v: number) => T + ph - (v / top) * ph;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // About one x label per 76px; the last point is always labelled.
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 76))));
  const labelled = (i: number) => i === last || (i % every === 0 && last - i >= every * 0.6);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
  const area = line + ` L${X(last).toFixed(1)} ${T + ph} L${X(0).toFixed(1)} ${T + ph} Z`;

  const indexAt = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !pw) return last;
    return Math.max(0, Math.min(last, Math.round(((clientX - box.left - L) / pw) * last)));
  };
  const move = (by: number) => setHover((v) => Math.max(0, Math.min(last, (v ?? last) + by)));
  const cur = hover == null ? null : pts[hover];
  // The latest value is labelled beside the end of the line, on the side the line does not come from.
  const endY = Y(pts[last].y), under = n > 1 && pts[last - 1].y > pts[last].y && endY + 22 < T + ph;

  return (
    <div ref={ref} className="viz-plot" tabIndex={0} role="img"
      aria-label={`${n} points from ${pts[0].x} to ${pts[last].x}. Latest ${figure(pts[last].y, unit)}${trend.partial ? ', period not finished' : ''}. Use the arrow keys to read each point.`}
      onPointerMove={(e) => setHover(indexAt(e.clientX))} onPointerLeave={() => setHover(null)}
      onFocus={() => setHover((v) => v ?? last)} onBlur={() => setHover(null)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } }}>
      {w > 0 && h > 0 ? (
        <svg aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={L + pw} y1={Y(t)} y2={Y(t)} stroke="var(--line)" strokeWidth="1" />
              <text className="viz-tick" x={L - 8} y={Y(t)} textAnchor="end" dominantBaseline="middle">{figure(t, unit, true)}</text>
            </g>
          ))}
          {pts.map((p, i) => (labelled(i)
            ? <text key={i} className="viz-tick" x={X(i)} y={T + ph + 17} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}>{p.x}</text>
            : null))}
          <path d={area} fill="var(--viz)" opacity="0.1" />
          <path d={line} fill="none" stroke="var(--viz)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* The end marker is hollow while the last period is still running. */}
          {trend.partial
            ? <circle cx={X(last)} cy={endY} r="4" fill="var(--surface)" stroke="var(--viz)" strokeWidth="2" />
            : <circle cx={X(last)} cy={endY} r="5" fill="var(--viz)" stroke="var(--surface)" strokeWidth="2" />}
          {hover == null ? <text className="viz-end" x={X(last)} y={under ? endY + 20 : endY - 11} textAnchor="end">{figure(pts[last].y, unit)}</text> : null}
          {cur && hover != null ? (
            <>
              <line x1={X(hover)} x2={X(hover)} y1={T} y2={T + ph} stroke="var(--line-strong)" strokeWidth="1" />
              <circle cx={X(hover)} cy={Y(cur.y)} r="5" fill="var(--viz)" stroke="var(--surface)" strokeWidth="2" />
            </>
          ) : null}
        </svg>
      ) : null}
      {cur && hover != null ? (
        <div className="viz-tip" style={{ left: Math.max(56, Math.min(w - 56, X(hover))), top: Math.max(46, Y(cur.y) - 10) }}>
          <b>{figure(cur.y, unit)}</b>
          <span>{cur.x}{trend.partial && hover === last ? ' · to date' : ''}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A ranked list. The categories have no order of their own, so every bar wears the same colour.
 * The rows share the height the panel has, up to a comfortable spacing (--n tells the stylesheet how many there are).
 */
export function BarList({ bars }: { bars: Bar[] }) {
  return (
    <div className="viz-rows" style={{ ['--n' as string]: bars.length }}>
      {bars.map((b) => (
        <div key={b.label} className="viz-row" title={b.label + ': ' + b.value}>
          <span>{b.label}</span>
          <span><span className="viz-bar" style={{ display: 'block', width: b.pct + '%' }} /></span>
          <span>{b.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Ratios against a limit. A meter close to its limit turns to the warning tone, with a mark and words, not colour alone. */
export function Meters({ meters }: { meters: Meter[] }) {
  return (
    <div className="viz-rows" style={{ ['--n' as string]: meters.length }}>
      {meters.map((m) => (
        <div key={m.label} className="viz-row" title={m.label + ': ' + m.value + ' (' + m.pct + '%)'}>
          <span className="mono" style={{ fontSize: 12 }}>{m.label}</span>
          <span className="viz-track" style={{ ['--fill' as string]: m.warn ? 'var(--warn)' : 'var(--viz)' }}><span style={{ width: m.pct + '%' }} /></span>
          <span>{m.warn ? <span className="viz-warn"><span aria-hidden>▲</span>{m.value} · {m.note}</span> : m.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Parts of a whole as a ring with a 2px gap between parts. The middle names the whole; pointing at a part,
 * or at its row in the key, puts that part there instead. The key carries every value, so nothing depends on colour or on hovering.
 */
export function Donut({ parts, whole }: { parts: Share[]; whole?: { label: string; value: string } }) {
  const [on, setOn] = useState<number | null>(null);
  // A circle of radius 42 with a 16-wide stroke, measured in hundredths of its length. The gap is about 2px at the size it is drawn.
  const R = 42, GAP = 100 * (2.4 / (2 * Math.PI * R));
  const arcs = ringArcs(parts.map((p) => p.pct));
  const cur = on == null ? null : parts[on];
  return (
    <div className="viz-donut">
      <div className="viz-ring">
        <svg viewBox="0 0 100 100" role="img" aria-label={parts.map((p) => p.label + ' ' + p.pct + '%').join(', ')}>
          {arcs.map(({ i, from, len }) => {
            const p = parts[i], dash = Math.max(0.5, len - GAP);
            return (
              <circle key={p.label} cx="50" cy="50" r={R} fill="none" stroke={`var(--viz-${p.slot})`} strokeWidth="16" pathLength="100" transform="rotate(-90 50 50)"
                strokeDasharray={arcs.length > 1 ? `${dash} ${100 - dash}` : undefined} strokeDashoffset={arcs.length > 1 ? -(from + GAP / 2) : undefined}
                opacity={on == null || on === i ? 1 : 0.35} tabIndex={0} aria-label={`${p.label}: ${p.value}, ${p.pct}%`}
                onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn(null)} onFocus={() => setOn(i)} onBlur={() => setOn(null)} />
            );
          })}
        </svg>
        {cur || whole ? (
          <div className="viz-ring-mid" aria-hidden={!cur}>
            <b>{cur ? cur.pct + '%' : whole!.value}</b>
            <span>{cur ? cur.label : whole!.label}</span>
          </div>
        ) : null}
      </div>
      <div className="viz-legend">
        {parts.map((p, i) => (
          <div key={p.label} className="viz-legend-row" data-on={on === i} onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn(null)}>
            <i style={{ background: `var(--viz-${p.slot})` }} />
            <span>{p.label}</span>
            <b>{p.pct}%</b>
            <span>{p.value}</span>
            {p.sub ? <small>{p.sub}</small> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
