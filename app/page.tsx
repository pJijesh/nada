import Link from 'next/link';
import { getViewer, supabaseConfigured } from '@/lib/auth';

export default async function Home() {
  const viewer = await getViewer();
  return (
    <div className="page">
      <h1>Riyaz, with a drone and a patient ear.</h1>
      <p className="lead">
        Pick a line in Hindustani or Carnatic, hear it against a tanpura and tabla or tala, sing it back, and see
        which swaras slipped. Free in your browser. Teachers can assign lines and see how their class is doing.
      </p>
      <div className="actions" style={{ marginBottom: 28 }}>
        <Link className="btn primary" href="/practice">Start practising</Link>
        {!viewer && <Link className="btn" href="/signup">Create an account</Link>}
        {viewer?.profile.role === 'teacher' && <Link className="btn" href="/teacher">Your classes</Link>}
        {viewer?.profile.role === 'student' && <Link className="btn" href="/progress">Your progress</Link>}
      </div>
      {!supabaseConfigured() && (
        <p className="notice" role="note">
          Accounts, saved progress and classes need a Supabase project. Until one is connected (see the README), you can still practise as a guest.
        </p>
      )}
      <div className="cards" style={{ marginTop: 24 }}>
        <section className="card"><h3>For students</h3><p style={{ margin: 0 }}>Hear the line, sing it back, get a note-by-note result in cents. Drill only the swaras that slipped. Find a comfortable Sa for your voice.</p></section>
        <section className="card"><h3>For teachers</h3><p style={{ margin: 0 }}>Make a class, share its code, assign lines and see each student’s best score. You only see attempts on lessons you assigned.</p></section>
        <section className="card"><h3>Both traditions</h3><p style={{ margin: 0 }}>Thaats and melakartas, Devanagari or Latin notation, just or equal tuning, Teentaal to Adi tala.</p></section>
      </div>
    </div>
  );
}
