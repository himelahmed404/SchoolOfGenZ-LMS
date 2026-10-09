'use client';

import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { Avatar, Icon } from '@/components/ui';
import { teacher, teacherStats as T } from '@/lib/data';
import { plural, taka } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function TeacherProfilePage() {
  const { s } = useStore();
  const p = s.tProfile;

  return (
    <Shell role="teacher" title="Profile">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div className="hero" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <Avatar name={teacher.name} size={84} fontSize={40} />
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="disp" style={{ fontSize: 'var(--d2)', lineHeight: 1.25, fontWeight: 800 }}>{teacher.name}</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>{teacher.title}</div>
            <p style={{ margin: '4px 0 0', maxWidth: '60ch', fontSize: 14, lineHeight: 1.7, opacity: 0.92 }}>{p.bio}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {p.subjects.map((sub) => <span key={sub} style={{ padding: '3px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: 600 }}>{sub}</span>)}
            </div>
          </div>
          <Link href="/teacher/profile/edit" className="btn btn-white" style={{ height: 42, padding: '0 18px', fontSize: 14, gap: 8 }}><Icon name="edit" size={18} />Edit Profile</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 16, alignItems: 'start' }}>
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <h2 className="sec-h" style={{ fontSize: 18 }}>Rating</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="disp" style={{ fontSize: 52, lineHeight: 1, fontWeight: 800 }}>{T.rating}</span>
                <span style={{ display: 'flex', color: '#E0A100' }} aria-label={T.rating + ' / 5'}>
                  {['star', 'star', 'star', 'star', 'star_half'].map((st, i) => <Icon key={i} name={st} size={18} fill />)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{T.reviews} reviews</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {T.stars.map(([star, pct]) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-2)' }}>
                    <span style={{ width: 12 }}>{star}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--surface-sunk)' }}><div style={{ height: 8, borderRadius: 999, width: pct + '%', background: 'var(--sun)' }} /></div>
                    <span style={{ width: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h2 className="sec-h" style={{ fontSize: 18 }}>Payout</h2>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
                <span className="tile" style={{ width: 18, height: 18, borderRadius: 5, background: '#E2136E', color: '#FFFFFF', fontSize: 11, fontWeight: 800 }}>b</span>{T.payoutTo}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Earned this month</span>
              <span className="disp" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 800 }}>{taka(T.earned)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 14, background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Pending</div>
                <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>{taka(T.pending)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: 'var(--brand-soft)', color: 'var(--on-brand-soft)' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Next payout</div>
                <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>{T.nextPayout}</div>
              </div>
            </div>
          </section>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">Courses I Teach</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {T.courses.map((c, i) => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i === T.courses.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <span className="tile disp" style={{ width: 48, height: 48, borderRadius: 14, background: c.bg, color: '#FFFFFF', fontSize: 15, fontWeight: 800 }}>{c.code}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.batch} · {plural(c.students, 'student')}</div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}><Icon name="star" size={16} fill style={{ color: '#E0A100' }} />{c.rating}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">Payout history</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {T.payouts.map(([month, amount, trx], i) => (
              <div key={trx} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '12px 16px', borderBottom: i === T.payouts.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <span className="tile" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ok-soft)', color: 'var(--ok)' }}><Icon name="payments" size={20} /></span>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{month}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{trx}</div>
                </div>
                <span className="disp" style={{ fontSize: 17, fontWeight: 800 }}>{taka(amount)}</span>
                <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--ok-soft)', color: 'var(--ok)', fontSize: 12, fontWeight: 700 }}>Paid</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
