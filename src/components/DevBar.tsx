'use client';

import type { Health, SignedIn } from '@contract';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiFailure } from '@/lib/api/client';
import { deviceId, homeOf } from '@/lib/api/session';
import { editorHref } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/*
 * A strip for development only (styled after the prototype's top bar): sign in as one of the demo accounts
 * without typing its password, and jump to any screen. The API has the matching route only outside production.
 * Hide it with NEXT_PUBLIC_DEV_BAR=0.
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
  const router = useRouter();
  const { me, signedIn, numerals, setNumerals } = useStore();
  const [note, setNote] = useState('');
  // Who is signed in, in the bar's words. Nobody while signed out.
  const role: Role | null = !me ? null : me.kind === 'staff' ? 'admin' : me.kind;
  const here = screenOf(path);
  const jumps = role ? JUMPS[role] : [];

  /** Become a demo account. The password is skipped; everything after that is the real thing. */
  const become = async (as: Role) => {
    setNote('');
    try {
      const { user } = await api<SignedIn>('/auth/dev', { body: { as, device: deviceId() } });
      signedIn(user);
      router.push(homeOf(user.kind));
    } catch (e) {
      const code = e instanceof ApiFailure ? e.code : '';
      setNote(code === 'no_demo_account' ? 'no demo data · npm --prefix server run db:reset' : code === 'no_route' ? 'this API has no demo sign-in' : 'demo sign-in failed · is the API running?');
    }
  };
  // Whether the API answers and can reach its database. Screens move to it one by one; until then they run on seed data.
  const health = useQuery({ queryKey: ['health'], queryFn: () => api<Health>('/health'), retry: false, refetchInterval: 30_000 });
  const apiUp = !!health.data && health.data.db;

  return (
    <div className="devbar" data-print="hide" role="navigation" aria-label="Prototype navigation">
      <div className="devbar-tag">school of genz · dev</div>
      <div className="devbar-api" title={apiUp ? 'The API answers and its database is connected' : health.isPending ? 'Checking the API' : 'The API is not answering. Start it with npm run dev.'} data-state={apiUp ? 'up' : health.isPending ? 'wait' : 'down'}>
        api {apiUp ? 'up' : health.isPending ? '…' : 'down'}
      </div>
      {note ? <div className="devbar-api" data-state="down">{note}</div> : null}
      <div className="dseg" style={{ marginLeft: 'auto' }}>
        {(['student', 'teacher', 'admin'] as Role[]).map((r) => (
          <button key={r} aria-pressed={role === r} onClick={() => become(r)} title={'Sign in as the demo ' + r + (role === r && me ? ' (now: ' + me.name + ')' : '')}>{r}</button>
        ))}
      </div>
      <div className="dseg">
        <button aria-pressed={numerals === 'bn'} onClick={() => setNumerals('bn')} title="বাংলা সংখ্যা">১২৩</button>
        <button aria-pressed={numerals === 'latin'} onClick={() => setNumerals('latin')} title="Latin numerals">123</button>
      </div>
      {jumps.length ? (
        <div className="djumps">
          {jumps.map(([label, href]) => (
            <Link key={label} href={href} aria-current={here === label ? 'page' : undefined}>{label}</Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
