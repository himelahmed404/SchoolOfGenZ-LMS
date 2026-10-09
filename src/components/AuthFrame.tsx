'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { passwordRules } from '@/lib/api/session';
import { ThemeToggle } from './ThemeToggle';
import { Icon } from './ui';

const LABEL: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' };

/** The page around every screen a person sees before they are signed in: sign in, set a password, reset it. */
export function AuthFrame({ title, lead, children, foot }: { title: string; lead: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', background: 'var(--paper)' }}>
      <main style={{ maxWidth: 460, margin: '0 auto', padding: 'var(--col-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 12, background: 'var(--brand)' }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>School of GenZ</div>
          <ThemeToggle style={{ marginLeft: 'auto', marginRight: -10 }} />
        </div>
        <h1 className="d1" style={{ marginBottom: 8 }}>{title}</h1>
        <div className="muted-p" style={{ marginBottom: 24 }}>{lead}</div>
        {children}
        {foot ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 20 }}>{foot}</div> : null}
      </main>
    </div>
  );
}

/** The fields of one of those screens. Enter in any field submits. */
export function AuthForm({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--card-pad)' }}>
      {children}
    </form>
  );
}

type FieldProps = { label: string; value: string; onValue: (v: string) => void; hint?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export function TextField({ label, value, onValue, hint, style, ...rest }: FieldProps) {
  return (
    <label style={LABEL}>{label}
      <input className="field" value={value} onChange={(e) => onValue(e.target.value)} style={{ height: 48, fontSize: 16, ...style }} {...rest} />
      {hint ? <span className="fine" style={{ fontWeight: 400 }}>{hint}</span> : null}
    </label>
  );
}

/** A password field with a Show / Hide switch, so a long password can be checked before it is sent. */
export function PasswordField({ label, value, onValue, fresh, hint }: { label: string; value: string; onValue: (v: string) => void; fresh?: boolean; hint?: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <label style={LABEL}>{label}
      <span style={{ position: 'relative', display: 'flex' }}>
        <input className="field" type={show ? 'text' : 'password'} value={value} onChange={(e) => onValue(e.target.value)}
          autoComplete={fresh ? 'new-password' : 'current-password'} style={{ height: 48, fontSize: 16, paddingRight: 84 }} />
        <button type="button" onClick={() => setShow(!show)} aria-pressed={show}
          style={{ position: 'absolute', right: 2, top: 2, height: 44, minWidth: 44, padding: '0 12px', border: 'none', borderRadius: 12, background: 'none', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name={show ? 'visibility_off' : 'visibility'} size={18} />{show ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint ? <span className="fine" style={{ fontWeight: 400 }}>{hint}</span> : null}
    </label>
  );
}

/** The two rules for a new password, ticked as they are met. */
export function PasswordRules({ value }: { value: string }) {
  const r = passwordRules(value);
  const rules: [boolean, string][] = [[r.long, '8+ characters'], [r.digit, 'At least one digit']];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
      {rules.map(([good, label]) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: good ? 'var(--ok)' : 'var(--ink-3)' }}>
          <Icon name={good ? 'check_circle' : 'radio_button_unchecked'} size={18} fill={good} />{label}
        </span>
      ))}
    </div>
  );
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'ok' | 'info' }) {
  const c = tone === 'ok' ? ['var(--ok-soft)', 'var(--ok)', 'check_circle'] : tone === 'info' ? ['var(--surface-sunk)', 'var(--ink-2)', 'info'] : ['var(--margin-soft)', 'var(--margin)', 'error'];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 12, background: c[0], color: c[1], fontSize: 14, lineHeight: 1.6, fontWeight: 600 }}>
      <Icon name={c[2]} size={20} fill={tone === 'ok'} style={{ flexShrink: 0, marginTop: 1 }} /><span>{children}</span>
    </div>
  );
}

export function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', height: 48 }}>{children}</button>;
}

/** A line under the form that leads to one of the other screens. */
export function FootLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} style={{ alignSelf: 'flex-start', minHeight: 44, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 600 }}>{children}</Link>;
}
