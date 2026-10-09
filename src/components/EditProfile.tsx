'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { saveStudentProfile, saveTeacherProfile, type StudentProfileDraft, type TeacherProfileDraft } from '@/lib/actions';
import { defaultStudent, SEMESTERS, subjectOptions, teacher } from '@/lib/data';
import { ordinalEn } from '@/lib/format';
import { studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Shell } from './Shell';
import { Avatar, Icon } from './ui';

const LABEL: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' };

/** Edit profile + change password, shared by student and teacher (fields differ by role). */
export function EditProfile({ role }: { role: 'student' | 'teacher' }) {
  const { ready } = useStore();
  // The drafts start from the saved profile, so the form waits for the store.
  return ready ? <EditProfileForm role={role} /> : <Shell role={role} title="Edit Profile">{null}</Shell>;
}

function EditProfileForm({ role }: { role: 'student' | 'teacher' }) {
  const { s, set } = useStore();
  const router = useRouter();
  const isT = role === 'teacher';
  const back = isT ? '/teacher/profile' : '/profile';

  const [stu, setStu] = useState<StudentProfileDraft>(() => ({ name: studentName(s), email: s.profile.email, inst: s.profile.inst, sem: s.prefs.sem }));
  const [tch, setTch] = useState<TeacherProfileDraft>(() => ({ email: s.tProfile.email, bio: s.tProfile.bio, subjects: s.tProfile.subjects }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (window.location.hash !== '#password') return;
    const t = setTimeout(() => document.getElementById('password')?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, []);

  const editS = (patch: Partial<StudentProfileDraft>) => { setStu((d) => ({ ...d, ...patch })); setSaved(false); };
  const editT = (patch: Partial<TeacherProfileDraft>) => { setTch((d) => ({ ...d, ...patch })); setSaved(false); };
  const save = () => {
    if (isT) set((x) => saveTeacherProfile(x, tch));
    else set((x) => saveStudentProfile(x, { ...stu, name: stu.name.trim() }));
    setSaved(true);
  };

  const name = isT ? teacher.name : stu.name || studentName(s);
  const phone = isT ? teacher.phone : defaultStudent.phone.replace(' ', '-');

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
              <input className="field" value={isT ? teacher.name : stu.name} readOnly={isT} onChange={(e) => editS({ name: e.target.value })} />
            </label>
            <label style={LABEL}>Phone number
              <span style={{ position: 'relative', display: 'flex' }}>
                <input className="field" value={phone} readOnly style={{ background: 'var(--surface-sunk)', color: 'var(--ink-3)', paddingRight: 40 }} />
                <span style={{ position: 'absolute', right: 12, top: 13, color: 'var(--ink-3)' }}><Icon name="lock" size={18} /></span>
              </span>
            </label>
            <label style={LABEL}>Email
              <input className="field" type="email" value={isT ? tch.email : stu.email} onChange={(e) => (isT ? editT({ email: e.target.value }) : editS({ email: e.target.value }))} />
            </label>
            {!isT ? (
              <label style={LABEL}>Institute
                <input className="field" value={stu.inst} onChange={(e) => editS({ inst: e.target.value })} />
              </label>
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
                <textarea className="field" value={tch.bio} onChange={(e) => editT({ bio: e.target.value })} style={{ minHeight: 96 }} />
              </label>
              <div style={LABEL}>Subjects you teach
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {subjectOptions.map((sub) => {
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
            <button className="btn btn-primary" style={{ height: 46 }} onClick={save}>Save</button>
            <button className="btn" style={{ height: 46 }} onClick={() => router.push(back)}>Cancel</button>
            {saved ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ok)' }}><Icon name="check_circle" size={20} fill />Saved</span> : null}
          </div>
        </section>

        <PasswordCard />
      </div>
    </Shell>
  );
}

/** UI only until auth exists: validates and confirms, nothing is sent anywhere. */
function PasswordCard() {
  const [pw, setPw] = useState({ cur: '', nw: '', cf: '' });
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [ok, setOk] = useState(false);

  const r1 = pw.nw.length >= 8, r2 = /[0-9]/.test(pw.nw), r3 = pw.nw.length > 0 && pw.nw === pw.cf;
  const strength = (pw.nw.length ? 1 : 0) + (r1 ? 1 : 0) + (r2 ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw.nw) || /[A-Z]/.test(pw.nw) ? 1 : 0);
  const sCol = ['var(--line)', 'var(--margin)', 'var(--warn)', 'var(--brand)', 'var(--ok)'][strength];
  const valid = r1 && r2 && r3 && pw.cur.length > 0;
  const err = !pw.cur ? 'বর্তমান পাসওয়ার্ড লেখো' : !r1 || !r2 ? 'নতুন পাসওয়ার্ড নিয়ম মানছে না' : 'দুটো পাসওয়ার্ড মিলছে না';
  const edit = (k: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => { setPw({ ...pw, [k]: e.target.value }); setOk(false); };
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
      {tried && !valid && !ok ? (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--margin-soft)', color: 'var(--margin)', fontSize: 14, fontWeight: 600 }}><Icon name="error" size={20} />{err}</div>
      ) : null}
      {ok ? (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--ok-soft)', color: 'var(--ok)', fontSize: 14, fontWeight: 600 }}><Icon name="check_circle" size={20} fill />পাসওয়ার্ড বদলানো হয়েছে। অন্য সব ডিভাইস থেকে লগ আউট করা হয়েছে।</div>
      ) : null}
      <div>
        <button className="btn" onClick={() => { if (valid) { setOk(true); setTried(false); setPw({ cur: '', nw: '', cf: '' }); } else setTried(true); }}
          style={{ height: 46, padding: '0 22px', border: 'none', background: valid ? 'var(--brand)' : 'var(--surface-sunk)', color: valid ? 'var(--on-brand)' : 'var(--ink-3)', fontSize: 15, fontWeight: 700 }}>
          Update Password
        </button>
      </div>
    </section>
  );
}
