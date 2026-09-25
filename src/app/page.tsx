'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { boardExam, courses, newCourse, testMeta } from '@/lib/data';
import { daysTo, dateLabel, ordinal, pad2, secs, taka } from '@/lib/format';
import { boardRows, counts, examISO, studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'শুভ রাত্রি';
  if (h < 12) return 'শুভ সকাল';
  if (h < 16) return 'শুভ দুপুর';
  if (h < 18) return 'শুভ বিকেল';
  if (h < 21) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

export default function Dashboard() {
  const { s, ready, n, numerals } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !s.prefs.setupDone) router.replace('/setup');
  }, [ready, s.prefs.setupDone, router]);

  const { courseId, ch, li } = s.last;
  const course = courses[courseId];
  const lesson = course.chapters[ch].lessons[li];
  const resumePct = counts(s, courseId).pct;

  const iso = examISO(s);
  const days = daysTo(iso);
  const urgent = days <= 21;

  const all = boardRows(s, false);
  const me = all.find((r) => r.live) || all[0];

  return (
    <Shell role="student" title="Home">
      <div style={{ marginBottom: 20 }}>
        <div className="t13 ink3">{greeting()}</div>
        <h1 className="h1">{studentName(s)}</h1>
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16 }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, padding: 'var(--hero-pad)', borderRadius: 4, background: 'var(--brand)', color: 'var(--on-brand)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 132, height: 84, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: 8, borderRadius: 2, background: 'color-mix(in srgb, var(--on-brand) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--on-brand) 30%, transparent)' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--brand)', background: 'var(--on-brand)', borderRadius: 1, padding: '1px 5px' }}>▶ {n(lesson.d)}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="t13 w500">আবার শুরু করো · Chapter {n(pad2(ch + 1))} · Lesson {n(pad2(li + 1))}</div>
              <div style={{ marginTop: 4, fontSize: 'var(--d2)', lineHeight: 1.4, fontWeight: 600 }}>{lesson.t}</div>
              <div className="t13" style={{ marginTop: 2 }}>{course.kicker}</div>
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'color-mix(in srgb, var(--on-brand) 28%, transparent)' }}>
              <div style={{ height: 4, borderRadius: 2, width: resumePct + '%', background: 'var(--on-brand)' }} />
            </div>
            <span className="t13 w500 nowrap">কোর্সের {n(resumePct)}% শেষ</span>
          </div>
          <div className="row wrap" style={{ gap: 16 }}>
            <Link href={`/learn/${courseId}/${ch}/${li}`} className="btn" style={{ border: 'none', background: 'var(--on-brand)', color: 'var(--brand)', padding: '0 22px', fontWeight: 600, textDecoration: 'none' }}>চালিয়ে যাও</Link>
            <span className="ml-auto t13 nowrap">{n(Math.round(secs(lesson.d) / 60))} মিনিট বাকি</span>
          </div>
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: 'var(--hero-pad)', borderRadius: 4, background: urgent ? 'var(--margin-soft)' : 'var(--warn-soft)' }}>
          <div className="t13 w500 ink2">{boardExam.name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto' }}>
            <span style={{ fontSize: 48, lineHeight: 1.15, fontWeight: 600, color: urgent ? 'var(--margin)' : 'var(--warn)' }}>{n(Math.max(0, days))}</span>
            <span className="t15 ink2">{days > 0 ? 'দিন বাকি' : days === 0 ? 'আজই পরীক্ষা' : 'শেষ হয়েছে'}</span>
          </div>
          <div className="t13 ink2">{dateLabel(iso, numerals)}</div>
        </div>
      </div>

      <div className="section-label">My Courses</div>
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>
        {(Object.keys(courses) as CourseId[]).map((id) => {
          const c = courses[id], pct = counts(s, id).pct;
          const fg = id === 'cst' ? 'var(--brand)' : 'var(--accent-2)', bg = id === 'cst' ? 'var(--brand-soft)' : 'var(--accent-2-soft)';
          return (
            <Link key={id} href={`/course/${id}`} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', color: 'var(--ink)', textDecoration: 'none' }}>
              <div className="mono" style={{ height: 88, background: bg, display: 'flex', alignItems: 'flex-end', padding: '12px 16px', fontSize: 22, fontWeight: 500, color: fg }}>{id === 'cst' ? 'CST' : 'ENG'}</div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div className="t12 ink3">{c.kicker}</div>
                <div className="t17 w600" style={{ lineHeight: 1.5 }}>{c.title}</div>
                <div className="t12 ink3" style={{ marginBottom: 8 }}>{c.meta}</div>
                <div className="row" style={{ marginTop: 'auto', gap: 10 }}>
                  <div className="bar grow"><span style={{ width: pct + '%', background: fg }} /></div>
                  <span className="t12 ink2">{n(pct)}%</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-label">New Course</div>
      <Link href="/enroll" className="card" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', color: 'var(--ink)', textDecoration: 'none' }}>
        <span className="mono t13 w500" style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 2, background: 'var(--warn-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)' }}>WEB</span>
        <span style={{ minWidth: 0 }}>
          <span className="t15 w600" style={{ display: 'block' }}>{newCourse.title}</span>
          <span className="t13 ink3" style={{ display: 'block' }}>{newCourse.kicker} · {taka(newCourse.price, numerals)}</span>
        </span>
        <span className="btn btn-sm ml-auto" style={{ flexShrink: 0, padding: '0 14px' }}>Enroll</span>
      </Link>

      <div className="section-label">This Week</div>
      <div className="stack">
        <WeekRow badge="শুক্র" tone="brand" label={testMeta.name} action={<Link href="/test" className="btn btn-sm" style={{ textDecoration: 'none', color: 'var(--ink)' }}>Start</Link>} />
        <WeekRow badge="সোম" tone="accent" label="Live Class · সন্ধ্যা ৭টা" action={<button className="btn btn-sm" disabled title="লিংক ক্লাসের আগে আসবে">Link</button>} />
        <WeekRow badge={n(me.rank)} tone="warn" big label={'ব্যাচে তোমার অবস্থান · ' + ordinal(me.rank, numerals) + ' · ' + n(all.length) + ' জনের মধ্যে'}
          action={<Link href="/leaderboard" className="btn btn-sm" style={{ textDecoration: 'none', color: 'var(--ink)' }}>View</Link>} />
      </div>
    </Shell>
  );
}

function WeekRow({ badge, tone, big, label, action }: { badge: string; tone: 'brand' | 'accent' | 'warn'; big?: boolean; label: string; action: React.ReactNode }) {
  const c = tone === 'brand' ? ['var(--brand-soft)', 'var(--brand)'] : tone === 'accent' ? ['var(--accent-2-soft)', 'var(--accent-2)'] : ['var(--warn-soft)', 'var(--warn)'];
  return (
    <div className="row wrap" style={{ padding: '14px 16px' }}>
      <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2, background: c[0], color: c[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: big ? 15 : 13, fontWeight: 600 }}>{badge}</span>
      <div className="t15">{label}</div>
      <div className="ml-auto">{action}</div>
    </div>
  );
}
