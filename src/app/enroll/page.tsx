'use client';

import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { newCourse, newCourseOutcomes } from '@/lib/data';
import { taka } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function EnrollPage() {
  const { s, numerals } = useStore();
  const submitted = s.payment.status !== 'none';

  return (
    <Shell role="student" title="Enroll" back="/">
      <div className="ph" style={{ height: 'var(--cover-h)', borderRadius: 4, marginBottom: 20 }}>course cover</div>
      <div className="kicker">{newCourse.kicker}</div>
      <h1 className="h1" style={{ margin: '2px 0 10px' }}>{newCourse.title}</h1>
      <div className="t13 ink2" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 28 }}>
        <span>{newCourse.instructor}</span>
        <span className="ink3">·</span>
        <span>{newCourse.meta}</span>
      </div>
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="t13 ink3">Course Fee</div>
          <div className="h2" style={{ lineHeight: 1.35 }}>{taka(newCourse.price, numerals)}</div>
          <div className="t13 ink3">একবারই · Lifetime Access</div>
        </div>
        <Link href={submitted ? '/enroll/pending' : '/enroll/pay'} className="btn btn-primary ml-auto" style={{ padding: '0 24px' }}>
          {submitted ? 'Status' : 'Enroll'}
        </Link>
      </div>
      <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>bKash বা Nagad-এ টাকা পাঠিয়ে TrxID জমা দিলেই হবে। অনুমোদন হলে SMS পাবে — সাধারণত ২-৪ ঘণ্টা লাগে।</div>

      <div className="section-label">কোর্স শেষে তুমি পারবে</div>
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {newCourseOutcomes.map((o) => (
          <div key={o} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className="ink3" style={{ width: 16, flexShrink: 0, textAlign: 'center', fontSize: 14, lineHeight: 1.7 }}>–</span>
            <span className="grow t15" style={{ lineHeight: 1.7 }}>{o}</span>
          </div>
        ))}
      </div>
      <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>চাকরির নিশ্চয়তা বা বেতনের প্রতিশ্রুতি আমরা দিই না। কোর্স শেষে কী কী করতে পারবে, সেটাই উপরে লেখা।</div>
    </Shell>
  );
}
