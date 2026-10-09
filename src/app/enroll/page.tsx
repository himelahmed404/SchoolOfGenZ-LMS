'use client';

import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { chooseProgram } from '@/lib/actions';
import { programOutcomes } from '@/lib/data';
import { taka } from '@/lib/format';
import { offers, offerView, payingOffer, subjectMeta } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** The program picked in Explore: a diploma batch with its subjects, or a single course with what it teaches. */
export default function EnrollPage() {
  const { s, set, n } = useStore();
  const o = payingOffer(s) || offers(s)[0];

  if (!o) {
    return (
      <Shell role="student" title="Enroll" back="/">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 24px', textAlign: 'center' }}>
          <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>এখন নতুন কোনো কোর্সে ভর্তি চলছে না</div>
          <Link href="/courses" className="btn btn-primary">My Courses</Link>
        </div>
      </Shell>
    );
  }

  const v = offerView(s, o), diploma = o.program.kind === 'diploma';
  const submitted = s.payment.status !== 'none' && s.payment.program === o.program.id;
  const subjects = o.program.courses.map((id) => s.catalog.courses[id]).filter(Boolean);
  const outcomes = programOutcomes[o.program.id] || [];

  return (
    <Shell role="student" title="Enroll" back="/explore">
      <div className="mono tile" style={{ height: 'var(--cover-h)', background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 20, fontSize: 11, color: 'var(--ink-2)', marginBottom: 20 }}>course cover</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{v.kicker}</div>
      <h1 className="d1" style={{ margin: '2px 0 10px' }}>{v.title}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: 'var(--ink-2)', marginBottom: 28 }}>
        {v.who ? <span>{v.who}</span> : null}
        {v.who ? <span style={{ color: 'var(--ink-3)' }}>·</span> : null}
        <span>{v.facts}</span>
      </div>
      <div className="card" style={{ padding: 'var(--card-pad)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{diploma ? 'Semester Fee' : 'Course Fee'}</div>
          <div style={{ fontSize: 'var(--d2)', fontWeight: 600, lineHeight: 1.35 }}>{taka(v.price)}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{v.terms}</div>
        </div>
        <Link href={submitted ? '/enroll/pending' : '/enroll/pay'} onClick={() => set((x) => chooseProgram(x, o.program.id))} className="btn btn-primary" style={{ marginLeft: 'auto', padding: '0 24px', fontWeight: 500 }}>
          {submitted ? 'Status' : 'Enroll'}
        </Link>
      </div>
      <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>bKash বা Nagad-এ টাকা পাঠিয়ে TrxID জমা দিলেই হবে। অনুমোদন হলে SMS পাবে — সাধারণত {n('2-4')} ঘণ্টা লাগে।</div>

      {diploma ? (
        <>
          <h2 className="sec-h" style={{ margin: '36px 0 12px' }}>Subjects</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {subjects.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: i === subjects.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <span style={{ flex: 1, minWidth: 180, fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>{c.title}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{subjectMeta(c)}</span>
              </div>
            ))}
          </div>
          <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>একবার ভর্তি হলেই সেমিস্টারের সব বিষয় খুলে যাবে।</div>
        </>
      ) : null}

      {!diploma && outcomes.length ? (
        <>
          <h2 className="sec-h" style={{ margin: '36px 0 12px' }}>What You Will Learn</h2>
          <div className="card" style={{ padding: 'var(--card-pad)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {outcomes.map((t) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 16, flexShrink: 0, textAlign: 'center', fontSize: 14, lineHeight: 1.7, color: 'var(--ink-3)' }}>–</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.7 }}>{t}</span>
              </div>
            ))}
          </div>
          <div className="fine" style={{ marginTop: 14, maxWidth: '52ch' }}>চাকরির নিশ্চয়তা বা বেতনের প্রতিশ্রুতি আমরা দিই না। কোর্স শেষে কী কী করতে পারবে, সেটাই উপরে লেখা।</div>
        </>
      ) : null}
    </Shell>
  );
}
