'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AREAS, AdminConsole, adminSeed, ICON, initialUi, type AdminData, type Cell, type ConsoleState, type ConsoleVals, type Field, type Item, type Section, type SetState } from '@/lib/admin';
import { allQueue, item, itemKeys } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const SECTIONS = new Set<string>(AREAS.map((a) => a[0]));
export const isSection = (s: string): s is Section => s === 'overview' || SECTIONS.has(s);
const sectionOf = (path: string): Section => { const seg = path.split('/')[2] || 'overview'; return isSection(seg) ? seg : 'overview'; };
const DATA_KEYS: (keyof AdminData)[] = ['roles', 'staff', 'courses', 'batches', 'teachers', 'students', 'coupons', 'refunds', 'certs', 'ann', 'activity', 'settings', 'viewAs', 'navMini'];

const Ctx = createContext<{ vals: ConsoleVals; logic: AdminConsole; setState: SetState; st: ConsoleState } | null>(null);
/** Console state and logic for anything rendered inside AdminShell (sections, queues). */
export const useConsole = () => { const v = useContext(Ctx); if (!v) throw new Error('inside AdminShell only'); return v; };

/** Stroke icon from the console's path set. */
export function Svg({ d, size = 16, w = 1.9 }: { d: string; size?: number; w?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

/** Console frame for every /admin route: sidebar, overlays and the console state. Desktop only. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { s, set, ready, numerals, theme } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [st, setSt] = useState<ConsoleState | null>(null);
  const srRef = useRef<HTMLInputElement>(null);

  // Console data lives in the store (persisted); view state stays here.
  useEffect(() => { if (ready && !st) setSt({ ...(s.admin || adminSeed()), ...initialUi }); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const dataDeps = DATA_KEYS.map((k) => st?.[k]);
  useEffect(() => {
    if (!st) return;
    const data = {} as Record<string, unknown>;
    DATA_KEYS.forEach((k) => { data[k] = st[k]; });
    set((x) => ({ ...x, admin: data as unknown as AdminData }));
  }, dataDeps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st?.toast) return;
    const t = setTimeout(() => setSt((c) => (c ? { ...c, toast: null } : c)), 3000);
    return () => clearTimeout(t);
  }, [st?.toast]);

  const setState: SetState = useCallback((p) => setSt((cur) => (cur ? { ...cur, ...(typeof p === 'function' ? p(cur) : p) } : cur)), []);

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
  useEffect(() => { if (st?.srOpen) setTimeout(() => srRef.current?.focus(), 30); }, [st?.srOpen]);

  if (!ready || !st) return <div className="adm-root" />;

  const env = {
    sec: sectionOf(path), numerals, theme, today: new Date(),
    payCount: allQueue(s).filter((r) => r.status === 'pending').length,
    contentCount: itemKeys(s).filter((k) => item(s, k).status === 'review').length,
    navigate: (k: Section) => router.push(k === 'overview' ? '/admin' : '/admin/' + k),
    toggleTheme: () => set((x) => ({ ...x, prefs: { ...x.prefs, theme: theme === 'dark' ? 'light' : 'dark' } })),
  };
  const logic = new AdminConsole(st, setState, env);
  logicRef.current = logic;
  const vals = logic.renderVals();
  const mini = vals.mini;

  return (
    <Ctx.Provider value={{ vals, logic, setState, st }}>
      <div className="adm-root">
        <aside className="adm-side" style={{ width: mini ? 72 : 232 }}>
          <div style={{ flexShrink: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 14px', borderBottom: '1px solid var(--line)' }}>
            {!mini ? (
              <>
                <div className="tile" style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--brand)', color: 'var(--on-brand)' }}><Svg d={ICON.cap} size={17} w={2} /></div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>School of GenZ</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>admin console</span>
                </div>
              </>
            ) : null}
            <button className="adm-icon-btn" onClick={() => setState({ navMini: !mini, viewOpen: false })} title={mini ? 'মেনু খোলো' : 'মেনু ছোট করো'} aria-label={mini ? 'মেনু খোলো' : 'মেনু ছোট করো'}>
              <Svg d={mini ? ICON.expand : ICON.collapse} w={1.8} />
            </button>
          </div>
          <div style={{ flexShrink: 0, padding: '12px 10px 0' }}>
            <button className="adm-search" onClick={() => setState({ srOpen: true, srQ: '', srIdx: 0 })} title="খুঁজো (Ctrl K)"
              style={{ justifyContent: mini ? 'center' : 'flex-start', padding: mini ? 0 : '0 12px' }}>
              <Svg d={ICON.search} />
              {!mini ? <><span style={{ flex: 1, textAlign: 'left' }}>খুঁজো…</span><span className="adm-kbd">Ctrl K</span></> : null}
            </button>
          </div>
          <nav style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Admin">
            {vals.navGroups.map((g) => (
              <div key={g.label || 'top'} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.showLabel ? <div className="adm-group">{g.label}</div> : null}
                {g.showRule ? <div style={{ height: 1, margin: '0 8px 6px', background: 'var(--line)' }} /> : null}
                {g.items.map((it) => (
                  <button key={it.key} className={'adm-nav' + (it.on ? ' on' : '')} onClick={it.go} title={it.label} aria-current={it.on ? 'page' : undefined}
                    style={{ justifyContent: mini ? 'center' : 'flex-start', padding: mini ? 0 : '0 6px' }}>
                    <span className="adm-nav-ico"><Svg d={it.icon} />{it.dot ? <span className="adm-dot" /> : null}</span>
                    {!mini ? <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span> : null}
                    {it.ro ? <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>view</span> : null}
                    {it.showCount ? <span className="adm-count">{it.count}</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ flexShrink: 0, position: 'relative', borderTop: '1px solid var(--line)', padding: 8 }}>
            {st.viewOpen ? (
              <div className="adm-pop" role="menu">
                <div style={{ padding: '4px 8px', fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'normal' }}>View as — প্রতিটা রোল কী দেখে যাচাই করো</div>
                {vals.staffOpts.map((o) => (
                  <button key={o.id} role="menuitem" onClick={o.go} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', border: 'none', borderRadius: 10, background: o.on ? 'var(--brand-soft)' : 'transparent', color: 'var(--ink)', textAlign: 'left' }}>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</span><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{o.role}</span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--brand)' }}>{o.on ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: mini ? 'column' : 'row', alignItems: 'center', gap: 4 }}>
              <button className="adm-me" onClick={() => setState({ viewOpen: !st.viewOpen })} aria-expanded={st.viewOpen} style={{ justifyContent: mini ? 'center' : 'flex-start' }}>
                <span className="tile" style={{ width: 30, height: 30, borderRadius: 9999, background: 'var(--surface-sunk)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{Array.from(vals.meName)[0]}</span>
                {!mini ? (
                  <>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
                      <span className="ellipsis" style={{ fontSize: 13, fontWeight: 600 }}>{vals.meName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{vals.meRole}</span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>▾</span>
                  </>
                ) : null}
              </button>
              <button className="adm-theme" onClick={env.toggleTheme} title={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'} aria-label={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}>
                <Svg d={theme === 'dark' ? ICON.sun : ICON.moon} />
              </button>
            </div>
          </div>
        </aside>

        {children}

        {vals.srOpen ? (
          <div className="adm-ov" onClick={() => setState({ srOpen: false })} style={{ zIndex: 60, alignItems: 'flex-start', padding: '10vh 16px 16px', background: 'rgba(12,16,32,0.42)' }} data-screen-label="Global search">
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="খুঁজো"
              style={{ width: 620, maxWidth: '100%', maxHeight: '72vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 16, boxShadow: 'var(--overlay)', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 16px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>
                <Svg d={ICON.search} size={20} />
                <input ref={srRef} value={vals.srQ} onChange={(e) => setState({ srQ: e.target.value, srIdx: 0 })} placeholder="স্টুডেন্ট, শিক্ষক, কোর্স, ব্যাচ বা পেজ খোঁজো…"
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
                    <div style={{ fontSize: 15, fontWeight: 600 }}>&ldquo;{vals.srQ}&rdquo; — কিছু পাওয়া যায়নি</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>নাম, ফোন নম্বর, কোর্স কোড বা ব্যাচ আইডি দিয়ে চেষ্টা করো।</div>
                  </div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper)', fontSize: 12, color: 'var(--ink-3)' }}><span>↑↓ বাছাই</span><span>↵ খোলো</span><span>Esc বন্ধ</span></div>
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
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Reason <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>— আবশ্যক, activity log-এ থাকবে</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {vals.confirm.reasons.map((r) => (
                      <button key={r.label} onClick={r.go} aria-pressed={r.bg !== 'var(--surface)'}
                        style={{ height: 30, padding: '0 10px', border: '1px solid ' + r.bd, borderRadius: 10, background: r.bg, color: r.fg, fontSize: 13, fontWeight: r.weight }}>{r.label}</button>
                    ))}
                  </div>
                  <textarea value={st.cNote} onChange={(e) => setState({ cNote: e.target.value })} placeholder={vals.confirm.notePh} rows={2}
                    style={{ width: '100%', minHeight: 60, padding: '8px 10px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--paper)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }} />
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setState({ confirm: null })} style={{ height: 38, padding: '0 14px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 500 }}>Cancel</button>
                <button onClick={vals.confirm.okGo} style={{ height: 38, padding: '0 16px', border: 'none', borderRadius: 10, background: vals.confirm.okBg, color: 'var(--on-brand)', opacity: vals.confirm.okOp, fontSize: 14, fontWeight: 500 }}>{vals.confirm.okLabel}</button>
              </div>
            </div>
          </div>
        ) : null}

        {st.toast ? (
          <div role="status" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 60, maxWidth: 520, padding: '10px 16px', borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, boxShadow: 'var(--overlay)' }}>{st.toast}</div>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

/** Section page: header, then list + detail pane, dashboard, or a wide detail (Settings). */
export function ConsoleMain() {
  const { vals, setState, st } = useConsole();
  const { v, dt } = vals;
  const panelIcon = (title: string) => {
    const k = /attention/i.test(title) ? 'alert' : /revenue|আয়/i.test(title) ? 'reports' : /activity/i.test(title) ? 'activity' : /course|কোর্স/i.test(title) ? 'courses'
      : /batch|ব্যাচ/i.test(title) ? 'batches' : /teacher|শিক্ষক/i.test(title) ? 'teachers' : /student|স্টুডেন্ট/i.test(title) ? 'students' : /payment|পেমেন্ট/i.test(title) ? 'payments' : null;
    return k ? ICON[k] : null;
  };

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, minHeight: 56, padding: '8px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="tile" style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--brand-soft)', color: 'var(--brand)' }}><Svg d={vals.headIcon} size={20} /></div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35, marginLeft: -4 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600 }}>{v.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{v.sub}</div>
        </div>
        <div style={{ flex: 1 }} />
        {vals.readOnly ? <span style={{ height: 26, padding: '0 10px', borderRadius: 10, background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center' }}>Read-only</span> : null}
        {v.head.map((a) => (
          <button key={a.label} onClick={a.go} style={{ height: 34, padding: '0 14px', border: '1px solid ' + a.bd, borderRadius: 10, background: a.bg, color: a.fg, opacity: a.op, fontSize: 13, fontWeight: 500 }}>{a.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {v.list ? (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, minHeight: 44, padding: '0 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 18, height: 44, flexWrap: 'wrap' }} role="tablist">
                {v.list.filters.map((t) => (
                  <button key={t.label} role="tab" aria-selected={t.weight === 600} onClick={t.go}
                    style={{ height: 44, border: 'none', background: 'none', padding: 0, fontSize: 13, fontWeight: t.weight, color: t.color, borderBottom: '2px solid ' + t.rule, whiteSpace: 'nowrap' }}>{t.label} {t.count}</button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              {v.list.hasSearch ? (
                <input value={st.q} onChange={(e) => setState({ q: e.target.value })} placeholder={v.list.ph} aria-label={v.list.ph}
                  style={{ width: 240, maxWidth: '100%', height: 32, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--paper)', color: 'var(--ink)', fontSize: 13 }} />
              ) : null}
            </div>
            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: v.list.grid, gap: 12, alignItems: 'center', height: 32, padding: '0 20px', borderBottom: '1px solid var(--line)', background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 2, fontSize: 12, color: 'var(--ink-3)' }}>
              {v.list.cols.map((c) => <span key={c}>{c}</span>)}
            </div>
            {v.list.rows.map((r) => (
              <button key={r.key} onClick={r.go} aria-current={r.rule !== 'transparent' ? 'true' : undefined}
                style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: v.list!.grid, gap: 12, alignItems: 'center', width: '100%', minHeight: 48, padding: '6px 20px 6px 18px', border: 'none', borderLeft: '2px solid ' + r.rule, borderBottom: '1px solid var(--line)', background: r.bg, color: 'var(--ink)', textAlign: 'left', whiteSpace: 'normal' }}>
                {r.cells.map((c, i) => <CellView key={i} c={c} />)}
              </button>
            ))}
            {v.list.isEmpty ? <div style={{ padding: '48px 20px', textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>{v.list.empty}</div> : null}
          </div>
        ) : null}

        {v.dash ? (
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 24 }}>
            <div style={{ maxWidth: 1120, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {v.dash.hasSeg ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {v.dash.seg.map((o) => (
                    <button key={o.label} onClick={o.go} aria-pressed={o.weight === 600} style={{ height: 32, padding: '0 12px', border: '1px solid ' + o.bd, borderRadius: 10, background: o.bg, color: o.fg, fontSize: 13, fontWeight: o.weight }}>{o.label}</button>
                  ))}
                </div>
              ) : null}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
                {v.dash.kpis.map((k) => (
                  <button key={k.label} onClick={k.go}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '14px 16px', border: '1px solid var(--line)', borderTop: '3px solid ' + k.stripe, borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', textAlign: 'left', whiteSpace: 'normal' }}>
                    <span style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k.label}</span>
                      <span className="tile" style={{ width: 30, height: 30, borderRadius: 9, background: k.iconBg, color: k.iconFg }}><Svg d={k.icon} /></span>
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.3 }}>{k.value}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{k.sub}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, alignItems: 'start' }}>
                {v.dash.panels.map((p) => {
                  const ic = panelIcon(p.title);
                  return (
                    <div key={p.title} style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {ic ? <span className="tile" style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--surface-sunk)', color: 'var(--ink-2)' }}><Svg d={ic} size={15} /></span> : null}
                        <span>{p.title}</span>
                      </div>
                      {p.hasBars ? (
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {p.bars.map((b) => (
                            <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) auto', gap: 12, alignItems: 'center', fontSize: 13 }}>
                              <span className="ellipsis" style={{ color: 'var(--ink-2)' }}>{b.label}</span>
                              <div style={{ height: 8, background: 'var(--surface-sunk)', borderRadius: 5 }}><div style={{ height: 8, width: b.pct + '%', background: b.color, borderRadius: 5 }} /></div>
                              <span className="mono" style={{ fontSize: 12 }}>{b.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {p.hasItems ? <div style={{ display: 'flex', flexDirection: 'column' }}>{p.items.map((it, i) => <ItemRow key={i} it={it} pad="10px 16px" />)}</div> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {dt ? (
          <aside style={{ width: dt.w, flex: dt.flex, minWidth: 0, borderLeft: v.list || v.dash ? '1px solid var(--line)' : 'none', background: 'var(--surface)', overflow: 'auto' }}>
            <div style={{ maxWidth: dt.max, padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.4 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{dt.title}</div>
                  {dt.sub ? <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{dt.sub}</div> : null}
                </div>
                {dt.badge ? <span style={{ height: 24, padding: '0 8px', borderRadius: 10, background: dt.badge.bg, color: dt.badge.fg, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{dt.badge.t}</span> : null}
                {dt.closable ? <button onClick={() => setState({ sel: null, form: null, draft: null })} aria-label="Close" style={{ width: 32, height: 32, margin: '-4px -8px 0 0', border: 'none', background: 'none', color: 'var(--ink-2)', fontSize: 15 }}>✕</button> : null}
              </div>
              {dt.blocks.map((b, bi) => (
                <section key={bi} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {b.hasTitle ? <div className="adm-group" style={{ padding: 0 }}>{b.title}</div> : null}
                  {b.hasNote ? <div style={{ padding: '10px 12px', borderRadius: 10, background: b.noteBg, color: 'var(--ink)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{b.note}</div> : null}
                  {b.hasKv ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '6px 16px', fontSize: 13 }}>
                      {b.kv.map((kv, i) => [
                        <span key={i + 'k'} style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{kv.k}</span>,
                        <span key={i + 'v'} style={{ textAlign: 'right', fontFamily: kv.font, color: kv.fg, fontWeight: kv.weight, overflowWrap: 'anywhere' }}>{kv.v}</span>,
                      ])}
                    </div>
                  ) : null}
                  {b.hasFields ? <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{b.fields.map((f, fi) => <FieldView key={fi} f={f} />)}</div> : null}
                  {b.hasItems ? <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--line)' }}>{b.items.map((it, i) => <ItemRow key={i} it={it} pad="10px 0" />)}</div> : null}
                </section>
              ))}
              {dt.actions.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                  {dt.actions.map((a) => (
                    <button key={a.label} onClick={a.go} disabled={a.op < 1} style={{ height: 38, padding: '0 14px', border: '1px solid ' + a.bd, borderRadius: 10, background: a.bg, color: a.fg, opacity: a.op, fontSize: 14, fontWeight: 500 }}>{a.label}</button>
                  ))}
                </div>
              ) : null}
              {dt.hasRoNote ? <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>এই অংশে তোমার শুধু দেখার অনুমতি আছে — বদলাতে Super admin-কে বলো।</div> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function CellView({ c }: { c: Cell }) {
  return (
    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.4 }}>
      {c.isText ? (
        <>
          <span style={{ maxWidth: '100%', fontSize: 13, fontFamily: c.font, fontWeight: c.weight, color: c.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.t}</span>
          {c.hasSub ? <span style={{ maxWidth: '100%', fontSize: 11, fontFamily: c.subFont, color: c.subFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sub}</span> : null}
        </>
      ) : (
        <span style={{ height: 22, padding: '0 8px', borderRadius: 10, background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{c.t}</span>
      )}
    </span>
  );
}

function FieldView({ f }: { f: Field }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: f.dir, alignItems: f.align, justifyContent: 'space-between', gap: '8px 12px', flexWrap: 'wrap' }}>
        {f.hasLabel ? <span style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</span> : null}
        {f.isInput ? (
          <input type={f.type} value={f.value} onChange={(e) => f.onChange?.(e.target.value)} placeholder={f.ph} disabled={f.disabled} aria-label={f.label || f.ph}
            style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid ' + f.bd, borderRadius: 10, background: 'var(--paper)', color: 'var(--ink)', fontSize: 14, opacity: f.disabled ? 0.7 : 1 }} />
        ) : null}
        {f.isArea ? (
          <textarea value={f.value} onChange={(e) => f.onChange?.(e.target.value)} placeholder={f.ph} disabled={f.disabled} rows={4} aria-label={f.label || f.ph}
            style={{ width: '100%', minHeight: 96, padding: '8px 10px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--paper)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }} />
        ) : null}
        {f.isSeg ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label={f.label}>
            {(f.opts || []).map((o) => (
              <button key={o.label} onClick={o.go} aria-pressed={o.weight === 600}
                style={{ height: 30, padding: '0 10px', border: '1px solid ' + o.bd, borderRadius: 10, background: o.bg, color: o.fg, opacity: o.op, fontSize: 13, fontWeight: o.weight }}>{o.label}</button>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: pad, borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.45 }}>
        <span style={{ fontSize: 13 }}>{it.t}</span>
        {it.hasSub ? <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.sub}</span> : null}
      </div>
      {it.hasRight ? <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{it.right}</span> : null}
      {it.hasAct ? <button onClick={it.actGo} style={{ height: 30, padding: '0 10px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 500 }}>{it.actLabel}</button> : null}
    </div>
  );
}
