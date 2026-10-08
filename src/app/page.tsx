'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { boardExam, courses, newCourse, streakSeed, testMeta } from '@/lib/data';
import { daysTo, dateLabel, mmss, ordinal, pad2, secs, taka } from '@/lib/format';
import { boardRows, counts, examISO, studentName, weekDots } from '@/lib/selectors';
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

const COVER: Record<CourseId, { code: string; bg: string; bar: string }> = {
  cst: { code: 'CST', bg: 'var(--hero)', bar: 'var(--brand)' },
  eng: { code: 'ENG', bg: '#C2357A', bar: 'var(--accent-2)' },
};

export default function Dashboard() {
  const { s, ready, n, numerals } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !s.prefs.setupDone) router.replace('/setup');
  }, [ready, s.prefs.setupDone, router]);

  const { courseId, ch, li, t } = s.last;
  const course = courses[courseId];
  const lesson = course.chapters[ch].lessons[li];
  const lessonHref = `/learn/${courseId}/${ch}/${li}`;
  const coursePct = counts(s, courseId).pct;
  const minsLeft = Math.max(1, Math.round((secs(lesson.d) - t) / 60));

  const iso = examISO(s);
  const days = daysTo(iso);
  const urgent = days <= 21;

  const all = boardRows(s, false);
  const me = all.find((r) => r.live) || all[0];
  const dots = weekDots();

  return (
    <Shell role="student" title="Home">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>{greeting()},</div>
            <h1 className="disp" style={{ margin: '2px 0 0', fontSize: 'var(--d1)', lineHeight: 1.25, fontWeight: 800 }}>
              <span className="hl">{studentName(s)}</span>
            </h1>
          </div>
          <Link href="/profile" title="স্ট্রিক ক্যালেন্ডার দেখো" className="tap hover-line"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px 10px 10px', border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', boxShadow: 'var(--lift)' }}>
            <span className="tile" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--sun)', color: '#D23B45' }}><Icon name="local_fire_department" size={26} fill /></span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span className="disp" style={{ fontSize: 19, fontWeight: 800 }}>{n(streakSeed.current)} দিন</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>স্ট্রিক চলছে</span>
            </span>
            <span style={{ display: 'flex', gap: 5, paddingLeft: 12, borderLeft: '1px solid var(--line)' }}>
              {dots.map((w) => (
                <span key={w.d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 10, lineHeight: 1, color: 'var(--ink-3)' }}>{w.d}</span>
                  <span className="tile" style={{ width: 16, height: 16, borderRadius: 999, background: w.studied ? 'var(--sun)' : 'transparent', border: '2px solid ' + (w.today ? 'var(--brand)' : w.studied ? 'var(--sun)' : 'var(--line-strong)'), color: 'var(--on-sun)' }}>
                    <Icon name="check" size={11} style={{ fontWeight: 700, opacity: w.studied ? 1 : 0 }} />
                  </span>
                </span>
              ))}
            </span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'var(--hero-cols)', gap: 16 }}>
          <div className="hero" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <Icon name="history" size={18} />আবার শুরু করো · Chapter {n(pad2(ch + 1))} · Lesson {n(pad2(li + 1))}
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <Link href={lessonHref} aria-label="চালিয়ে যাও" className="tile"
                style={{ position: 'relative', width: 'var(--thumb-w)', aspectRatio: '16/10', borderRadius: 16, background: 'rgba(255,255,255,0.14)' }}>
                <span className="tile" style={{ width: 44, height: 44, borderRadius: 999, background: '#FFFFFF', color: 'var(--hero)' }}><Icon name="play_arrow" size={28} fill /></span>
                <span className="mono" style={{ position: 'absolute', left: 8, bottom: 8, padding: '1px 6px', borderRadius: 6, background: 'rgba(12,16,32,0.55)', color: '#FFFFFF', fontSize: 11, fontWeight: 600 }}>{n(mmss(t).replace(/^0/, ''))}</span>
              </Link>
              <div style={{ minWidth: 0 }}>
                <div className="disp" style={{ fontSize: 'var(--d2)', lineHeight: 1.3, fontWeight: 700 }}>{lesson.t}</div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>{course.kicker}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>
                <div style={{ height: 8, borderRadius: 999, width: coursePct + '%', background: 'var(--sun)' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>কোর্সের {n(coursePct)}% শেষ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link href={lessonHref} className="btn btn-white" style={{ padding: '0 22px', gap: 8 }}>চালিয়ে যাও<Icon name="arrow_forward" size={20} /></Link>
              <span style={{ marginLeft: 'auto', fontSize: 13, opacity: 0.85, whiteSpace: 'nowrap' }}>{n(minsLeft)} মিনিট বাকি</span>
            </div>
          </div>

          <div className="exam-tile" style={{ minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 12, padding: 'var(--hero-pad)', borderRadius: 24, background: urgent ? '#D23B45' : 'var(--sun)', color: urgent ? '#FFFFFF' : 'var(--on-sun)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
                <Icon name="event" size={18} /><span>{boardExam.name}</span>
              </div>
              <div style={{ marginTop: 2, fontSize: 13 }}>{dateLabel(iso, numerals)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="disp" style={{ fontSize: 'var(--exam-num)', lineHeight: 0.95, fontWeight: 800 }}>{n(Math.max(0, days))}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{days > 0 ? 'দিন বাকি' : days === 0 ? 'আজই পরীক্ষা' : 'শেষ হয়েছে'}</span>
            </div>
          </div>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">My Courses</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 16 }}>
            {(Object.keys(courses) as CourseId[]).map((id) => {
              const c = courses[id], pct = counts(s, id).pct, cv = COVER[id];
              return (
                <Link key={id} href={`/course/${id}`} className="card tap lift-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 96, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: `repeating-linear-gradient(180deg, transparent 0 31px, rgba(255,255,255,0.12) 31px 32px), ${cv.bg}`, color: '#FFFFFF' }}>
                    <span className="disp" style={{ fontSize: 44, lineHeight: 0.9, fontWeight: 800 }}>{cv.code}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700 }}>{n(pct)}%</span>
                  </div>
                  <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, width: '100%' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{c.kicker}</div>
                    <div className="disp" style={{ fontSize: 19, lineHeight: 1.3, fontWeight: 700 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>{c.meta}</div>
                    <div style={{ marginTop: 'auto', height: 8, borderRadius: 999, background: 'var(--surface-sunk)' }}>
                      <div style={{ height: 8, borderRadius: 999, width: pct + '%', background: cv.bar }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">New Course</h2>
          <Link href="/enroll" className="card tap" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px' }}>
            <span className="tile disp" style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--sun)', color: 'var(--on-sun)', fontSize: 18, fontWeight: 800 }}>WEB</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="disp" style={{ display: 'block', fontSize: 17, lineHeight: 1.3, fontWeight: 700 }}>{newCourse.title}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)' }}>{newCourse.kicker} · {taka(newCourse.price, numerals)}</span>
            </span>
            <span style={{ flexShrink: 0, height: 36, display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px', borderRadius: 999, background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 13, fontWeight: 700 }}>
              Enroll<Icon name="arrow_forward" size={18} />
            </span>
          </Link>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">This Week</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <WeekRow badge="শুক্র" tone={['var(--brand-soft)', 'var(--brand)']} title={testMeta.name} sub="১০ প্রশ্ন · ২৫ মিনিট"
              action={<Link href="/test" className="btn btn-primary btn-sm" style={{ padding: '0 16px' }}>Start</Link>} />
            <WeekRow badge="সোম" tone={['var(--accent-2-soft)', 'var(--accent-2)']} title="Live Class" sub="সন্ধ্যা ৭টা"
              action={<button className="btn btn-sm" disabled title="লিংক ক্লাসের আগে আসবে">Link</button>} />
            <WeekRow badge={n(me.rank)} big tone={['var(--sun)', 'var(--on-sun)']} title="ব্যাচে তোমার অবস্থান" sub={ordinal(me.rank, numerals) + ' · ' + n(all.length) + ' জনের মধ্যে'} last
              action={<Link href="/leaderboard" className="btn btn-sm">View</Link>} />
          </div>
        </section>
      </div>
    </Shell>
  );
}

function WeekRow({ badge, tone, big, title, sub, action, last }: { badge: string; tone: [string, string]; big?: boolean; title: string; sub: string; action: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className={'tile' + (big ? ' disp' : '')} style={{ width: 48, height: 48, borderRadius: 14, background: tone[0], color: tone[1], fontSize: big ? 20 : 14, fontWeight: big ? 800 : 700 }}>{badge}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</div>
      </div>
      {action}
    </div>
  );
}
