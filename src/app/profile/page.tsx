'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Avatar, Icon } from '@/components/ui';
import { toggleBookmark } from '@/lib/actions';
import { badgeSeed, bnMonths, courses, defaultStudent, pastCertificate, semNames, streakSeed, weekDayHead } from '@/lib/data';
import { boardRows, counts, monthCells, studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

export default function ProfilePage() {
  const { s, set, n, theme, toggleTheme, setNotifOpen } = useStore();
  const router = useRouter();
  const name = studentName(s);
  const cst = counts(s, 'cst');
  const me = boardRows(s, false).find((r) => r.live);
  const today = new Date();
  const cells = monthCells(today);
  const earned = badgeSeed.filter((b) => b[3]).length;

  const stats: [string, string, string, string, string][] = [
    ['local_fire_department', n(streakSeed.current), 'দিনের স্ট্রিক', 'var(--sun)', 'var(--on-sun)'],
    ['task_alt', n(cst.done), 'লেসন শেষ', 'var(--ok-soft)', 'var(--ok)'],
    ['leaderboard', n(me ? me.rank : 0), 'ব্যাচে র‍্যাংক', 'var(--brand-soft)', 'var(--brand)'],
  ];

  const bookmarks = Object.keys(s.bookmarks).map((k) => {
    const [cid, ci, li] = k.split(':');
    const c = courses[cid as CourseId], ch = c?.chapters[+ci], l = ch?.lessons[+li];
    if (!l) return null;
    const note = (s.myNotes[k] || '').trim();
    return { k, href: `/learn/${cid}/${ci}/${li}` + (note ? '?tab=mine' : ''), kicker: cid.toUpperCase() + ' · অধ্যায় ' + ch.n + ' · লেসন ' + l.n, title: l.t, note };
  }).filter((b): b is NonNullable<typeof b> => !!b);

  return (
    <Shell role="student" title="Profile">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div className="hero" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={name} size={84} fontSize={40} />
            <span className="tile" style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 999, background: '#D23B45', color: '#FFFFFF', border: '3px solid var(--hero)' }}><Icon name="local_fire_department" size={16} fill /></span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="disp" style={{ fontSize: 'var(--d2)', lineHeight: 1.25, fontWeight: 800 }}>{name}</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>CST · {semNames[s.prefs.sem - 1]} সেমিস্টার · {s.profile.inst}</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{defaultStudent.masked} · {s.profile.email}</div>
          </div>
          <Link href="/profile/edit" className="btn btn-white" style={{ height: 42, padding: '0 18px', fontSize: 14, gap: 8 }}><Icon name="edit" size={18} />Edit Profile</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
          {stats.map(([icon, value, label, bg, fg]) => (
            <div key={label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 16 }}>
              <span className="tile" style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg }}><Icon name={icon} size={20} fill /></span>
              <span className="disp" style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>{value}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 16, alignItems: 'start' }}>
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="sec-h" style={{ fontSize: 18 }}>স্ট্রিক ক্যালেন্ডার</h2>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{bnMonths[today.getMonth()]} {n(today.getFullYear())}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
              {weekDayHead.map((h) => <span key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>{h}</span>)}
              {cells.map((c, i) => (
                <span key={i} title={c.studied ? 'পড়েছ' : undefined} className="tile"
                  style={{ aspectRatio: '1', borderRadius: 10, background: c.studied ? 'var(--hl)' : 'transparent', border: '2px solid ' + (c.today ? 'var(--brand)' : c.future ? 'var(--line)' : 'transparent'), color: c.future ? 'var(--ink-3)' : 'var(--ink)', opacity: c.other ? 0.45 : 1, fontSize: 13, fontWeight: c.today ? 800 : 600 }}>
                  {n(c.n)}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--hl)' }} />পড়েছ</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: '2px solid var(--brand)' }} />আজ</span>
              <span style={{ marginLeft: 'auto' }}>সর্বোচ্চ স্ট্রিক: {n(streakSeed.best)} দিন</span>
            </div>
          </section>

          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="sec-h" style={{ fontSize: 18 }}>ব্যাজ</h2>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{n(earned)}/{n(badgeSeed.length)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '14px 8px' }}>
              {badgeSeed.map(([icon, label, sub, got], i) => (
                <div key={label} title={sub} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                  <span className="tile" style={{ width: 54, height: 54, borderRadius: 18, background: got ? (i % 2 ? 'var(--brand-soft)' : 'var(--sun)') : 'transparent', color: got ? (i % 2 ? 'var(--brand)' : 'var(--on-sun)') : 'var(--ink-3)', border: '2px dashed ' + (got ? 'transparent' : 'var(--line-strong)'), transform: `rotate(${got ? ((i % 3) - 1) * 4 : 0}deg)` }}>
                    <Icon name={icon} size={28} fill={got} />
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1.3, fontWeight: 600, color: got ? 'var(--ink)' : 'var(--ink-3)' }}>{label}</span>
                  <span style={{ fontSize: 11, lineHeight: 1.2, color: 'var(--ink-3)' }}>{sub}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="sec-h">বুকমার্ক ও নোট</h2>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{n(bookmarks.length)}টি</span>
          </div>
          {bookmarks.length ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {bookmarks.map((b, i) => (
                <div key={b.k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i === bookmarks.length - 1 ? 'none' : '1px solid var(--line)' }}>
                  <span className="tile" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="bookmark" fill /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{b.kicker}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{b.title}</div>
                    {b.note ? (
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-read)', fontSize: 14, color: 'var(--ink-2)' }}>
                        <span style={{ background: 'linear-gradient(transparent 55%, var(--hl) 55%)', padding: '0 2px' }}>{b.note}</span>
                      </div>
                    ) : null}
                  </div>
                  <Link href={b.href} className="btn btn-sm">Open</Link>
                  <button className="icon-btn bm-x" aria-label="Remove bookmark" onClick={() => set((x) => toggleBookmark(x, b.k))} style={{ width: 36, height: 36, color: 'var(--ink-3)' }}><Icon name="close" size={18} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 20px', border: '2px dashed var(--line-strong)', borderRadius: 20, textAlign: 'center', color: 'var(--ink-2)' }}>
              <Icon name="bookmark_add" size={32} style={{ color: 'var(--ink-3)' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>এখনো কিছু সেভ করোনি</div>
              <div style={{ fontSize: 13 }}>লেসনের উপরে বুকমার্ক বাটনে চাপ দিলে এখানে চলে আসবে।</div>
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">সার্টিফিকেট</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 12 }}>
            <CertRow icon="workspace_premium" tone={['var(--sun)', 'var(--on-sun)']} title={pastCertificate.title} meta={pastCertificate.meta}
              action={<Link href="/certificate" className="btn btn-sm">View</Link>} />
            {cst.done >= cst.total ? (
              <CertRow icon="workspace_premium" tone={['var(--sun)', 'var(--on-sun)']} title="Data Structure — CST" meta="সম্পন্ন · এইমাত্র"
                action={<Link href="/certificate" className="btn btn-sm">View</Link>} />
            ) : (
              <CertRow icon="lock" tone={['var(--surface-sunk)', 'var(--ink-3)']} title="Data Structure — CST" meta={'কোর্স ' + n(cst.pct) + '% শেষ · শেষ হলে পাবে'}
                action={<button className="btn btn-sm" disabled style={{ color: 'var(--ink-3)' }}>Locked</button>} />
            )}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">সেটিংস</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <button className="set-row" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'}>
              <span className="tile set-ico"><Icon name="dark_mode" /></span>
              <span style={{ flex: 1 }}>ডার্ক মোড</span>
              <span style={{ width: 46, height: 28, padding: 3, borderRadius: 999, background: theme === 'dark' ? 'var(--brand)' : 'var(--line-strong)', display: 'flex', justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start', transition: 'background 160ms' }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
              </span>
            </button>
            <Link href="/profile/edit#password" className="set-row">
              <span className="tile set-ico"><Icon name="key" /></span>
              <span style={{ flex: 1 }}>পাসওয়ার্ড বদলাও</span><Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} />
            </Link>
            <button className="set-row" onClick={() => setNotifOpen(true)}>
              <span className="tile set-ico"><Icon name="notifications" /></span>
              <span style={{ flex: 1 }}>নোটিফিকেশন</span><Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} />
            </button>
            {/* No auth yet: "log out" returns to first-run setup, as in the prototype. */}
            <button className="set-row set-danger" onClick={() => router.push('/setup')}>
              <span className="tile set-ico"><Icon name="logout" /></span>
              <span style={{ flex: 1 }}>লগ আউট</span>
            </button>
          </div>
        </section>
      </div>
    </Shell>
  );
}

function CertRow({ icon, tone, title, meta, action }: { icon: string; tone: [string, string]; title: string; meta: string; action: React.ReactNode }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <span className="tile" style={{ width: 48, height: 48, borderRadius: 14, background: tone[0], color: tone[1] }}><Icon name={icon} size={26} fill /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meta}</div>
      </div>
      {action}
    </div>
  );
}
