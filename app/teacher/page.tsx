import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';
import { createClass } from '../actions';

export const metadata: Metadata = { title: 'Teacher' };

interface Cls { id: string; name: string; join_code: string; class_members: { count: number }[]; assignments: { count: number }[] }

export default async function TeacherPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase } = await requireViewer('teacher');
  const { data } = await supabase
    .from('classes').select('id, name, join_code, class_members(count), assignments(count)').order('created_at', { ascending: false });
  const classes = (data ?? []) as unknown as Cls[];
  return (
    <div className="page">
      <h1>Your classes</h1>
      <section className="card" style={{ marginBottom: 20 }}>
        <h3>New class</h3>
        <form action={createClass} className="inline-form">
          <input type="text" name="name" placeholder="e.g. Saturday beginners" maxLength={80} required aria-label="Class name" />
          <button className="btn primary" type="submit">Create class</button>
        </form>
        {error && <p className="err" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      </section>
      {classes.length === 0 ? <p className="lead">No classes yet. Create one, then share its code with your students.</p> : (
        <div className="cards">
          {classes.map((c) => (
            <section className="card" key={c.id}>
              <h3>{c.class_members[0]?.count ?? 0} students · {c.assignments[0]?.count ?? 0} lines assigned</h3>
              <h2><Link href={`/teacher/${c.id}`}>{c.name}</Link></h2>
              <p style={{ margin: '12px 0 0' }}><span className="sub">Join code</span><br /><span className="code">{c.join_code}</span></p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
