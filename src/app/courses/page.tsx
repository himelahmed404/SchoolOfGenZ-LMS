'use client';

import Link from 'next/link';
import { CourseCard } from '@/components/CourseCard';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { courses } from '@/lib/data';
import type { CourseId } from '@/lib/types';

/** Courses the student is enrolled in. */
export default function MyCoursesPage() {
  return (
    <Shell role="student" title="My Courses">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHead title="My Courses" sub="যে কোর্সগুলোতে ভর্তি আছ। যেখানে থেমেছিলে, সেখান থেকেই শুরু করতে পারো।"
          action={<Link href="/explore" className="btn btn-sm"><Icon name="explore" size={18} />Explore Courses</Link>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 16 }}>
          {(Object.keys(courses) as CourseId[]).map((id) => <CourseCard key={id} id={id} />)}
        </div>
      </div>
    </Shell>
  );
}
