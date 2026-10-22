import Link from 'next/link';
import { getViewer, supabaseConfigured } from '@/lib/auth';
import { BRAND } from '@/lib/brand';
import { Diya, Lotus, Sprig } from '@/components/art';
import { TanpuraSvg } from '@/components/graphics';

export default async function Home() {
  const viewer = await getViewer();
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-art" aria-hidden="true"><Sprig size={96} /><TanpuraSvg plucks={[0, 0, 0, 0]} /><Diya size={56} className="diya" /></div>
        <div className="hero-copy">
          <p className="script" style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--green)' }}>{BRAND.tagline}</p>
          <h1>Riyaz with a drone and a patient ear.</h1>
          <p className="lead">
            One small idea a day. A line to sing against the tanpura and tabla or tala, and a note-by-note look at what slipped.
            Free in your browser, for Hindustani and Carnatic singers, with classes for teachers.
          </p>
          <div className="actions" style={{ marginBottom: 8 }}>
            <Link className="btn primary" href="/learn">Start the daily lessons</Link>
            <Link className="btn" href="/practice">Open the practice player</Link>
            {!viewer && <Link className="btn quiet" href="/signup">Create an account</Link>}
            {viewer?.profile.role === 'teacher' && <Link className="btn quiet" href="/teacher">Your classes</Link>}
          </div>
        </div>
        <div className="hero-art right" aria-hidden="true"><Lotus size={120} /></div>
      </section>
      {!supabaseConfigured() && (
        <p className="notice" role="note">
          Accounts, saved progress and classes need a Supabase project. Until one is connected (see the README), you can still read the lessons and practise as a guest.
        </p>
      )}
      <div className="cards" style={{ marginTop: 24 }}>
        <section className="panel yellow"><h3>Daily lessons</h3><p style={{ margin: 0 }}>Short Carnatic foundations: the swaras, finding your Sa, and your first raga, Mohanam. Each day ends with something to hum.</p></section>
        <section className="panel green"><h3>For students</h3><p style={{ margin: 0 }}>Hear the line, sing it back, get a result in cents. Drill only the swaras that slipped. Find a comfortable Sa for your voice.</p></section>
        <section className="panel blue"><h3>For teachers</h3><p style={{ margin: 0 }}>Make a class, share its code, assign lines and see each student’s best score. You only see attempts on lines you assigned.</p></section>
        <section className="panel pink"><h3>Both traditions</h3><p style={{ margin: 0 }}>Thaats and melakartas, Devanagari or Latin notation, just or equal tuning, Teentaal to Adi tala.</p></section>
      </div>
    </div>
  );
}
