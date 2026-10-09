'use client';

import type { SignedIn } from '@contract';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AuthForm, AuthFrame, FootLink, PasswordField, PasswordRules, Submit, TextField } from '@/components/AuthFrame';
import { api } from '@/lib/api/client';
import { sayError } from '@/lib/api/messages';
import { deviceId, homeOf, looksLikeEmail, passwordOk } from '@/lib/api/session';
import { useStore } from '@/lib/store';

/**
 * A student gets a code by SMS and sets a new password with it. A teacher or staff member has no phone on file:
 * an admin makes them a new link instead, so they are told to ask.
 */
export default function ForgotPage() {
  const { ready, signedIn, n } = useStore();
  const router = useRouter();
  const [step, setStep] = useState<'ask' | 'code' | 'staff'>('ask');
  const [login, setLogin] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [again, setAgain] = useState(false);

  if (!ready) return null;

  const send = async (resend = false) => {
    if (busy) return;
    if (!login.trim()) { setError('ফোন নম্বর বা ইমেইল লেখো।'); return; }
    if (looksLikeEmail(login)) { setError(null); setStep('staff'); return; }
    setBusy(true);
    setError(null);
    try {
      // The answer is the same whether or not the number has an account, so this cannot be used to find out who does.
      await api('/auth/forgot', { body: { login: login.trim() } });
      setStep('code');
      setAgain(resend);
    } catch (e) {
      setError(sayError(e, n));
    }
    setBusy(false);
  };

  const reset = async () => {
    if (busy) return;
    if (!code.trim()) { setError('SMS-এর কোডটা লেখো।'); return; }
    if (!passwordOk(password)) { setError('পাসওয়ার্ডে কমপক্ষে ' + n(8) + 'টা অক্ষর আর একটা সংখ্যা লাগবে।'); return; }
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<SignedIn>('/auth/reset', { body: { login: login.trim(), code: code.trim(), password, device: deviceId() } });
      signedIn(user);
      router.replace(homeOf(user.kind));
    } catch (e) {
      setError(sayError(e, n));
      setBusy(false);
    }
  };

  const back = <FootLink href="/signin">Back to Sign In</FootLink>;

  if (step === 'staff') {
    return (
      <AuthFrame title="Forgot Password" lead="শিক্ষক আর স্টাফদের পাসওয়ার্ড অ্যাডমিন রিসেট করেন।" foot={back}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--card-pad)' }}>
          <Alert tone="info">অ্যাডমিনকে জানাও। তিনি একটা নতুন লিংক পাঠাবেন, সেটা খুলে নতুন পাসওয়ার্ড ঠিক করবে।</Alert>
          <button className="btn" style={{ height: 48 }} onClick={() => setStep('ask')}>Use a Phone Number</button>
        </div>
      </AuthFrame>
    );
  }

  if (step === 'code') {
    return (
      <AuthFrame title="Set a New Password" lead={'এই নম্বরে অ্যাকাউন্ট থাকলে একটা কোড SMS-এ গেছে। কোডটা ' + n(15) + ' মিনিট কাজ করবে।'} foot={back}>
        <AuthForm onSubmit={reset}>
          <TextField label="Code from the SMS" value={code} onValue={setCode} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} className="field mono" autoFocus />
          <PasswordField label="New password" value={password} onValue={setPassword} fresh />
          <PasswordRules value={password} />
          {error ? <Alert>{error}</Alert> : again ? <Alert tone="ok">কোডটা আবার পাঠানো হয়েছে।</Alert> : null}
          <Submit busy={busy}>Set Password</Submit>
          <button type="button" className="btn" style={{ height: 48 }} disabled={busy} onClick={() => send(true)}>Send the Code Again</button>
        </AuthForm>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Forgot Password" lead="যে নম্বর দিয়ে লগ ইন করো সেটা লেখো। ওই নম্বরে একটা কোড পাঠাবো।" foot={back}>
      <AuthForm onSubmit={() => send()}>
        <TextField label="Phone or email" value={login} onValue={setLogin} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
        {error ? <Alert>{error}</Alert> : null}
        <Submit busy={busy}>Send Code</Submit>
      </AuthForm>
    </AuthFrame>
  );
}
