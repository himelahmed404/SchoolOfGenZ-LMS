'use client';

import Link from 'next/link';
import { courseCover, courses } from '@/lib/data';
import { counts, courseKicker, courseMeta, frontier, lessonRef } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

/** An enrolled course: cover, details line, progress and where the student resumes. */
export function CourseCard({ id }: { id: CourseId }) {
  const { s } = useStore();
  const c = courses[id], cnt = counts(s, id), cv = courseCover[id];
  const f = frontier(s, id);
  const done = cnt.done >= cnt.total;

  return (
    <Link href={`/course/${id}`} className="card tap lift-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 96, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: `repeating-linear-gradient(180deg, transparent 0 31px, rgba(255,255,255,0.12) 31px 32px), ${cv.bg}`, color: '#FFFFFF' }}>
        <span className="disp" style={{ fontSize: 44, lineHeight: 0.9, fontWeight: 800 }}>{c.code}</span>
        <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700 }}>{cnt.pct}%</span>
      </div>
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, width: '100%' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{courseKicker(c)}</div>
        <div className="disp" style={{ fontSize: 19, lineHeight: 1.3, fontWeight: 700 }}>{c.title}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>{courseMeta(c)}</div>
        <div style={{ marginTop: 'auto', height: 8, borderRadius: 999, background: 'var(--surface-sunk)' }}>
          <div style={{ height: 8, borderRadius: 999, width: cnt.pct + '%', background: cv.bar }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
          <span>{cnt.done}/{cnt.total} lessons</span>
          <span style={{ fontWeight: 600, color: done ? 'var(--ok)' : 'var(--ink-2)' }}>{done ? 'Completed' : 'Next · ' + lessonRef(f[0], f[1])}</span>
        </div>
      </div>
    </Link>
  );
}
