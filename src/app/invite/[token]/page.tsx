'use client';

import type { InviteInfo, SignedIn } from '@contract';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AuthForm, AuthFrame, FootLink, PasswordField, PasswordRules, Submit } from '@/components/AuthFrame';
import { api } from '@/lib/api/client';
import { sayError } from '@/lib/api/messages';
import { deviceId, homeOf, passwordOk } from '@/lib/api/session';
import { useStore } from '@/lib/store';

/** A teacher or staff member opens the link an admin sent them and sets a password. The link works once. */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { ready, signedIn, n } = useStore();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Looking at the link does not use it up; only setting the password does.
  const invite = useQuery({ queryKey: ['invite', token], queryFn: () => api<InviteInfo>('/auth/invite/' + encodeURIComponent(token)), retry: false, staleTime: Infinity });

  if (!ready || invite.isPending) return null;

  const back = <FootLink href="/signin">Back to Sign In</FootLink>;
  if (invite.isError) {
    return (
      <AuthFrame title="This Link Does Not Work" lead="লিংকটা একবারই ব্যবহার করা যায়, আর কিছুদিন পর এর মেয়াদ শেষ হয়।" foot={back}>
        <Alert>{sayError(invite.error, n)}</Alert>
      </AuthFrame>
    );
  }

  const who = invite.data;
  const submit = async () => {
    if (busy) return;
    if (!passwordOk(password)) { setError('পাসওয়ার্ডে কমপক্ষে ' + n(8) + 'টা অক্ষর আর একটা সংখ্যা লাগবে।'); return; }
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<SignedIn>('/auth/invite', { body: { token, password, device: deviceId() } });
      signedIn(user);
      router.replace(homeOf(user.kind));
    } catch (e) {
      setError(sayError(e, n));
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Set Your Password" lead="নিজের জন্য একটা পাসওয়ার্ড ঠিক করো। এরপর এই ইমেইল আর পাসওয়ার্ড দিয়ে লগ ইন করবে।" foot={back}>
      <AuthForm onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{who.name}</span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{who.email}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{who.kind === 'teacher' ? 'Teacher' : 'Staff'}</span>
        </div>
        <PasswordField label="New password" value={password} onValue={setPassword} fresh />
        <PasswordRules value={password} />
        {error ? <Alert>{error}</Alert> : null}
        <Submit busy={busy}>Set Password</Submit>
      </AuthForm>
    </AuthFrame>
  );
}
