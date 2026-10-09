'use client';

import type { SignedIn } from '@contract';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AuthForm, AuthFrame, FootLink, PasswordField, Submit, TextField } from '@/components/AuthFrame';
import { api, ApiFailure } from '@/lib/api/client';
import { sayError } from '@/lib/api/messages';
import { afterSignIn, deviceId } from '@/lib/api/session';
import { useStore } from '@/lib/store';

export default function SignInPage() {
  const { me, ready, offline, signedIn, n } = useStore();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed in, now or already: on to where they were going, or to their own start.
  useEffect(() => {
    if (ready && me) router.replace(afterSignIn(me, new URLSearchParams(window.location.search).get('next')));
  }, [ready, me, router]);

  if (!ready || me) return null;

  const submit = async () => {
    if (busy) return;
    if (!login.trim() || !password) { setError('ফোন নম্বর বা ইমেইল আর পাসওয়ার্ড, দুটোই লেখো।'); return; }
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<SignedIn>('/auth/signin', { body: { login: login.trim(), password, device: deviceId() } });
      signedIn(user);
    } catch (e) {
      setError(sayError(e, n));
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Sign In" lead="ফোন নম্বর আর পাসওয়ার্ড দিয়ে লগ ইন করো। শিক্ষক ও স্টাফদের জন্য ইমেইল।"
      foot={<><FootLink href="/forgot">Forgot Password</FootLink><FootLink href="/activate">I Have an SMS Code</FootLink></>}>
      <AuthForm onSubmit={submit}>
        <TextField label="Phone or email" value={login} onValue={setLogin} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
        <PasswordField label="Password" value={password} onValue={setPassword} />
        {error ? <Alert>{error}</Alert> : offline ? <Alert>{sayError(new ApiFailure(0, 'offline'), n)}</Alert> : null}
        <Submit busy={busy}>Sign In</Submit>
      </AuthForm>
    </AuthFrame>
  );
}
