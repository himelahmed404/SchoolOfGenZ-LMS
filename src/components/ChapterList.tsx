'use client';

import { useRouter } from 'next/navigation';
import { courses } from '@/lib/data';
import { secs } from '@/lib/format';
import { isDone, isLocked } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

interface Props {
  courseId: CourseId;
  open: number | null;
  onToggle: (ci: number) => void;
  /** Lesson currently being viewed, if any. */
  current?: [number, number];
  variant: 'course' | 'spine' | 'sheet';
  onOpenLesson?: () => void;
}

export function ChapterList({ courseId, open, onToggle, current, variant, onOpenLesson }: Props) {
  const { s, n } = useStore();
  const router = useRouter();
  const course = courses[courseId];
  const big = variant === 'course';

  const go = (ci: number, li: number) => {
    if (isLocked(s, courseId, ci, li)) return;
    onOpenLesson?.();
    router.push(`/learn/${courseId}/${ci}/${li}`);
  };

  return (
    <>
      {course.chapters.map((ch, ci) => {
        const total = ch.lessons.length;
        const doneN = ch.lessons.filter((_, li) => isDone(s, courseId, ci, li)).length;
        const full = doneN === total, part = doneN > 0 && !full;
        const mins = Math.round(ch.lessons.reduce((a, l) => a + secs(l.d), 0) / 60);
        const isOpen = open === ci;
        const seg = <span style={{ width: 3, height: big ? 32 : 24, flexShrink: 0, background: doneN > 0 ? 'var(--brand)' : 'var(--line)', opacity: part ? 0.4 : 1 }} />;

        return (
          <div key={ci} style={big ? { borderBottom: '1px solid var(--line)' } : undefined}>
            <button onClick={() => onToggle(ci)} aria-expanded={isOpen}
              style={big
                ? { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'var(--surface)', textAlign: 'left', whiteSpace: 'normal' }
                : { width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: variant === 'sheet' ? '8px 20px' : '10px 20px', border: 'none', background: 'none', textAlign: 'left', whiteSpace: 'normal' }}>
              {seg}
              <span className="mono ink3" style={{ fontSize: big ? 13 : 12, flexShrink: 0 }}>{ch.n}</span>
              {big ? (
                <>
                  <span className="grow t17 w600" style={{ lineHeight: 1.5 }}>{ch.name}</span>
                  <span className="t12 ink3 nowrap">{n(total)} লেসন · {n(mins)} মিনিট</span>
                </>
              ) : (
                <>
                  <span className="grow w500" style={{ fontSize: variant === 'sheet' ? 15 : 13, color: full || part ? 'var(--ink)' : 'var(--ink-2)' }}>{ch.name}</span>
                  <span className="t12" style={{ color: 'var(--brand)' }}>{full ? '✓' : part ? '●' : ''}</span>
                </>
              )}
            </button>
            {isOpen ? (
              <div style={big ? { padding: '0 16px 8px 48px', display: 'flex', flexDirection: 'column' } : { padding: '0 20px 8px 38px' }}>
                {ch.lessons.map((l, li) => {
                  const done = isDone(s, courseId, ci, li);
                  const cur = !!current && current[0] === ci && current[1] === li;
                  const lock = isLocked(s, courseId, ci, li);
                  const mark = done ? '✓' : cur ? '●' : '';
                  const markColor = done || cur ? 'var(--brand)' : 'var(--ink-3)';
                  return big ? (
                    <button key={li} onClick={() => go(ci, li)} disabled={lock} aria-label={lock ? l.t + ' — লক' : l.t}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: '8px 8px 8px 0', border: 'none', borderTop: '1px solid var(--line)', background: 'none', textAlign: 'left', whiteSpace: 'normal' }}>
                      <span className="t13" style={{ width: 18, flexShrink: 0, textAlign: 'center', color: markColor }}>{mark}</span>
                      <span className="mono t12 ink3" style={{ flexShrink: 0 }}>{l.n}</span>
                      <span className="grow t15" style={{ color: lock ? 'var(--ink-3)' : 'var(--ink)', fontWeight: cur ? 600 : 400 }}>{l.t}</span>
                      {lock ? <span className="t12 ink3" style={{ height: 22, padding: '0 8px', borderRadius: 1, background: 'var(--surface-sunk)', lineHeight: '22px' }}>লক</span> : null}
                      <span className="mono t12 ink3">{n(l.d)}</span>
                    </button>
                  ) : (
                    <button key={li} onClick={() => go(ci, li)} disabled={lock}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, padding: '6px 10px', border: 'none', borderRadius: 2, background: cur ? 'var(--brand-soft)' : 'transparent', textAlign: 'left' }}>
                      <span className="t12" style={{ width: 14, flexShrink: 0, textAlign: 'center', color: markColor }}>{mark}</span>
                      <span className="mono t12 ink3">{l.n}</span>
                      <span className="grow ellipsis" style={{ fontSize: variant === 'sheet' ? 15 : 13, color: lock ? 'var(--ink-3)' : 'var(--ink)', fontWeight: cur ? 600 : 400 }}>{l.t}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
