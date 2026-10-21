'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ mode, next, configured }: { mode: 'login' | 'signup'; next: string; configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return <p className="notice" role="note">Accounts are not set up yet. Connect a Supabase project (see the README), then come back.</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    const supabase = createClient();
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) { setError(err.message); return; }
      router.push(next); router.refresh();
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { display_name: name.trim(), role },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    if (data.session) { router.push(role === 'teacher' ? '/teacher' : next); router.refresh(); return; }
    setInfo('Check your email for a confirmation link, then sign in.');
  };

  return (
    <form className="form" onSubmit={submit}>
      {mode === 'signup' && (
        <>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" type="text" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <span className="lab">I am a</span>
            <div className="seg" role="group" aria-label="Account type">
              <button type="button" aria-pressed={role === 'student'} onClick={() => setRole('student')}>Student</button>
              <button type="button" aria-pressed={role === 'teacher'} onClick={() => setRole('teacher')}>Teacher</button>
            </div>
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {info && <p className="okmsg" role="status">{info}</p>}
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <p className="sub" style={{ margin: 0 }}>
        {mode === 'login'
          ? <>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>
          : <>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>}
      </p>
    </form>
  );
}
