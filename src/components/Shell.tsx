'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { defaultStudent, teacher } from '@/lib/data';
import { counts, studentName, unreadCount, type AppRole } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Notifications } from './Notifications';
import { ThemeToggle } from './ThemeToggle';
import { Avatar, Icon } from './ui';

interface NavItem {
  label: string; icon: string; href: string; match: (p: string) => boolean;
  /** Short label for the phone tab bar. Items without one are reached through "More". */
  tab?: string;
}
interface NavGroup { label: string; items: NavItem[] }

const under = (...roots: string[]) => (p: string) => roots.some((r) => p === r || p.startsWith(r + '/'));

const NAV: Record<AppRole, NavGroup[]> = {
  student: [
    { label: 'Learn', items: [
      { label: 'Home', icon: 'home', href: '/', match: (p) => p === '/', tab: 'Home' },
      { label: 'My Courses', icon: 'menu_book', href: '/courses', match: under('/courses', '/course', '/learn', '/test'), tab: 'Courses' },
      { label: 'Explore Courses', icon: 'explore', href: '/explore', match: under('/explore', '/enroll') },
    ] },
    { label: 'Progress', items: [
      { label: 'Leaderboard', icon: 'leaderboard', href: '/leaderboard', match: under('/leaderboard'), tab: 'Leaderboard' },
      { label: 'Certificates', icon: 'workspace_premium', href: '/certificates', match: under('/certificates', '/certificate') },
      { label: 'Saved & Notes', icon: 'bookmarks', href: '/saved', match: under('/saved'), tab: 'Saved' },
    ] },
    { label: 'Support', items: [
      { label: 'My Questions', icon: 'forum', href: '/questions', match: under('/questions') },
      { label: 'Payments', icon: 'receipt_long', href: '/payments', match: under('/payments') },
      { label: 'Help', icon: 'help', href: '/help', match: under('/help') },
    ] },
  ],
  teacher: [
    { label: '', items: [
      { label: 'Class', icon: 'groups', href: '/teacher', match: (p) => p === '/teacher', tab: 'Class' },
      { label: 'Doubts', icon: 'forum', href: '/teacher/doubts', match: under('/teacher/doubts'), tab: 'Doubts' },
      { label: 'Content', icon: 'video_library', href: '/teacher/content', match: under('/teacher/content'), tab: 'Content' },
      { label: 'Profile', icon: 'person', href: '/teacher/profile', match: under('/teacher/profile'), tab: 'Profile' },
    ] },
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
  const { s, ready, setNotifOpen } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  if (!ready) return <div className="shell" />;

  const groups = NAV[role];
  const all = groups.flatMap((g) => g.items);
  const tabs = all.filter((it) => it.tab);
  // Everything the phone tab bar has no room for, plus the profile (the sidebar reaches it through the card at the bottom).
  const profileHref = role === 'teacher' ? '/teacher/profile' : '/profile';
  const onProfile = path.startsWith(profileHref);
  const extra = all.filter((it) => !it.tab);
  const moreOn = extra.some((it) => it.match(path)) || (role === 'student' && onProfile);

  const pct = role === 'student' ? counts(s, s.last.courseId).pct : 0;
  const unread = unreadCount(s, role);
  const footName = role === 'teacher' ? teacher.name : studentName(s);
  const footSub = role === 'teacher' ? teacher.batch : defaultStudent.masked;
  const openNotif = () => setNotifOpen(true);

  return (
    <div className={'shell' + (lessonMode ? ' lesson-mode' : '') + (noTabs ? ' no-tabs' : '')}>
      <aside className="sidebar" data-print="hide">
        <div className="brand-row">
          <div className="logo-g">G</div>
          <div className="brand-name lbl">School of GenZ</div>
        </div>
        <nav className="nav" aria-label="Main">
          {groups.map((g, gi) => (
            <div key={g.label || gi} className="nav-group">
              {g.label ? <div className="nav-group-label lbl">{g.label}</div> : null}
              {g.items.map((it) => (
                <Link key={it.label} href={it.href} className="nav-item" aria-current={it.match(path) ? 'page' : undefined} title={it.label}>
                  <Icon name={it.icon} />
                  <span className="lbl">{it.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-tools">
          <button className="side-notif" onClick={openNotif} title="Notifications">
            <span style={{ position: 'relative', display: 'flex' }}>
              <Icon name="notifications" />
              {unread ? <span className="badge-dot" /> : null}
            </span>
            <span className="lbl" style={{ flex: 1 }}>Notifications</span>
            {unread ? <span className="count-pill">{unread}</span> : null}
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
          {tabs.map((it) => (
            <Link key={it.label} href={it.href} aria-current={it.match(path) ? 'page' : undefined}>
              <span className="pill"><Icon name={it.icon} /></span>
              <span className="lbl">{it.tab}</span>
            </Link>
          ))}
          {extra.length ? (
            <button onClick={() => setMore(true)} aria-current={moreOn ? 'page' : undefined} aria-haspopup="dialog">
              <span className="pill"><Icon name="menu" /></span>
              <span className="lbl">More</span>
            </button>
          ) : null}
        </nav>
        {lessonMode ? <div className="lesson-bar" data-print="hide">{lessonBar}</div> : null}
      </div>

      {more ? (
        <Sheet title="More" onClose={() => setMore(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
            <Link href={profileHref} className="nav-item" aria-current={onProfile ? 'page' : undefined} onClick={() => setMore(false)}>
              <Icon name="person" /><span>Profile</span>
            </Link>
            {extra.map((it) => (
              <Link key={it.label} href={it.href} className="nav-item" aria-current={it.match(path) ? 'page' : undefined} onClick={() => setMore(false)}>
                <Icon name={it.icon} /><span>{it.label}</span>
              </Link>
            ))}
          </div>
        </Sheet>
      ) : null}

      <Notifications role={role} />
    </div>
  );
}

/** Mobile bottom sheet (chapters, the "More" menu). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="scrim" data-print="hide" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px 12px' }}>
          <div className="t15 w600">{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', width: 44, height: 44, border: 'none', background: 'none', fontSize: 16, color: 'var(--ink-2)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
