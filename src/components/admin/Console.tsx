'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  AREAS, AdminConsole, adminSeed, ICON, initialUi,
  type Action, type AdminData, type Block, type Cell, type ConsoleState, type ConsoleVals, type Field, type Item, type Kpi, type Panel, type Section, type SetState, type Tab,
} from '@/lib/admin';
import { ago, taka } from '@/lib/format';
import { allQueue, item, itemKeys } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { figure } from '@/lib/admin/chart-math';
import { BarList, Donut, Meters, Sparkline, TrendChart } from './charts';

const SECTIONS = new Set<string>(AREAS.map((a) => a[0]));
export const isSection = (s: string): s is Section => s === 'overview' || SECTIONS.has(s);
const sectionOf = (path: string): Section => { const seg = path.split('/')[2] || 'overview'; return isSection(seg) ? seg : 'overview'; };
const DATA_KEYS: (keyof AdminData)[] = ['roles', 'staff', 'courses', 'batches', 'teachers', 'students', 'coupons', 'refunds', 'certs', 'ann', 'activity', 'settings', 'viewAs', 'navMini', 'paneW'];
const defaultFilter = (k: Section) => (k === 'refunds' ? 'open' : 'all');

const Ctx = createContext<{ vals: ConsoleVals; logic: AdminConsole; setState: SetState; st: ConsoleState } | null>(null);
/** Console state and logic for anything rendered inside AdminShell (sections, queues). */
export const useConsole = () => { const v = useContext(Ctx); if (!v) throw new Error('inside AdminShell only'); return v; };

/** Stroke icon from the console's path set. */
export function Svg({ d, size = 16, w = 1.9 }: { d: string; size?: number; w?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

/** Whether a media query matches; false on the server and for the first client render. */
function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const mq = window.matchMedia(query); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Console frame for every /admin route: sidebar, top bar, overlays and the console state. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  // Console state starts from the saved admin data, so the frame waits for the store.
  return ready ? <AdminFrame>{children}</AdminFrame> : <div className="adm-root" />;
}

function AdminFrame({ children }: { children: ReactNode }) {
  const { s, set, theme, toggleTheme } = useStore();
  const path = usePathname();
  const router = useRouter();
  const srRef = useRef<HTMLInputElement>(null);
  const sec = sectionOf(path);
  // Console data lives in the store (persisted); view state stays here.
  const [st, setSt] = useState<ConsoleState>(() => ({ ...(s.admin || adminSeed()), ...initialUi, filter: defaultFilter(sec) }));
  // Below 1280px the sidebar is always icons only; below 768px it is a drawer opened from the top bar.
  const narrow = useMedia('(max-width: 1279px)'), phone = useMedia('(max-width: 767px)');
  const [navOpen, setNavOpen] = useState(false);

  // Section changes from outside the console (URL, dev bar, back button) start with fresh view state;
  // console navigation (go) has already set its own selection/filter.
  const consoleNav = useRef(false);
  const lastSec = useRef<Section | null>(null);
  useEffect(() => {
    if (lastSec.current && lastSec.current !== sec && !consoleNav.current)
      setSt((c) => ({ ...c, sel: null, filter: defaultFilter(sec), q: '', page: 0, form: null, draft: null, viewOpen: false, rtab: 'roles' }));
    consoleNav.current = false;
    lastSec.current = sec;
  }, [sec]);
  const dataDeps = DATA_KEYS.map((k) => st[k]);
  useEffect(() => {
    const data = {} as Record<string, unknown>;
    DATA_KEYS.forEach((k) => { data[k] = st[k]; });
    set((x) => ({ ...x, admin: data as unknown as AdminData }));
  }, dataDeps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st.toast) return;
    const t = setTimeout(() => setSt((c) => ({ ...c, toast: null })), 3000);
    return () => clearTimeout(t);
  }, [st.toast]);

  const setState: SetState = useCallback((p) => setSt((cur) => ({ ...cur, ...(typeof p === 'function' ? p(cur) : p) })), []);

  const logicRef = useRef<AdminConsole | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lg = logicRef.current;
      if (!lg) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setState((c) => ({ srOpen: !c.srOpen, srQ: '', srIdx: 0 })); return; }
      if (!lg.S.srOpen) return;
      const f = lg.srFlat;
      if (e.key === 'Escape') setState({ srOpen: false });
      else if (e.key === 'ArrowDown') { e.preventDefault(); setState((c) => ({ srIdx: Math.min(f.length - 1, c.srIdx + 1) })); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setState((c) => ({ srIdx: Math.max(0, c.srIdx - 1) })); }
      else if (e.key === 'Enter' && f[lg.S.srIdx]) { e.preventDefault(); f[lg.S.srIdx].run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setState]);
  useEffect(() => {
    if (!st.srOpen) return;
    const t = setTimeout(() => srRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [st.srOpen]);

  const queue = allQueue(s).filter((r) => r.status === 'pending');
  const env = {
    sec, theme, today: new Date(),
    payCount: queue.length,
    contentCount: itemKeys(s).filter((k) => item(s, k).status === 'review').length,
    pending: queue.slice().sort((a, b) => b.agoMin - a.agoMin).slice(0, 5)
      .map((r) => ({ id: r.id, name: r.name, sub: r.batch + ' · ' + r.method + ' · ' + ago(r.agoMin), amount: taka(r.amount) })),
    navigate: (k: Section) => { if (k !== sec) consoleNav.current = true; router.push(k === 'overview' ? '/admin' : '/admin/' + k); },
    toggleTheme,
  };
  // The env callbacks touch refs only when a click or key press calls them, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const logic = new AdminConsole(st, setState, env);
  useEffect(() => { logicRef.current = logic; });
  const vals = logic.renderVals();
  const { v } = vals;
  const mini = !phone && (vals.mini || narrow);
  const openSearch = () => setState({ srOpen: true, srQ: '', srIdx: 0 });

  return (
    <Ctx.Provider value={{ vals, logic, setState, st }}>
      <div className="adm-root" lang="en" style={vals.paneW ? { ['--pane-w' as string]: vals.paneW + 'px' } : undefined}>
        {phone && navOpen ? <div className="adm-scrim" onClick={() => setNavOpen(false)} /> : null}

        <aside className="adm-side" data-mini={mini} data-open={navOpen}>
          <div className="adm-brand">
            <div className="tile adm-logo"><Svg d={ICON.cap} size={17} w={2} /></div>
            {!mini ? (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>School of GenZ</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>admin console</span>
              </div>
            ) : null}
            {!narrow && !mini ? (
              <button className="adm-icon-btn adm-collapse" onClick={() => setState({ navMini: true, viewOpen: false })} title="Collapse menu" aria-label="Collapse menu"><Svg d={ICON.collapse} w={1.8} /></button>
            ) : null}
          </div>
          <nav className="adm-navs" aria-label="Admin">
            {!narrow && mini ? (
              <button className="adm-nav" onClick={() => setState({ navMini: false })} title="Expand menu" aria-label="Expand menu"><span className="adm-nav-ico"><Svg d={ICON.expand} w={1.8} /></span></button>
            ) : null}
            {vals.navGroups.map((g, gi) => (
              <div key={g.label || 'top'} className="adm-navgroup">
                {g.label && !mini ? <div className="adm-group">{g.label}</div> : null}
                {mini && gi > 0 ? <div className="adm-rule" /> : null}
                {g.items.map((it) => (
                  <button key={it.key} className="adm-nav" onClick={() => { it.go(); setNavOpen(false); }} title={it.label} aria-current={it.on ? 'page' : undefined}>
                    <span className="adm-nav-ico"><Svg d={it.icon} />{mini && it.count ? <span className="adm-dot" /> : null}</span>
                    {!mini ? <span className="adm-nav-label">{it.label}</span> : null}
                    {!mini && it.ro ? <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>view</span> : null}
                    {!mini && it.count ? <span className="adm-count">{it.count}</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className="adm-main">
          <header className="adm-top">
            <div className="adm-top-in">
              <button className="adm-icon-btn adm-menu" onClick={() => setNavOpen(true)} aria-label="Menu"><Svg d={ICON.menu} size={18} /></button>
              <div className="tile adm-top-ico"><Svg d={vals.headIcon} size={20} /></div>
              <div className="adm-top-title">
                <h1>{v.title}</h1>
                {v.sub ? <div className="adm-top-sub">{v.sub}</div> : null}
              </div>
              <div className="adm-grow" />
              {/* A period switch scopes every number on the page, so it sits up here, above all of them. */}
              {v.dash && v.dash.seg.length ? (
                <div className="adm-seg" role="group" aria-label="Period">
                  {v.dash.seg.map((t) => <button key={t.label} onClick={t.go} aria-pressed={t.on}>{t.label}</button>)}
                </div>
              ) : null}
              <button className="adm-search" onClick={openSearch} title="Search (Ctrl K)" aria-label="Search">
                <Svg d={ICON.search} /><span>Search…</span><span className="adm-kbd">Ctrl K</span>
              </button>
              {vals.readOnly ? <span className="adm-readonly">Read-only</span> : null}
              {v.head.map((a) => <ActionButton key={a.label} a={a} />)}
              <button className="adm-icon-btn adm-bordered" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Dark mode" aria-pressed={theme === 'dark'}>
                <Svg d={theme === 'dark' ? ICON.sun : ICON.moon} />
              </button>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button className="adm-me" onClick={() => setState({ viewOpen: !st.viewOpen })} aria-expanded={st.viewOpen} aria-haspopup="menu" title="View as another role">
                  <span className="tile adm-avatar">{Array.from(vals.meName)[0]}</span>
                  <span className="adm-me-text">
                    <span className="ellipsis" style={{ fontSize: 13, fontWeight: 600 }}>{vals.meName}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{vals.meRole}</span>
                  </span>
                </button>
                {st.viewOpen ? (
                  <div className="adm-pop" role="menu">
                    <div style={{ padding: '4px 8px', fontSize: 12, color: 'var(--ink-3)' }}>View as — check what each role sees</div>
                    {vals.staffOpts.map((o) => (
                      <button key={o.id} role="menuitemradio" aria-checked={o.on} onClick={o.go}>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</span><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{o.role}</span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--brand)' }}>{o.on ? '✓' : ''}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <div className="adm-body">{children}</div>
        </div>

        {vals.srOpen ? (
          <div className="adm-ov" onClick={() => setState({ srOpen: false })} style={{ zIndex: 60, alignItems: 'flex-start', padding: '10vh 16px 16px', background: 'rgba(12,16,32,0.42)' }} data-screen-label="Global search">
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search"
              style={{ width: 620, maxWidth: '100%', maxHeight: '72vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 16, boxShadow: 'var(--overlay)', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 16px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>
                <Svg d={ICON.search} size={20} />
                <input ref={srRef} value={vals.srQ} onChange={(e) => setState({ srQ: e.target.value, srIdx: 0 })} placeholder="Search students, teachers, courses, batches or pages…"
                  style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 16 }} />
                <span className="adm-kbd">Esc</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 8px 10px' }}>
                {vals.srGroups.map((g) => (
                  <div key={g.label}>
                    <div className="adm-group" style={{ padding: '10px 10px 4px' }}>{g.label}</div>
                    {g.items.map((it, i) => (
                      <button key={g.label + i} onClick={it.go} onMouseEnter={it.hover}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, padding: '6px 10px', border: 'none', borderRadius: 10, background: it.bg, color: 'var(--ink)', textAlign: 'left', whiteSpace: 'normal' }}>
                        <span className="tile" style={{ width: 30, height: 30, borderRadius: 9, background: it.iconBg, color: it.iconFg }}><Svg d={it.icon} /></span>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</span>
                          {it.hasSub ? <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.sub}</span> : null}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', opacity: it.enterOp }}>↵</span>
                      </button>
                    ))}
                  </div>
                ))}
                {vals.srEmpty ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}><Svg d={ICON.search} size={28} /></span>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing found for &ldquo;{vals.srQ}&rdquo;</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Try a name, phone number, course code or batch ID.</div>
                  </div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper)', fontSize: 12, color: 'var(--ink-3)' }}><span>↑↓ select</span><span>↵ open</span><span>Esc close</span></div>
            </div>
          </div>
        ) : null}

        {vals.confirm ? (
          <div className="adm-ov" style={{ zIndex: 50, padding: 24, background: 'rgba(16,25,26,0.45)' }}>
            <div role="dialog" aria-modal="true" aria-label={vals.confirm.title}
              style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16, padding: 24, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 16, boxShadow: 'var(--overlay)' }}>
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45 }}>{vals.confirm.title}</div>
              {vals.confirm.body ? <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{vals.confirm.body}</div> : null}
              {vals.confirm.needReason ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Reason <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— required, kept in the activity log</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {vals.confirm.reasons.map((r) => (
                      <button key={r.label} className="adm-opt" onClick={r.go} aria-pressed={r.bg !== 'var(--surface)'}
                        style={{ border: '1px solid ' + r.bd, background: r.bg, color: r.fg, fontWeight: r.weight }}>{r.label}</button>
                    ))}
                  </div>
                  <textarea className="adm-field-in" value={st.cNote} onChange={(e) => setState({ cNote: e.target.value })} placeholder={vals.confirm.notePh} rows={2} style={{ minHeight: 60 }} />
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="adm-btn adm-btn-lg" onClick={() => setState({ confirm: null })}>Cancel</button>
                <button className="adm-btn adm-btn-lg" onClick={vals.confirm.okGo} style={{ border: 'none', background: vals.confirm.okBg, color: 'var(--on-brand)', opacity: vals.confirm.okOp }}>{vals.confirm.okLabel}</button>
              </div>
            </div>
          </div>
        ) : null}

        {st.toast ? <div className="adm-toast" role="status">{st.toast}</div> : null}
      </div>
    </Ctx.Provider>
  );
}

/** Body of a console section: a table with a pane, a dashboard, the roles table, or a full-width form. */
export function ConsoleMain() {
  const { vals } = useConsole();
  const { v, dt } = vals;
  return (
    <>
      {v.list ? <ListView /> : null}
      {v.matrix ? <MatrixView /> : null}
      {v.dash ? <DashView /> : null}
      {dt && dt.wide ? <SettingsView dt={dt} /> : dt ? <><Splitter /><DetailPane dt={dt} /></> : null}
    </>
  );
}

type Dt = NonNullable<ConsoleVals['dt']>;

function ActionButton({ a, large }: { a: Action; large?: boolean }) {
  return (
    <button className={'adm-btn' + (large ? ' adm-btn-lg' : '')} onClick={a.go} disabled={a.op < 1}
      style={{ borderColor: a.bd, background: a.bg, color: a.fg, opacity: a.op }}>{a.label}</button>
  );
}

function TabStrip({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="adm-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.label} className="adm-tab" role="tab" aria-selected={t.on} onClick={t.go}>{t.label}{t.count !== '' ? <span className="adm-n">{t.count}</span> : null}</button>
      ))}
    </div>
  );
}

/* ---------- table with paging ---------- */

function ListView() {
  const { vals, setState, st } = useConsole();
  const l = vals.v.list!;
  const base = l.cols.length - l.extra;
  return (
    <section className="adm-list" style={{ ['--g' as string]: l.grid, ['--gw' as string]: l.gridWide }}>
      <div className="adm-toolbar">
        <TabStrip tabs={l.filters} />
        <div className="adm-grow" />
        {l.hasSearch ? (
          <input className="adm-input" value={st.q} onChange={(e) => setState({ q: e.target.value, page: 0 })} placeholder={l.ph} aria-label={l.ph} />
        ) : null}
      </div>
      <div className="adm-thead">{l.cols.map((c, i) => <span key={c} className={i >= base ? 'adm-x' : undefined}>{c}</span>)}</div>
      <div className="adm-rows">
        {l.rows.map((r) => (
          <button key={r.key} className="adm-row" onClick={r.go} aria-current={r.on ? 'true' : undefined}>
            {r.cells.map((c, i) => <CellView key={i} c={c} extra={i >= base} label={i ? l.cols[i] : undefined} />)}
          </button>
        ))}
        {l.isEmpty ? <div className="adm-empty">{l.empty}</div> : null}
      </div>
      <footer className="adm-foot">
        <span>{l.page.total ? `Showing ${l.page.from}–${l.page.to} of ${l.page.total}` : 'Nothing to show'}</span>
        <div className="adm-grow" />
        <button className="adm-btn adm-btn-sm" onClick={l.page.prev || undefined} disabled={!l.page.prev}>Previous</button>
        <button className="adm-btn adm-btn-sm" onClick={l.page.next || undefined} disabled={!l.page.next}>Next</button>
      </footer>
    </section>
  );
}

/** `label` is the column name; it shows only where a row is stacked as a card (phones) and has no header above it. */
function CellView({ c, extra, label }: { c: Cell; extra?: boolean; label?: string }) {
  return (
    <span className={'adm-cell' + (extra ? ' adm-x' : '')}>
      {label ? <span className="adm-cell-l">{label}</span> : null}
      {c.isText ? (
        <>
          <span className="adm-cell-t" style={{ fontFamily: c.font, fontWeight: c.weight, color: c.fg }}>{c.t}</span>
          {c.hasSub ? <span className="adm-cell-s" style={{ fontFamily: c.subFont, color: c.subFg }}>{c.sub}</span> : null}
        </>
      ) : (
        <span className="adm-badge" data-plain={c.plain} style={{ background: c.bg, color: c.fg }}>{c.t}</span>
      )}
    </span>
  );
}

/* ---------- roles: every role against every area ---------- */

function MatrixView() {
  const { vals } = useConsole();
  const m = vals.v.matrix!;
  return (
    <div className="adm-matrix">
      <div className="adm-toolbar"><TabStrip tabs={m.filters} /></div>
      <div className="adm-matrix-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Area</th>
              {m.cols.map((c) => (
                <th key={c.key} scope="col">
                  <button className="adm-matrix-col" onClick={c.go} aria-pressed={c.on} title={'Open ' + c.title}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.sub}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {r.cells.map((c, i) => <td key={i}><CellView c={c} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="adm-foot"><span>Select a role in the header to change what it can do.</span></footer>
    </div>
  );
}

/* ---------- dashboard: stat tiles, then panels on a 12-column grid ---------- */

function DashView() {
  const { vals } = useConsole();
  const d = vals.v.dash!;
  // Rows the panels make: twelve columns on a wide dashboard, and two panels a row (a wide one alone) on a narrower one.
  const wide = d.panels.filter((p) => p.span >= 8).length;
  const rows = Math.ceil(d.panels.reduce((a, p) => a + p.span, 0) / 12), rowsMd = wide + Math.ceil((d.panels.length - wide) / 2);
  return (
    <div className="adm-dash">
      <div className="adm-kpis" style={{ ['--n' as string]: d.kpis.length }}>{d.kpis.map((k) => <KpiTile key={k.label} k={k} />)}</div>
      <div className="adm-grid" style={{ ['--rows-lg' as string]: rows, ['--rows-md' as string]: rowsMd }}>{d.panels.map((p) => <PanelView key={p.title} p={p} />)}</div>
    </div>
  );
}

function KpiTile({ k }: { k: Kpi }) {
  return (
    <button className="adm-kpi" onClick={k.go}>
      <span className="adm-kpi-top">
        <span className="adm-kpi-label">{k.label}</span>
        <span className="tile adm-kpi-ico" style={{ background: k.iconBg, color: k.iconFg }}><Svg d={k.icon} /></span>
      </span>
      <span className="adm-kpi-mid">
        <span className="adm-kpi-val">{k.value}</span>
        {k.spark ? <Sparkline values={k.spark} /> : null}
      </span>
      <span className="adm-kpi-sub">{k.sub}</span>
      {k.delta ? (
        <span className="adm-delta" data-good={k.delta.dir === 'flat' ? undefined : k.delta.good}>
          <Svg d={ICON[k.delta.dir]} size={12} w={2.6} />{k.delta.text}
        </span>
      ) : null}
    </button>
  );
}

/** The same numbers as a chart, as rows. Every chart panel can switch to it, so no value needs a hover. */
function tableOf(p: Panel): { cols: string[]; rows: string[][] } | null {
  const t = p.trend;
  if (t) return { cols: ['Period', t.unit === 'taka' ? 'Amount' : 'Count'], rows: t.points.map((x) => [x.x, figure(x.y, t.unit)]) };
  if (p.share) return { cols: ['Part', 'Amount', 'Share'], rows: p.share.map((x) => [x.label, x.value, x.pct + '%']) };
  if (p.bars) return { cols: ['Name', 'Amount'], rows: p.bars.map((b) => [b.label, b.value]) };
  if (p.meters) return { cols: ['Name', 'Used', 'Share'], rows: p.meters.map((m) => [m.label, m.value, m.pct + '%']) };
  return null;
}

function PanelView({ p }: { p: Panel }) {
  const [asTable, setAsTable] = useState(false);
  const twin = tableOf(p);
  return (
    <section className="adm-panel" data-span={p.span} style={{ ['--span' as string]: p.span }}>
      <header className="adm-panel-head">
        <div className="adm-panel-title">
          <h2>{p.title}</h2>
          {p.sub ? <div className="adm-panel-sub">{p.sub}</div> : null}
        </div>
        {p.seg ? (
          <div className="adm-seg adm-seg-sm" role="group" aria-label={p.title + ' period'}>
            {p.seg.map((t) => <button key={t.label} onClick={t.go} aria-pressed={t.on}>{t.label}</button>)}
          </div>
        ) : null}
        {twin ? (
          <button className="adm-link" onClick={() => setAsTable(!asTable)} aria-pressed={asTable} title={asTable ? 'Show the chart' : 'Show the numbers as a table'}>
            <Svg d={asTable ? ICON.chart : ICON.table} size={14} />{asTable ? 'Chart' : 'Table'}
          </button>
        ) : null}
        {p.more ? <button className="adm-link" onClick={p.more.go}>{p.more.label} →</button> : null}
      </header>
      <div className="adm-panel-body">
        {asTable && twin ? <DataTable cols={twin.cols} rows={twin.rows} />
          : p.trend ? <TrendChart trend={p.trend} />
          : p.share ? <Donut parts={p.share} whole={p.whole} />
          : p.bars ? <BarList bars={p.bars} />
          : p.meters ? <Meters meters={p.meters} />
          : p.table ? <DataTable cols={p.table.cols} rows={p.table.rows} />
          : p.items ? <div className="adm-items">{p.items.map((it, i) => <ItemRow key={i} it={it} pad="10px 16px" />)}</div>
          : null}
      </div>
    </section>
  );
}

function DataTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <table className="adm-table">
      <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j}>{x}</td>)}</tr>)}</tbody>
    </table>
  );
}

/* ---------- detail pane and the full-width form ---------- */

/** Drag to resize the detail pane; double-click to go back to the default width. The width is remembered. */
export function Splitter() {
  const { setState } = useConsole();
  const [on, setOn] = useState(false);
  const start = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setOn(true);
    const move = (ev: PointerEvent) => setState({ paneW: Math.round(Math.max(360, Math.min(window.innerWidth * 0.6, window.innerWidth - ev.clientX))) });
    const stop = () => { setOn(false); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', stop); el.removeEventListener('pointercancel', stop); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  };
  return (
    <div className="adm-split">
      <span data-on={on} onPointerDown={start} onDoubleClick={() => setState({ paneW: 0 })} role="separator" aria-orientation="vertical" aria-label="Resize the detail panel" title="Drag to resize · double-click to reset" />
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  return (
    <>
      {b.hasNote ? <div className="adm-note" style={{ background: b.noteBg }}>{b.note}</div> : null}
      {b.hasKv && b.kv.some((kv) => kv.go) ? (
        <div className="adm-kv-links">
          {b.kv.map((kv) => (
            <button key={kv.k} onClick={kv.go} aria-pressed={!!kv.on} title={'Show ' + kv.k.toLowerCase()}>
              <span>{kv.k}</span><span>{kv.v}</span>
            </button>
          ))}
        </div>
      ) : b.hasKv ? (
        <div className="adm-kv">
          {b.kv.map((kv, i) => [
            <span key={i + 'k'}>{kv.k}</span>,
            <span key={i + 'v'} style={{ fontFamily: kv.font, color: kv.fg, fontWeight: kv.weight }}>{kv.v}</span>,
          ])}
        </div>
      ) : null}
      {b.hasFields ? <div className="adm-fields">{b.fields.map((f, fi) => <FieldView key={fi} f={f} />)}</div> : null}
      {b.hasItems ? <div className="adm-items" style={{ borderTop: '1px solid var(--line)' }}>{b.items.map((it, i) => <ItemRow key={i} it={it} pad="10px 0" />)}</div> : null}
    </>
  );
}

const RO_NOTE = 'You can only view this area. Ask a Super admin if you need to change it.';

/** Beside a list: the selected row's details, or the section's summary while nothing is selected. */
function DetailPane({ dt }: { dt: Dt }) {
  const { setState } = useConsole();
  return (
    <aside className="adm-pane" data-summary={dt.isSummary} aria-label={dt.isSummary ? 'Section summary' : 'Details'}>
      <div className="adm-pane-in">
        <div className="adm-pane-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="adm-pane-title">{dt.title}</div>
            {dt.sub ? <div className="adm-muted">{dt.sub}</div> : null}
          </div>
          {dt.badge ? <span className="adm-badge" data-plain={dt.badge.plain} style={{ background: dt.badge.bg, color: dt.badge.fg }}>{dt.badge.t}</span> : null}
          {dt.closable ? <button className="adm-x-btn" onClick={() => setState({ sel: null, form: null, draft: null })} aria-label="Close">✕</button> : null}
        </div>
        {dt.blocks.map((b, bi) => (
          <section key={bi} className="adm-block">
            {b.hasTitle ? <div className="adm-group" style={{ padding: 0 }}>{b.title}</div> : null}
            <BlockView b={b} />
          </section>
        ))}
        {dt.actions.length ? <div className="adm-actions">{dt.actions.map((a) => <ActionButton key={a.label} a={a} large />)}</div> : null}
        {dt.hasRoNote ? <div className="adm-muted" style={{ fontSize: 12 }}>{RO_NOTE}</div> : null}
      </div>
    </aside>
  );
}

/** A form that owns the whole body (Settings): section menu, one card per block in columns, and a save bar that stays in view. */
function SettingsView({ dt }: { dt: Dt }) {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="adm-settings">
      <div className="adm-set-scroll">
        <nav className="adm-set-nav" aria-label={dt.title}>
          <div className="adm-group">{dt.title}</div>
          {dt.blocks.map((b, i) => (b.hasTitle ? <a key={b.title} href={'#set-' + i} onClick={(e) => { e.preventDefault(); jump('set-' + i); }}>{b.title}</a> : null))}
        </nav>
        <div className="adm-set-cards">
          {dt.blocks.map((b, i) => (
            <section key={i} id={'set-' + i} className="adm-card" data-wide={b.wide}>
              {b.hasTitle ? <h2>{b.title}</h2> : null}
              <BlockView b={b} />
            </section>
          ))}
        </div>
      </div>
      <footer className="adm-savebar">
        <span className="adm-muted adm-grow">{dt.hasRoNote ? RO_NOTE : dt.sub}</span>
        {dt.actions.map((a) => <ActionButton key={a.label} a={a} large />)}
      </footer>
    </div>
  );
}

function FieldView({ f }: { f: Field }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: f.dir, alignItems: f.align, justifyContent: 'space-between', gap: '8px 12px', flexWrap: 'wrap' }}>
        {f.hasLabel ? <span style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</span> : null}
        {f.isInput ? (
          <input className="adm-field-in" type={f.type} value={f.value} onChange={(e) => f.onChange?.(e.target.value)} placeholder={f.ph} disabled={f.disabled} aria-label={f.label || f.ph}
            style={{ borderColor: f.bd, opacity: f.disabled ? 0.7 : 1 }} />
        ) : null}
        {f.isArea ? (
          <textarea className="adm-field-in" value={f.value} onChange={(e) => f.onChange?.(e.target.value)} placeholder={f.ph} disabled={f.disabled} rows={4} aria-label={f.label || f.ph} />
        ) : null}
        {f.isSeg ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label={f.label}>
            {(f.opts || []).map((o) => (
              <button key={o.label} className="adm-opt" onClick={o.go} aria-pressed={o.weight === 600}
                style={{ border: '1px solid ' + o.bd, background: o.bg, color: o.fg, opacity: o.op, fontWeight: o.weight }}>{o.label}</button>
            ))}
          </div>
        ) : null}
      </div>
      {f.hasHint ? <span style={{ fontSize: 12, color: f.hintFg, lineHeight: 1.5 }}>{f.hint}</span> : null}
    </div>
  );
}

function ItemRow({ it, pad }: { it: Item; pad: string }) {
  return (
    <div className="adm-item" style={{ padding: pad }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.45 }}>
        <span style={{ fontSize: 13 }}>{it.t}</span>
        {it.hasSub ? <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.sub}</span> : null}
      </div>
      {it.hasRight ? <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{it.right}</span> : null}
      {it.hasAct ? <button className="adm-btn adm-btn-sm" onClick={it.actGo}>{it.actLabel}</button> : null}
    </div>
  );
}
