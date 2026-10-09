'use client';

import type { Me } from '@contract';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiFailure } from '@/lib/api/client';
import { sayError } from '@/lib/api/messages';
import { passwordRules } from '@/lib/api/session';
import { SEMESTERS, subjectOptions } from '@/lib/data';
import { ordinalEn, phoneEn } from '@/lib/format';
import { semesterOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Alert } from './AuthFrame';
import { Shell } from './Shell';
import { Avatar, Icon } from './ui';

interface StudentDraft { name: string; email: string; inst: string; sem: number }
interface TeacherDraft { bio: string; subjects: string[] }

const LABEL: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' };

/** Edit profile + change password, shared by student and teacher (fields differ by role). */
export function EditProfile({ role }: { role: 'student' | 'teacher' }) {
  const { s, me, ready } = useStore();
  // The drafts start from the account, so the form waits for it. The shell sends on anyone who is not signed in.
  return ready && me ? <EditProfileForm role={role} me={me} sem={semesterOf(s)} /> : <Shell role={role} title="Edit Profile">{null}</Shell>;
}

function EditProfileForm({ role, me, sem }: { role: 'student' | 'teacher'; me: Me; sem: number }) {
  const { saveProfile, n } = useStore();
  const router = useRouter();
  const isT = role === 'teacher';
  const back = isT ? '/teacher/profile' : '/profile';

  const [stu, setStu] = useState<StudentDraft>(() => ({ name: me.name, email: me.email || '', inst: me.institute || '', sem }));
  const [tch, setTch] = useState<TeacherDraft>(() => ({ bio: me.bio || '', subjects: me.subjects }));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash !== '#password') return;
    const t = setTimeout(() => document.getElementById('password')?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, []);

  const editS = (patch: Partial<StudentDraft>) => { setStu((d) => ({ ...d, ...patch })); setSaved(false); };
  const editT = (patch: Partial<TeacherDraft>) => { setTch((d) => ({ ...d, ...patch })); setSaved(false); };
  const save = async () => {
    if (busy) return;
    if (!isT && !stu.name.trim()) { setError('নামটা লেখো।'); return; }
    setBusy(true);
    setError(null);
    try {
      await saveProfile(isT
        ? { bio: tch.bio, subjects: tch.subjects }
        : { name: stu.name.trim(), email: stu.email.trim() || null, institute: stu.inst, semester: stu.sem });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiFailure && e.fields?.email ? 'ইমেইলটা ঠিকমতো লেখা হয়নি।' : sayError(e, n));
    }
    setBusy(false);
  };

  const name = isT ? me.name : stu.name || me.name;
  // What the person signs in with. It is not theirs to change: an admin does that.
  const signIn = isT ? me.email || '' : phoneEn(me.phone || '');
  const subjects = Array.from(new Set(subjectOptions.concat(tch.subjects)));

  return (
    <Shell role={role} title="Edit Profile" back={back}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
        <h1 className="d1 only-desktop">Edit Profile</h1>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 'var(--card-pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Avatar name={name || '?'} size={72} fontSize={34} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }}><Icon name="photo_camera" size={18} />Change photo</button>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>JPG or PNG · up to 2 MB</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 14 }}>
            <label style={LABEL}>Name
              <input className="field" value={isT ? me.name : stu.name} readOnly={isT} maxLength={80} onChange={(e) => editS({ name: e.target.value })}
                style={isT ? { background: 'var(--surface-sunk)', color: 'var(--ink-3)' } : undefined} />
            </label>
            <label style={LABEL}>{isT ? 'Email' : 'Phone number'}
              <span style={{ position: 'relative', display: 'flex' }}>
                <input className="field" value={signIn} readOnly style={{ background: 'var(--surface-sunk)', color: 'var(--ink-3)', paddingRight: 40 }} />
                <span style={{ position: 'absolute', right: 12, top: 13, color: 'var(--ink-3)' }}><Icon name="lock" size={18} /></span>
              </span>
            </label>
            {!isT ? (
              <>
                <label style={LABEL}>Email
                  <input className="field" type="email" value={stu.email} maxLength={200} onChange={(e) => editS({ email: e.target.value })} />
                </label>
                <label style={LABEL}>Institute
                  <input className="field" value={stu.inst} maxLength={120} onChange={(e) => editS({ inst: e.target.value })} />
                </label>
              </>
            ) : null}
          </div>

          {!isT ? (
            <div style={LABEL}>Semester
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SEMESTERS.map((sem) => {
                  const on = stu.sem === sem;
                  return (
                    <button key={sem} aria-pressed={on} onClick={() => editS({ sem })}
                      style={{ minWidth: 52, height: 40, padding: '0 12px', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 12, background: on ? 'var(--brand-soft)' : 'var(--surface)', color: on ? 'var(--on-brand-soft)' : 'var(--ink-2)', fontSize: 14, fontWeight: on ? 600 : 400 }}>{ordinalEn(sem)}</button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <label style={LABEL}>Bio
                <textarea className="field" value={tch.bio} maxLength={600} onChange={(e) => editT({ bio: e.target.value })} style={{ minHeight: 96 }} />
              </label>
              <div style={LABEL}>Subjects you teach
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {subjects.map((sub) => {
                    const on = tch.subjects.includes(sub);
                    return (
                      <button key={sub} aria-pressed={on} onClick={() => editT({ subjects: on ? tch.subjects.filter((x) => x !== sub) : tch.subjects.concat([sub]) })}
                        style={{ height: 36, padding: '0 14px', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 999, background: on ? 'var(--brand-soft)' : 'var(--surface)', color: on ? 'var(--on-brand-soft)' : 'var(--ink-2)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name={on ? 'check' : 'add'} size={16} />{sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {error ? <Alert>{error}</Alert> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
            <button className="btn btn-primary" style={{ height: 46 }} disabled={busy} onClick={save}>Save</button>
            <button className="btn" style={{ height: 46 }} onClick={() => router.push(back)}>Cancel</button>
            {saved ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ok)' }}><Icon name="check_circle" size={20} fill />Saved</span> : null}
          </div>
        </section>

        <PasswordCard />
      </div>
    </Shell>
  );
}

/** Changing the password signs every other device out; this one stays signed in. */
function PasswordCard() {
  const { n } = useStore();
  const [pw, setPw] = useState({ cur: '', nw: '', cf: '' });
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  /** What the server said, when it refused. */
  const [refused, setRefused] = useState<string | null>(null);

  const rule = passwordRules(pw.nw);
  const r1 = rule.long, r2 = rule.digit, r3 = pw.nw.length > 0 && pw.nw === pw.cf;
  const strength = (pw.nw.length ? 1 : 0) + (r1 ? 1 : 0) + (r2 ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw.nw) || /[A-Z]/.test(pw.nw) ? 1 : 0);
  const sCol = ['var(--line)', 'var(--margin)', 'var(--warn)', 'var(--brand)', 'var(--ok)'][strength];
  const valid = r1 && r2 && r3 && pw.cur.length > 0;
  const err = !pw.cur ? 'বর্তমান পাসওয়ার্ড লেখো' : !r1 || !r2 ? 'নতুন পাসওয়ার্ড নিয়ম মানছে না' : 'দুটো পাসওয়ার্ড মিলছে না';
  const edit = (k: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => { setPw({ ...pw, [k]: e.target.value }); setOk(false); setRefused(null); };
  const submit = async () => {
    if (busy) return;
    if (!valid) { setTried(true); return; }
    setBusy(true);
    setRefused(null);
    try {
      await api('/auth/password', { body: { current: pw.cur, next: pw.nw } });
      setOk(true);
      setTried(false);
      setPw({ cur: '', nw: '', cf: '' });
    } catch (e) {
      setRefused(sayError(e, n));
    }
    setBusy(false);
  };
  const type = show ? 'text' : 'password';
  const rules: [boolean, string][] = [[r1, '8+ characters'], [r2, 'At least one digit'], [r3, 'Both match']];

  return (
    <section id="password" className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--card-pad)', scrollMarginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="tile" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand-soft)', color: 'var(--on-brand-soft)' }}><Icon name="key" /></span>
        <h2 className="sec-h" style={{ fontSize: 18 }}>Change Password</h2>
        <button onClick={() => setShow(!show)}
          style={{ marginLeft: 'auto', height: 44, padding: '0 14px', border: 'none', borderRadius: 999, background: 'var(--surface-sunk)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name={show ? 'visibility_off' : 'visibility'} size={18} />{show ? 'Hide' : 'Show'}
        </button>
      </div>
      <label style={LABEL}>Current password<input className="field" type={type} value={pw.cur} onChange={edit('cur')} autoComplete="current-password" /></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 14 }}>
        <label style={LABEL}>New password<input className="field" type={type} value={pw.nw} onChange={edit('nw')} autoComplete="new-password" /></label>
        <label style={LABEL}>Confirm new password<input className="field" type={type} value={pw.cf} onChange={edit('cf')} autoComplete="new-password" style={{ borderColor: pw.cf && !r3 ? 'var(--margin)' : undefined }} /></label>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i < strength ? sCol : 'var(--line)' }} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
        {rules.map(([good, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: good ? 'var(--ok)' : 'var(--ink-3)' }}>
            <Icon name={good ? 'check_circle' : 'radio_button_unchecked'} size={18} fill={good} />{label}
          </span>
        ))}
      </div>
      {refused ? <Alert>{refused}</Alert> : tried && !valid && !ok ? <Alert>{err}</Alert> : null}
      {ok ? (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--ok-soft)', color: 'var(--ok)', fontSize: 14, fontWeight: 600 }}><Icon name="check_circle" size={20} fill />পাসওয়ার্ড বদলানো হয়েছে। অন্য সব ডিভাইস থেকে লগ আউট করা হয়েছে।</div>
      ) : null}
      <div>
        <button className="btn" onClick={submit} disabled={busy}
          style={{ height: 46, padding: '0 22px', border: 'none', background: valid ? 'var(--brand)' : 'var(--surface-sunk)', color: valid ? 'var(--on-brand)' : 'var(--ink-3)', fontSize: 15, fontWeight: 700 }}>
          Update Password
        </button>
      </div>
    </section>
  );
}
