'use client';

import Link from 'next/link';
import { CourseCard } from '@/components/CourseCard';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { plural } from '@/lib/format';
import { batchLine, myPrograms, programName } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 16 };

/** What the student is enrolled in: each diploma semester with its subjects, then the single courses. */
export default function MyCoursesPage() {
  const { s } = useStore();
  const mine = myPrograms(s);
  const semesters = mine.filter((m) => m.program.kind === 'diploma');
  const singles = mine.filter((m) => m.program.kind === 'single').flatMap((m) => m.courses);

  return (
    <Shell role="student" title="My Courses">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHead title="My Courses" sub="যে কোর্সগুলোতে ভর্তি আছ। যেখানে থেমেছিলে, সেখান থেকেই শুরু করতে পারো।"
          action={<Link href="/explore" className="btn btn-sm"><Icon name="explore" size={18} />Explore Courses</Link>} />
        {semesters.map((m) => (
          <section key={m.program.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h2 className="sec-h" style={{ margin: 0 }}>{programName(s, m.program)}</h2>
              <div style={{ marginTop: 2, fontSize: 13, color: 'var(--ink-3)' }}>{(m.batch ? batchLine(m.batch) + ' · ' : '') + plural(m.courses.length, 'subject')}</div>
            </div>
            <div style={GRID}>{m.courses.map((c) => <CourseCard key={c.id} id={c.id} grouped />)}</div>
          </section>
        ))}
        {singles.length ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {semesters.length ? <h2 className="sec-h" style={{ margin: 0 }}>Skill Courses</h2> : null}
            <div style={GRID}>{singles.map((c) => <CourseCard key={c.id} id={c.id} />)}</div>
          </section>
        ) : null}
        {mine.length ? null : <div className="fine">এখনো কোনো কোর্সে ভর্তি হওনি। Explore Courses থেকে একটা বেছে নাও।</div>}
      </div>
    </Shell>
  );
}
