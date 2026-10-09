'use client';

import Link from 'next/link';
import { toggleBookmark } from '@/lib/actions';
import type { SavedItem } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Icon } from './ui';

/** Bookmarked lessons and lessons with a private note. A note-only row has no remove button: the note lives in the lesson. */
export function SavedList({ items }: { items: SavedItem[] }) {
  const { set } = useStore();

  if (!items.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 20px', border: '2px dashed var(--line-strong)', borderRadius: 20, textAlign: 'center', color: 'var(--ink-2)' }}>
        <Icon name="bookmark_add" size={32} style={{ color: 'var(--ink-3)' }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>এখনো কিছু সেভ করোনি</div>
        <div style={{ fontSize: 13 }}>লেসনের উপরে বুকমার্ক বাটনে চাপ দিলে, বা “My Note” ট্যাবে কিছু লিখলে এখানে চলে আসবে।</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {items.map((b, i) => (
        <div key={b.k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line)' }}>
          <span className="tile" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--brand-soft)', color: 'var(--on-brand-soft)' }}><Icon name={b.bookmarked ? 'bookmark' : 'edit_note'} fill={b.bookmarked} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{b.ref}</div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{b.title}</div>
            {b.note ? (
              <div style={{ marginTop: 4, fontFamily: 'var(--font-read)', fontSize: 14, color: 'var(--ink-2)' }}>
                <span style={{ background: 'linear-gradient(transparent 55%, var(--hl) 55%)', padding: '0 2px' }}>{b.note}</span>
              </div>
            ) : null}
          </div>
          <Link href={b.href} className="btn btn-sm">Open</Link>
          {b.bookmarked ? (
            <button className="icon-btn bm-x" aria-label="Remove bookmark" onClick={() => set((x) => toggleBookmark(x, b.k))} style={{ width: 36, height: 36, color: 'var(--ink-3)' }}><Icon name="close" size={18} /></button>
          ) : <span style={{ width: 36, flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}
