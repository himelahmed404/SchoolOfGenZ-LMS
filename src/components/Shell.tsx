'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { defaultStudent, teacher } from '@/lib/data';
import { counts, studentName, unreadCount, type AppRole } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Notifications } from './Notifications';
import { ThemeToggle } from './ThemeToggle';
import { Avatar, Icon } from './ui';

interface NavItem { label: string; icon: string; href: string; match: (p: string) => boolean }

const NAV: Record<AppRole, NavItem[]> = {
  student: [
    { label: 'Home', icon: 'home', href: '/', match: (p) => p === '/' },
    { label: 'My Courses', icon: 'menu_book', href: '/course/cst', match: (p) => p.startsWith('/course') || p.startsWith('/learn') },
    { label: 'Leaderboard', icon: 'leaderboard', href: '/leaderboard', match: (p) => p.startsWith('/leaderboard') },
    { label: 'Profile', icon: 'person', href: '/profile', match: (p) => p.startsWith('/profile') },
  ],
  teacher: [
    { label: 'Class', icon: 'groups', href: '/teacher', match: (p) => p === '/teacher' },
    { label: 'Doubts', icon: 'forum', href: '/teacher/doubts', match: (p) => p.startsWith('/teacher/doubts') },
    { label: 'Content', icon: 'video_library', href: '/teacher/content', match: (p) => p.startsWith('/teacher/content') },
    { label: 'Profile', icon: 'person', href: '/teacher/profile', match: (p) => p.startsWith('/teacher/profile') },
  ],
};

interface ShellProps {
  role: AppRole;
  /** Mobile topbar title. */
  title: string;
  /** Mobile back target; omit on top-level screens. */
  back?: string;
  /** Lesson screen: hides the tab bar on mobile, shows `lessonBar` instead. */
  lessonMode?: boolean;
  lessonBar?: ReactNode;
  noTabs?: boolean;
  /** Extra button at the right of the mobile topbar. */
  topAction?: ReactNode;
  /** Right-hand column beside the content (lesson chapter spine). */
  aside?: ReactNode;
  children: ReactNode;
}

export function Shell({ role, title, back, lessonMode, lessonBar, noTabs, topAction, aside, children }: ShellProps) {
  const { s, ready, n, setNotifOpen } = useStore();
  const path = usePathname();
  const router = useRouter();
  if (!ready) return <div className="shell" />;

  const nav = NAV[role];
  const pct = role === 'student' ? counts(s, s.last.courseId).pct : 0;
  const unread = unreadCount(s, role);
  const footName = role === 'teacher' ? teacher.name : studentName(s);
  const footSub = role === 'teacher' ? teacher.batch : defaultStudent.masked;
  const profileHref = role === 'teacher' ? '/teacher/profile' : '/profile';
  const onProfile = path.startsWith(profileHref);
  const openNotif = () => setNotifOpen(true);

  return (
    <div className={'shell' + (lessonMode ? ' lesson-mode' : '') + (noTabs ? ' no-tabs' : '')}>
      <aside className="sidebar" data-print="hide">
        <div className="brand-row">
          <div className="logo-g">G</div>
          <div className="brand-name lbl">School of GenZ</div>
        </div>
        <nav className="nav" aria-label="Main">
          {nav.map((it) => (
            <Link key={it.label} href={it.href} className="nav-item" aria-current={it.match(path) ? 'page' : undefined} title={it.label}>
              <Icon name={it.icon} />
              <span className="lbl">{it.label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-tools">
          <button className="side-notif" onClick={openNotif} title="Notifications">
            <span style={{ position: 'relative', display: 'flex' }}>
              <Icon name="notifications" />
              {unread ? <span className="badge-dot" /> : null}
            </span>
            <span className="lbl" style={{ flex: 1 }}>Notifications</span>
            {unread ? <span className="count-pill">{n(unread)}</span> : null}
          </button>
          <ThemeToggle className="icon-btn side-theme" />
        </div>
        <Link href={profileHref} className="side-foot" aria-current={onProfile ? 'page' : undefined} title="Profile">
          <Avatar name={footName} size={38} fontSize={17} />
          <div className="lbl" style={{ minWidth: 0 }}>
            <div className="t13 w500 ellipsis">{footName}</div>
            <div className="mono t11 ink3">{footSub}</div>
          </div>
        </Link>
      </aside>

      <div className="main-col">
        <header className="topbar" data-print="hide">
          <div className="topbar-row">
            {back ? (
              <button className="icon-btn" style={{ marginLeft: -10 }} onClick={() => router.push(back)} aria-label="Back">
                <Icon name="arrow_back" size={24} />
              </button>
            ) : null}
            <div className="topbar-title">{title}</div>
            <button className="icon-btn" onClick={openNotif} aria-label="Notifications">
              <Icon name="notifications" size={24} />
              {unread ? <span className="badge-dot" /> : null}
            </button>
            <ThemeToggle size={24} />
            {topAction}
          </div>
          <div className="progress4"><span style={{ width: pct + '%' }} /></div>
        </header>

        <main className="main">
          <div className="page-wrap">
            <div className="col">{children}</div>
            {aside}
          </div>
        </main>

        <nav className="tabbar" data-print="hide" aria-label="Main">
          {nav.map((it) => (
            <Link key={it.label} href={it.href} aria-current={it.match(path) ? 'page' : undefined}>
              <span className="pill"><Icon name={it.icon} /></span>
              <span className="lbl">{it.label}</span>
            </Link>
          ))}
        </nav>
        {lessonMode ? <div className="lesson-bar" data-print="hide">{lessonBar}</div> : null}
      </div>

      <Notifications role={role} />
    </div>
  );
}

/** Mobile bottom sheet (chapters). */
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
