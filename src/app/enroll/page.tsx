'use client';

import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { newCourse, newCourseOutcomes } from '@/lib/data';
import { plural, taka } from '@/lib/format';
import { batchLabel } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function EnrollPage() {
  const { s, n } = useStore();
  const submitted = s.payment.status !== 'none';

  return (
    <Shell role="student" title="Enroll" back="/">
      <div className="mono tile" style={{ height: 'var(--cover-h)', background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 20, fontSize: 11, color: 'var(--ink-2)', marginBottom: 20 }}>course cover</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Skill course · {batchLabel(newCourse.batchNo)}</div>
      <h1 className="d1" style={{ margin: '2px 0 10px' }}>{newCourse.title}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: 'var(--ink-2)', marginBottom: 28 }}>
        <span>{newCourse.instructor}</span>
        <span style={{ color: 'var(--ink-3)' }}>·</span>
        <span>{plural(newCourse.lessons, 'lesson')} · {plural(newCourse.weeks, 'week')} · {newCourse.livePerWeek} live {newCourse.livePerWeek === 1 ? 'class' : 'classes'} a week</span>
      </div>
      <div className="card" style={{ padding: 'var(--card-pad)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Course Fee</div>
          <div style={{ fontSize: 'var(--d2)', fontWeight: 600, lineHeight: 1.35 }}>{taka(newCourse.price)}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>One-time · Lifetime access</div>
        </div>
        <Link href={submitted ? '/enroll/pending' : '/enroll/pay'} className="btn btn-primary" style={{ marginLeft: 'auto', padding: '0 24px', fontWeight: 500 }}>
          {submitted ? 'Status' : 'Enroll'}
        </Link>
      </div>
      <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>bKash বা Nagad-এ টাকা পাঠিয়ে TrxID জমা দিলেই হবে। অনুমোদন হলে SMS পাবে — সাধারণত {n('2-4')} ঘণ্টা লাগে।</div>

      <h2 className="sec-h" style={{ margin: '36px 0 12px' }}>What You Will Learn</h2>
      <div className="card" style={{ padding: 'var(--card-pad)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {newCourseOutcomes.map((o) => (
          <div key={o} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 16, flexShrink: 0, textAlign: 'center', fontSize: 14, lineHeight: 1.7, color: 'var(--ink-3)' }}>–</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.7 }}>{o}</span>
          </div>
        ))}
      </div>
      <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>চাকরির নিশ্চয়তা বা বেতনের প্রতিশ্রুতি আমরা দিই না। কোর্স শেষে কী কী করতে পারবে, সেটাই উপরে লেখা।</div>
    </Shell>
  );
}
