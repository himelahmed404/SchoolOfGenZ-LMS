'use client';

import { useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { SavedList } from '@/components/SavedList';
import { Shell } from '@/components/Shell';
import { savedItems } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

/** Bookmarked lessons and private notes, with a filter by course. */
export default function SavedPage() {
  const { s } = useStore();
  const [only, setOnly] = useState<CourseId | 'all'>('all');
  const all = savedItems(s);
  const ids = Object.keys(s.catalog.courses).filter((id) => all.some((x) => x.cid === id));
  const items = only === 'all' ? all : all.filter((x) => x.cid === only);

  return (
    <Shell role="student" title="Saved & Notes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead title="Saved & Notes" sub="যে লেসনগুলো বুকমার্ক করেছ, আর যেগুলোতে নিজের নোট লিখেছ।"
          action={ids.length > 1 ? (
            <div className="seg" role="group" aria-label="Course">
              <button aria-pressed={only === 'all'} onClick={() => setOnly('all')}>All {all.length}</button>
              {ids.map((id) => (
                <button key={id} aria-pressed={only === id} onClick={() => setOnly(id)}>{s.catalog.courses[id].code} {all.filter((x) => x.cid === id).length}</button>
              ))}
            </div>
          ) : null} />
        <SavedList items={items} />
      </div>
    </Shell>
  );
}
