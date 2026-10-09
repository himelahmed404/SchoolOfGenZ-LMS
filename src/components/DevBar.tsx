'use client';

import type { Health } from '@contract';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';
import { editorHref } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/*
 * There is no auth yet, so this strip (styled after the prototype's top bar) is how you reach
 * every role and screen. Hide it with NEXT_PUBLIC_DEV_BAR=0; remove it once real sign-in exists.
 */

type Role = 'student' | 'teacher' | 'admin';

const JUMPS: Record<Role, [string, string][]> = {
  student: [
    ['dashboard', '/'], ['courses', '/courses'], ['course', '/course/dsa'], ['lesson', '/learn/dsa/2/4'], ['test', '/test/dsa/1'], ['result', '/test/dsa/0/result'],
    ['explore', '/explore'], ['enroll', '/enroll'], ['board', '/leaderboard'], ['certs', '/certificates'], ['cert', '/certificate'], ['saved', '/saved'],
    ['questions', '/questions'], ['payments', '/payments'], ['help', '/help'], ['profile', '/profile'], ['setup', '/setup'],
  ],
  teacher: [
    ['class', '/teacher'], ['doubts', '/teacher/doubts'], ['content', '/teacher/content'],
    ['editor', editorHref('dsa|lesson:2:4')], ['profile', '/teacher/profile'],
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
  if (p.startsWith('/courses')) return 'courses';
  if (p.startsWith('/course')) return 'course';
  if (p.startsWith('/learn')) return 'lesson';
  if (p.startsWith('/test')) return p.endsWith('/result') ? 'result' : 'test';
  if (p.startsWith('/leaderboard')) return 'board';
  if (p.startsWith('/certificates')) return 'certs';
  if (p.startsWith('/certificate')) return 'cert';
  if (p.startsWith('/explore')) return 'explore';
  if (p.startsWith('/enroll')) return 'enroll';
  if (p.startsWith('/saved')) return 'saved';
  if (p.startsWith('/questions')) return 'questions';
  if (p.startsWith('/payments')) return 'payments';
  if (p.startsWith('/help')) return 'help';
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
  // Whether the API answers and can reach its database. Screens move to it one by one; until then they run on seed data.
  const health = useQuery({ queryKey: ['health'], queryFn: () => api<Health>('/health'), retry: false, refetchInterval: 30_000 });
  const apiUp = !!health.data && health.data.db;

  return (
    <div className="devbar" data-print="hide" role="navigation" aria-label="Prototype navigation">
      <div className="devbar-tag">school of genz · dev</div>
      <div className="devbar-api" title={apiUp ? 'The API answers and its database is connected' : health.isPending ? 'Checking the API' : 'The API is not answering. Start it with npm run dev.'} data-state={apiUp ? 'up' : health.isPending ? 'wait' : 'down'}>
        api {apiUp ? 'up' : health.isPending ? '…' : 'down'}
      </div>
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
