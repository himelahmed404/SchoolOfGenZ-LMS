'use client';

import { useRouter } from 'next/navigation';
import { courses } from '@/lib/data';
import { secs } from '@/lib/format';
import { isDone, isLocked } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';
import { Icon } from './ui';

interface Props {
  courseId: CourseId;
  open: number | null;
  onToggle: (ci: number) => void;
  /** The current lesson (being viewed, or where "resume" points). */
  current?: [number, number];
  /** `course`: chapter cards on the course page; `spine`/`sheet`: compact list beside the lesson / in the mobile sheet. */
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: big ? 10 : 2 }}>
      {course.chapters.map((ch, ci) => {
        const total = ch.lessons.length;
        const doneN = ch.lessons.filter((_, li) => isDone(s, courseId, ci, li)).length;
        const full = doneN === total, part = doneN > 0 && !full;
        const mins = Math.round(ch.lessons.reduce((a, l) => a + secs(l.d), 0) / 60);
        const isOpen = open === ci;
        const badgeBg = full ? 'var(--ok-soft)' : part ? 'var(--brand)' : 'var(--surface-sunk)';
        const badgeFg = full ? 'var(--ok)' : part ? 'var(--on-brand)' : 'var(--ink-3)';

        const lessons = isOpen ? (
          <div style={big ? { padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 2 } : { padding: '2px 0 8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ch.lessons.map((l, li) => {
              const done = isDone(s, courseId, ci, li);
              const cur = !!current && current[0] === ci && current[1] === li;
              const lock = isLocked(s, courseId, ci, li);
              const icon = done ? 'check_circle' : cur ? 'play_circle' : lock ? 'lock' : 'radio_button_unchecked';
              const iconColor = done ? 'var(--ok)' : cur ? 'var(--brand)' : 'var(--ink-3)';
              return (
                <button key={li} className="ch-row" onClick={() => go(ci, li)} disabled={lock} aria-label={lock ? l.t + ' — লক' : l.t}
                  aria-current={cur ? 'true' : undefined}
                  style={{ ['--row-bg' as string]: cur ? 'var(--brand-soft)' : 'transparent', minHeight: big || variant === 'sheet' ? (big ? 48 : 44) : 40 }}>
                  <Icon name={icon} fill={done || cur} style={{ color: iconColor }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: variant === 'spine' ? 13 : 15, lineHeight: 1.45, color: lock ? 'var(--ink-3)' : 'var(--ink)', fontWeight: cur ? 600 : 400 }}>{l.t}</span>
                  <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--ink-3)' }}>{n(l.d)}</span>
                </button>
              );
            })}
          </div>
        ) : null;

        if (big) {
          return (
            <div key={ci} className="card" style={{ borderColor: isOpen ? 'var(--line-strong)' : 'var(--line)', overflow: 'hidden' }}>
              <button onClick={() => onToggle(ci)} aria-expanded={isOpen}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'transparent', textAlign: 'left', whiteSpace: 'normal' }}>
                <span className="tile disp" style={{ width: 44, height: 44, borderRadius: 14, background: badgeBg, color: badgeFg, fontSize: 17, fontWeight: 800 }}>{ch.n}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="disp" style={{ display: 'block', fontSize: 17, lineHeight: 1.3, fontWeight: 700 }}>{ch.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ flex: 1, maxWidth: 140, height: 6, borderRadius: 999, background: 'var(--surface-sunk)' }}>
                      <span style={{ display: 'block', height: 6, borderRadius: 999, width: Math.round((doneN / total) * 100) + '%', background: full ? 'var(--ok)' : 'var(--brand)' }} />
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{n(doneN)}/{n(total)} লেসন · {n(mins)} মিনিট</span>
                  </span>
                </span>
                <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={24} style={{ color: 'var(--ink-3)' }} />
              </button>
              {lessons}
            </div>
          );
        }

        return (
          <div key={ci} style={{ marginBottom: 2 }}>
            <button className="ch-head" onClick={() => onToggle(ci)} aria-expanded={isOpen}>
              <span className="tile disp" style={{ width: 30, height: 30, borderRadius: 10, background: badgeBg, color: badgeFg, fontSize: 13, fontWeight: 800 }}>{ch.n}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.4, fontWeight: 600, color: full || part ? 'var(--ink)' : 'var(--ink-2)' }}>{ch.name}</span>
              <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={20} style={{ color: 'var(--ink-3)' }} />
            </button>
            {lessons}
          </div>
        );
      })}
    </div>
  );
}
