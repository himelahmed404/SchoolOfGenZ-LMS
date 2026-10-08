'use client';

import Link from 'next/link';
import { courses } from '@/lib/data';
import { counts } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Icon } from './ui';

/** Placeholder until the penguin mascot artwork exists: a tilted, striped disc. */
export function Penguin({ size, label = 'penguin', style }: { size: number; label?: string; style?: React.CSSProperties }) {
  return (
    <div className="peng" style={{ width: size, height: size, fontSize: size >= 140 ? 11 : size >= 76 ? 10 : size >= 50 ? 9 : 8, ...style }} aria-hidden>
      {label}
    </div>
  );
}

/** Lesson-complete toast (2s, +10 points) and the full-screen course-complete penguin. */
export function Celebrations() {
  const { s, toast, showToast } = useStore();
  if (toast === 'small') {
    return (
      <div data-print="hide" role="status"
        style={{ position: 'fixed', right: 20, bottom: 'var(--toast-bottom)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 18px 8px 8px', borderRadius: 999, background: '#131A33', color: '#FFFFFF', boxShadow: 'var(--overlay)', animation: 'pgn 220ms var(--ease)' }}>
        <Penguin size={40} label="png" style={{ borderColor: '#131A33', fontSize: 8 }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Lesson Complete</span>
          <span style={{ fontSize: 12, color: '#FFE45C', fontWeight: 600 }}>+10 points</span>
        </div>
      </div>
    );
  }
  if (toast === 'big') {
    const c = counts(s, 'cst');
    return (
      <div className="ov" data-print="hide" role="dialog" aria-modal="true" aria-label="Course Complete"
        style={{ zIndex: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: 'repeating-linear-gradient(180deg, transparent 0 31px, var(--rule) 31px 32px), var(--paper)', animation: 'pgn 260ms var(--ease)' }}>
        <Penguin size={148} />
        <div className="disp" style={{ fontSize: 34, lineHeight: 1.2, fontWeight: 800, textAlign: 'center' }}><span className="hl">Course Complete!</span></div>
        <div style={{ fontSize: 15, color: 'var(--ink-2)', textAlign: 'center' }}>{courses.cst.title} · all {c.total} lessons done</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <Link href="/certificate" className="btn btn-primary" style={{ height: 48 }} onClick={() => showToast(null)}><Icon name="workspace_premium" size={20} />View Certificate</Link>
          <button className="btn" style={{ height: 48, fontSize: 15 }} onClick={() => showToast(null)}>পরে</button>
        </div>
      </div>
    );
  }
  return null;
}
