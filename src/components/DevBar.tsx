'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { editorHref } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/*
 * There is no auth yet, so this strip (styled after the prototype's top bar) is how you reach
 * every role and screen. Hide it with NEXT_PUBLIC_DEV_BAR=0; remove it once real sign-in exists.
 */

type Role = 'student' | 'teacher' | 'admin';

const JUMPS: Record<Role, [string, string][]> = {
  student: [
    ['dashboard', '/'], ['course', '/course/cst'], ['lesson', '/learn/cst/2/4'], ['test', '/test/cst/1'], ['result', '/test/cst/0/result'],
    ['board', '/leaderboard'], ['cert', '/certificate'], ['enroll', '/enroll'], ['profile', '/profile'], ['setup', '/setup'],
  ],
  teacher: [
    ['class', '/teacher'], ['doubts', '/teacher/doubts'], ['content', '/teacher/content'],
    ['editor', editorHref('cst|lesson:2:4')], ['profile', '/teacher/profile'],
  ],
  admin: [],
};

/** Which jump a path belongs to. */
function screenOf(p: string): string {
  if (p.startsWith('/teacher')) {
    if (p.startsWith('/teacher/doubts')) return 'doubts';
    if (p.startsWith('/teacher/content/')) return 'editor';
    if (p.startsWith('/teacher/content')) return 'content';
    if (p.startsWith('/teacher/profile')) return 'profile';
    return 'class';
  }
  if (p === '/') return 'dashboard';
  if (p.startsWith('/course')) return 'course';
  if (p.startsWith('/learn')) return 'lesson';
  if (p.startsWith('/test')) return p.endsWith('/result') ? 'result' : 'test';
  if (p.startsWith('/leaderboard')) return 'board';
  if (p.startsWith('/certificate')) return 'cert';
  if (p.startsWith('/enroll')) return 'enroll';
  if (p.startsWith('/profile')) return 'profile';
  if (p.startsWith('/setup')) return 'setup';
  return '';
}

export function DevBar() {
  const path = usePathname();
  const { set, numerals } = useStore();
  const role: Role = path.startsWith('/teacher') ? 'teacher' : path.startsWith('/admin') ? 'admin' : 'student';
  const here = screenOf(path);
  const setNumerals = (v: 'bn' | 'latin') => set((x) => ({ ...x, prefs: { ...x.prefs, numerals: v } }));

  return (
    <div className="devbar" data-print="hide" role="navigation" aria-label="Prototype navigation">
      <div className="devbar-tag">school of genz · dev</div>
      <div className="dseg" style={{ marginLeft: 'auto' }}>
        {([['student', '/'], ['teacher', '/teacher'], ['admin', '/admin']] as [Role, string][]).map(([r, href]) => (
          <Link key={r} href={href} aria-current={role === r ? 'true' : undefined}>{r}</Link>
        ))}
      </div>
      <div className="dseg">
        <button aria-pressed={numerals === 'bn'} onClick={() => setNumerals('bn')} title="বাংলা সংখ্যা">১২৩</button>
        <button aria-pressed={numerals === 'latin'} onClick={() => setNumerals('latin')} title="Latin numerals">123</button>
      </div>
      {JUMPS[role].length ? (
        <div className="djumps">
          {JUMPS[role].map(([label, href]) => (
            <Link key={label} href={href} aria-current={here === label ? 'page' : undefined}>{label}</Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
