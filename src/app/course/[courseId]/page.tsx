'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { ChapterList } from '@/components/ChapterList';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { courseCover, courses, outcomeSets } from '@/lib/data';
import { pad2, plural } from '@/lib/format';
import { chapterDone, counts, courseKicker, courseMeta, lessonRef, resumePoint } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { s } = useStore();
  const valid = courseId in courses;
  const cid = (valid ? courseId : 'cst') as CourseId;
  // The resume lesson's chapter opens first; for other courses, the first unfinished chapter.
  const current: [number, number] | undefined = s.last.courseId === cid ? [s.last.ch, s.last.li] : undefined;
  const resume = resumePoint(s, cid);
  const [open, setOpen] = useState<number | null>(() => resume[0]);
  if (!valid) notFound();

  const course = courses[cid];
  const cnt = counts(s, cid);

  return (
    <Shell role="student" title={course.title} back="/">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div className="hero" style={{ ['--hero-bg' as string]: courseCover[cid].bg, color: '#FFFFFF', display: 'grid', gridTemplateColumns: 'var(--course-hero-cols)', gap: 20, alignItems: 'center' }}>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{courseKicker(course)}</div>
            <h1 className="d1">{course.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, opacity: 0.9 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="person" size={18} />{course.instructor}</span>
              <span>{courseMeta(course)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>
                <div style={{ height: 8, borderRadius: 999, width: cnt.pct + '%', background: 'var(--sun)', transition: 'width 400ms var(--ease)' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{cnt.pct}% complete · {cnt.done} of {plural(cnt.total, 'lesson')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px 14px', flexWrap: 'wrap', marginTop: 12 }}>
              <Link href={`/learn/${cid}/${resume[0]}/${resume[1]}`} className="btn btn-white" style={{ padding: '0 22px', gap: 8 }}>
                {cnt.done === 0 ? 'Start' : cnt.done >= cnt.total ? 'Review' : 'Continue'}<Icon name="arrow_forward" size={20} />
              </Link>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{lessonRef(resume[0], resume[1])}</span>
            </div>
          </div>
          <div className="only-desktop mono tile" style={{ aspectRatio: '4/3', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.45)', background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 8px, rgba(255,255,255,0.03) 8px 16px)', fontSize: 11 }}>course cover</div>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="sec-h">What You Will Learn</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 8 }}>
            {outcomeSets[cid].map((o, i) => {
              const chap = course.chapters[o.ch];
              const done = !!chap && chapterDone(s, cid, o.ch);
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 10 }}>
                  {/* Not a choice: a reached outcome gets a check, the rest a plain dot. */}
                  {done
                    ? <Icon name="check_circle" fill style={{ color: 'var(--ok)', marginTop: 2 }} />
                    : <span aria-hidden style={{ width: 22, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--line-strong)' }} /></span>}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.6, color: done ? 'var(--ink)' : 'var(--ink-2)' }}>{o.t}</span>
                  {chap ? <span style={{ flexShrink: 0, padding: '1px 9px', borderRadius: 999, background: 'var(--surface-sunk)', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Chapter {pad2(o.ch + 1)}</span> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="sec-h">Chapters</h2>
          <ChapterList variant="course" courseId={cid} open={open} current={current} onToggle={(ci) => setOpen(open === ci ? null : ci)} />
        </section>
      </div>
    </Shell>
  );
}
