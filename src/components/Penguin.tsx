'use client';

import Link from 'next/link';
import { courses } from '@/lib/data';
import { counts } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** Placeholder until the penguin mascot artwork exists: a tilted, striped disc. */
export function Penguin({ size, label = 'penguin' }: { size: number; label?: string }) {
  return (
    <div className="peng" style={{ width: size, height: size, fontSize: size >= 140 ? 11 : size >= 76 ? 10 : size >= 50 ? 9 : 8 }} aria-hidden>
      {label}
    </div>
  );
}

/** Lesson-complete toast (2s) and the full-screen course-complete penguin. */
export function Celebrations() {
  const { s, n, toast, showToast } = useStore();
  if (toast === 'small') {
    return (
      <div className="toast" data-print="hide" role="status">
        <Penguin size={36} label="png" />
        <div className="t15">Lesson Complete</div>
      </div>
    );
  }
  if (toast === 'big') {
    const c = counts(s, 'cst');
    return (
      <div data-print="hide" role="dialog" aria-modal="true"
        style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, background: 'var(--paper)', animation: 'pgn 240ms var(--ease)' }}>
        <Penguin size={132} />
        <div className="h2" style={{ textAlign: 'center' }}>Course Complete!</div>
        <div className="t15 ink2" style={{ textAlign: 'center' }}>{courses.cst.title} · {n(c.total)}টি লেসনই সম্পন্ন</div>
        <div className="row">
          <Link href="/certificate" className="btn btn-primary" style={{ height: 44 }} onClick={() => showToast(null)}>View Certificate</Link>
          <button className="btn btn-quiet" style={{ height: 44 }} onClick={() => showToast(null)}>পরে</button>
        </div>
      </div>
    );
  }
  return null;
}
