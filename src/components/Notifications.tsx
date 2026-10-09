'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearNotifs, markRead } from '@/lib/actions';
import { toneColors } from '@/lib/data';
import { ago } from '@/lib/format';
import { notifsFor, type AppRole } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Icon } from './ui';

/** Right-hand drawer (full width on mobile). Opened from the sidebar, the topbar bell or Profile → settings. */
export function Notifications({ role }: { role: AppRole }) {
  const { s, set, notifOpen, setNotifOpen } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notifOpen, setNotifOpen]);

  if (!notifOpen) return null;

  const all = notifsFor(s, role);
  const unread = all.filter((x) => !s.notifs.read[x.id]);
  const shown = tab === 'unread' ? unread : all;
  const close = () => setNotifOpen(false);

  return (
    <div className="ov drawer-scrim" data-print="hide">
      <div onClick={close} style={{ flex: 1 }} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Notifications">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 12px 12px 20px', borderBottom: '1px solid var(--line)' }}>
          <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Notifications</div>
          {unread.length ? (
            <span style={{ padding: '0 8px', borderRadius: 999, background: 'var(--margin)', color: '#FFFFFF', fontSize: 12, fontWeight: 700 }}>{unread.length} new</span>
          ) : null}
          <button className="icon-btn" onClick={close} aria-label="Close" style={{ marginLeft: 'auto', width: 40, height: 40, color: 'var(--ink-2)' }}>
            <Icon name="close" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
          {([['All', 'all'], ['Unread', 'unread']] as const).map(([label, id]) => {
            const on = tab === id;
            return (
              <button key={id} aria-pressed={on} onClick={() => setTab(id)}
                style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 999, background: on ? 'var(--ink)' : 'var(--surface-sunk)', color: on ? 'var(--surface)' : 'var(--ink-2)', fontSize: 13, fontWeight: 600 }}>
                {label}
              </button>
            );
          })}
          <button onClick={() => set((x) => markRead(x, all.map((a) => a.id)))}
            style={{ marginLeft: 'auto', height: 32, padding: '0 10px', border: 'none', borderRadius: 999, background: 'transparent', color: 'var(--brand)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="done_all" size={18} />Mark all read
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {shown.map((x) => {
            const read = !!s.notifs.read[x.id], tone = toneColors[x.tone];
            return (
              <button key={x.id} className="notif-row" style={{ ['--row-bg' as string]: read ? 'transparent' : 'var(--brand-soft)' }}
                onClick={() => { set((st) => markRead(st, [x.id])); close(); router.push(x.href); }}>
                <span className="tile" style={{ width: 40, height: 40, borderRadius: 12, background: tone[0], color: tone[1] }}><Icon name={x.icon} fill /></span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, lineHeight: 1.4, fontWeight: read ? 500 : 700 }}>{x.title}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }}>{x.body}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ago(x.agoMin)}</span>
                </span>
                <span style={{ width: 10, height: 10, marginTop: 6, flexShrink: 0, borderRadius: 999, background: read ? 'transparent' : 'var(--margin)' }} />
              </button>
            );
          })}
          {shown.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '64px 28px', textAlign: 'center' }}>
              <span className="tile" style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--sun)', color: 'var(--on-sun)', transform: 'rotate(-6deg)' }}><Icon name="notifications_off" size={36} /></span>
              <div className="disp" style={{ fontSize: 19, fontWeight: 800 }}>সব দেখা শেষ!</div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>নতুন কিছু এলে এখানে জানিয়ে দেবো।</div>
            </div>
          ) : null}
        </div>

        {all.length ? (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <button onClick={() => set((x) => clearNotifs(x, all.map((a) => a.id)))}
              style={{ width: '100%', height: 42, border: '1px solid var(--line-strong)', borderRadius: 999, background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600 }}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
