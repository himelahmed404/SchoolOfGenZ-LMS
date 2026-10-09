'use client';

import type { SignedIn } from '@contract';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AuthForm, AuthFrame, FootLink, PasswordField, PasswordRules, Submit, TextField } from '@/components/AuthFrame';
import { api } from '@/lib/api/client';
import { sayError } from '@/lib/api/messages';
import { deviceId, homeOf, passwordOk } from '@/lib/api/session';
import { useStore } from '@/lib/store';

/**
 * What the SMS link put in the address. It comes after the `#`, which a browser never sends to a server,
 * so the code is in no request log. Read once; the server render has no address to read.
 */
const fromLink = (key: string) => () => (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.hash.slice(1)).get(key) || '');

/** A new student sets their first password here, with the code from the SMS sent when their payment was approved. */
export default function ActivatePage() {
  const { ready, signedIn, n } = useStore();
  const router = useRouter();
  const [phone, setPhone] = useState(fromLink('phone'));
  const [code, setCode] = useState(fromLink('code'));
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The code is in the form now. Take it out of the address, so it is not left in the history or copied with the link.
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  if (!ready) return null;

  const submit = async () => {
    if (busy) return;
    if (!phone.trim() || !code.trim()) { setError('ফোন নম্বর আর SMS-এর কোড, দুটোই লেখো।'); return; }
    if (!passwordOk(password)) { setError('পাসওয়ার্ডে কমপক্ষে ' + n(8) + 'টা অক্ষর আর একটা সংখ্যা লাগবে।'); return; }
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<SignedIn>('/auth/activate', { body: { phone: phone.trim(), code: code.trim(), password, device: deviceId() } });
      signedIn(user);
      router.replace(homeOf(user.kind));
    } catch (e) {
      setError(sayError(e, n));
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Set Your Password" lead="পেমেন্ট অনুমোদনের পর যে SMS পেয়েছো, তার কোডটা দিয়ে নিজের পাসওয়ার্ড ঠিক করো। এরপর এই নম্বর আর পাসওয়ার্ড দিয়েই লগ ইন করবে।"
      foot={<FootLink href="/signin">Back to Sign In</FootLink>}>
      <AuthForm onSubmit={submit}>
        <TextField label="Phone number" value={phone} onValue={setPhone} type="tel" inputMode="tel" autoComplete="username" />
        <TextField label="Code from the SMS" value={code} onValue={setCode} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} className="field mono" />
        <PasswordField label="New password" value={password} onValue={setPassword} fresh />
        <PasswordRules value={password} />
        {error ? <Alert>{error}</Alert> : null}
        <Submit busy={busy}>Set Password</Submit>
      </AuthForm>
    </AuthFrame>
  );
}
