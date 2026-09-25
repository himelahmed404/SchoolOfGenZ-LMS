'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { defaultStudent, teacher } from '@/lib/data';
import { counts, studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Penguin } from './Penguin';

type Role = 'student' | 'teacher';

const NAV: Record<Role, { label: string; short: string; href: string; match: (p: string) => boolean }[]> = {
  student: [
    { label: 'Home', short: 'Ho', href: '/', match: (p) => p === '/' },
    { label: 'My Courses', short: 'Co', href: '/course/cst', match: (p) => p.startsWith('/course') || p.startsWith('/learn') },
    { label: 'Test', short: 'Te', href: '/test', match: (p) => p.startsWith('/test') },
    { label: 'Leaderboard', short: 'Lb', href: '/leaderboard', match: (p) => p.startsWith('/leaderboard') },
    { label: 'Profile', short: 'Pr', href: '/setup', match: (p) => p.startsWith('/setup') },
  ],
  teacher: [
    { label: 'Class', short: 'Cl', href: '/teacher', match: (p) => p === '/teacher' },
    { label: 'Doubts', short: 'Db', href: '/teacher/doubts', match: (p) => p.startsWith('/teacher/doubts') },
    { label: 'Content', short: 'Ct', href: '/teacher/content', match: (p) => p.startsWith('/teacher/content') },
  ],
};

interface ShellProps {
  role: Role;
  /** Mobile topbar title. */
  title: string;
  /** Mobile back target; omit on top-level screens. */
  back?: string;
  /** Lesson screen: hides tab bar on mobile, shows `lessonBar` instead. */
  lessonMode?: boolean;
  lessonBar?: ReactNode;
  noTabs?: boolean;
  topAction?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}

export function Shell({ role, title, back, lessonMode, lessonBar, noTabs, topAction, aside, children }: ShellProps) {
  const { s, ready, theme, set } = useStore();
  const path = usePathname();
  const router = useRouter();
  if (!ready) return <div className="shell" />;

  const pct = role === 'student' ? counts(s, s.last.courseId).pct : 0;
  const nav = NAV[role];
  const footName = role === 'teacher' ? teacher.name : studentName(s);
  const footSub = role === 'teacher' ? teacher.batch : defaultStudent.masked;
  const toggleTheme = () => set((x) => ({ ...x, prefs: { ...x.prefs, theme: theme === 'dark' ? 'light' : 'dark' } }));

  return (
    <div className={'shell' + (lessonMode ? ' lesson-mode' : '') + (noTabs ? ' no-tabs' : '')}>
      <aside className="sidebar" data-print="hide">
        <div className="brand-row">
          <div className="logo" />
          <div className="label t15 w600 nowrap">School of GenZ</div>
        </div>
        <nav className="nav" aria-label="Main">
          {nav.map((it) => (
            <Link key={it.label} href={it.href} aria-current={it.match(path) ? 'page' : undefined} title={it.label}>
              <span className="dot" />
              <span className="label">{it.label}</span>
              <span className="short">{it.short}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <Penguin size={34} label="png" />
          <div className="who grow">
            <div className="t13 w500 ellipsis">{footName}</div>
            <div className="mono t12 ink3" style={{ fontSize: 11 }}>{footSub}</div>
          </div>
          <button className="who btn-quiet" onClick={toggleTheme} aria-label="থিম বদলাও" title="Light / Dark"
            style={{ width: 32, height: 32, border: 'none', background: 'none', fontSize: 14 }}>{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar" data-print="hide">
          <div className="topbar-row">
            {back ? <button className="back-btn" onClick={() => router.push(back)} aria-label="ফিরে যাও">←</button> : null}
            <div className="topbar-title">{title}</div>
            {topAction}
          </div>
          <div className="bar"><span style={{ width: pct + '%' }} /></div>
        </header>

        <main className="main">
          <div className="page-wrap">
            <div className="col">
              {role === 'student' ? (
                <div className="margin-line" data-print="hide" aria-hidden><span style={{ height: pct + '%' }} /></div>
              ) : null}
              {children}
            </div>
            {aside}
          </div>
        </main>

        <nav className="tabbar" data-print="hide" aria-label="Main">
          {nav.map((it) => (
            <Link key={it.label} href={it.href} aria-current={it.match(path) ? 'page' : undefined}>
              <span className="dot" />
              {it.label}
            </Link>
          ))}
        </nav>
        {lessonMode ? <div className="lesson-bar" data-print="hide">{lessonBar}</div> : null}
      </div>
    </div>
  );
}

/** Mobile-only bottom sheet / modal scaffold. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="scrim" data-print="hide" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px 12px' }}>
          <div className="t15 w600">{title}</div>
          <button onClick={onClose} aria-label="বন্ধ করো" style={{ marginLeft: 'auto', width: 44, height: 44, border: 'none', background: 'none', fontSize: 16, color: 'var(--ink-2)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
