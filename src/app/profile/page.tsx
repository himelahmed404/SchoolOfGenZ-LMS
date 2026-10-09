'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/AuthFrame';
import { CertificateList } from '@/components/Certificates';
import { SavedList } from '@/components/SavedList';
import { Shell } from '@/components/Shell';
import { Avatar, Icon } from '@/components/ui';
import { sayError } from '@/lib/api/messages';
import { badgeSeed, streakSeed, weekDayHead } from '@/lib/data';
import { maskPhone, monthEn, plural, semLabel } from '@/lib/format';
import { boardRows, counts, monthCells, myBatch, myCourses, myDiploma, savedItems, semesterOf, studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** How many saved lessons the profile shows before linking to the full list. */
const PREVIEW = 3;

export default function ProfilePage() {
  const { s, me: account, theme, toggleTheme, setNotifOpen, signOut, n } = useStore();
  const router = useRouter();
  const [outError, setOutError] = useState<string | null>(null);
  const name = studentName(s);
  // Department, semester and institute, as far as the account has them.
  const about = [myDiploma(s)?.code, semLabel(semesterOf(s)), account?.institute].filter(Boolean).join(' · ');
  const contact = [maskPhone(account?.phone || ''), account?.email].filter(Boolean).join(' · ');
  const logOut = async () => {
    setOutError(null);
    try {
      await signOut();
      router.replace('/signin');
    } catch (e) {
      setOutError(sayError(e, n));
    }
  };
  const lessonsDone = myCourses(s).reduce((a, c) => a + counts(s, c.id).done, 0);
  // Only a diploma batch has a rank.
  const batch = myBatch(s);
  const me = batch ? boardRows(s, batch.id, false).find((r) => r.live) : undefined;
  const today = new Date();
  const cells = monthCells(today);
  const earned = badgeSeed.filter((b) => b[3]).length;

  const stats: [string, string, string, string, string][] = [
    ['local_fire_department', String(streakSeed.current), 'Day streak', 'var(--sun)', 'var(--on-sun)'],
    ['task_alt', String(lessonsDone), 'Lessons done', 'var(--ok-soft)', 'var(--ok)'],
  ];
  if (me) stats.push(['leaderboard', String(me.rank), 'Batch rank', 'var(--brand-soft)', 'var(--on-brand-soft)']);

  const saved = savedItems(s);

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
            <div style={{ fontSize: 14, opacity: 0.9 }}>{about}</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{contact}</div>
          </div>
          <Link href="/profile/edit" className="btn btn-white" style={{ height: 44, padding: '0 18px', fontSize: 14, gap: 8 }}><Icon name="edit" size={18} />Edit Profile</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + stats.length + ',minmax(0,1fr))', gap: 12 }}>
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
              <h2 className="sec-h" style={{ fontSize: 18 }}>Streak Calendar</h2>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{monthEn(today)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
              {weekDayHead.map((h) => <span key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>{h}</span>)}
              {cells.map((c, i) => (
                <span key={i} title={c.studied ? 'Studied' : undefined} className="tile"
                  style={{ aspectRatio: '1', borderRadius: 10, background: c.studied ? 'var(--hl)' : 'transparent', border: '2px solid ' + (c.today ? 'var(--brand)' : c.future ? 'var(--line)' : 'transparent'), color: c.future ? 'var(--ink-3)' : 'var(--ink)', opacity: c.other ? 0.45 : 1, fontSize: 13, fontWeight: c.today ? 800 : 600 }}>
                  {c.n}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--hl)' }} />Studied</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: '2px solid var(--brand)' }} />Today</span>
              <span style={{ marginLeft: 'auto' }}>Best streak: {plural(streakSeed.best, 'day')}</span>
            </div>
          </section>

          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="sec-h" style={{ fontSize: 18 }}>Badges</h2>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{earned}/{badgeSeed.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '14px 8px' }}>
              {badgeSeed.map(([icon, label, sub, got], i) => (
                <div key={label} title={sub} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                  <span className="tile" style={{ width: 54, height: 54, borderRadius: 18, background: got ? (i % 2 ? 'var(--brand-soft)' : 'var(--sun)') : 'transparent', color: got ? (i % 2 ? 'var(--on-brand-soft)' : 'var(--on-sun)') : 'var(--ink-3)', border: '2px dashed ' + (got ? 'transparent' : 'var(--line-strong)'), transform: `rotate(${got ? ((i % 3) - 1) * 4 : 0}deg)` }}>
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
            <h2 className="sec-h">Saved &amp; Notes</h2>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{saved.length} saved</span>
            {saved.length > PREVIEW ? <Link href="/saved" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600 }}>See all<Icon name="chevron_right" size={18} /></Link> : null}
          </div>
          <SavedList items={saved.slice(0, PREVIEW)} />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">Certificates</h2>
          <CertificateList />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">Settings</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <button className="set-row" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'}>
              <span className="tile set-ico"><Icon name="dark_mode" /></span>
              <span style={{ flex: 1 }}>Dark mode</span>
              <span style={{ width: 46, height: 28, padding: 3, borderRadius: 999, background: theme === 'dark' ? 'var(--brand)' : 'var(--line-strong)', display: 'flex', justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start', transition: 'background 160ms' }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
              </span>
            </button>
            <Link href="/profile/edit#password" className="set-row">
              <span className="tile set-ico"><Icon name="key" /></span>
              <span style={{ flex: 1 }}>Change password</span><Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} />
            </Link>
            <button className="set-row" onClick={() => setNotifOpen(true)}>
              <span className="tile set-ico"><Icon name="notifications" /></span>
              <span style={{ flex: 1 }}>Notifications</span><Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} />
            </button>
            <button className="set-row set-danger" onClick={logOut}>
              <span className="tile set-ico"><Icon name="logout" /></span>
              <span style={{ flex: 1 }}>Log out</span>
            </button>
          </div>
          {outError ? <Alert>{outError}</Alert> : null}
        </section>
      </div>
    </Shell>
  );
}
