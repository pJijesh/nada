import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';
import { joinClass, leaveClass } from '../actions';
import { fmtDate, pct } from '@/lib/stats';

export const metadata: Metadata = { title: 'My classes' };

interface Membership { class_id: string; classes: { id: string; name: string; profiles: { display_name: string } | null } | null }
interface Assignment { id: string; class_id: string; lesson_id: string; note: string | null; due_date: string | null; lessons: { name: string } | null }

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await requireViewer('student');

  const [{ data: m }, { data: a }, { data: att }] = await Promise.all([
    supabase.from('class_members').select('class_id, classes(id, name, profiles(display_name))').eq('student_id', user.id),
    supabase.from('assignments').select('id, class_id, lesson_id, note, due_date, lessons(name)').order('created_at'),
    supabase.from('attempts').select('lesson_id, in_tune, total').eq('user_id', user.id).eq('drill', false),
  ]);
  const memberships = (m ?? []) as unknown as Membership[];
  const assignments = (a ?? []) as unknown as Assignment[];
  const best = new Map<string, number>();
  for (const r of (att ?? []) as { lesson_id: string; in_tune: number; total: number }[]) {
    best.set(r.lesson_id, Math.max(best.get(r.lesson_id) ?? -1, pct(r.in_tune, r.total)));
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <h1>My classes</h1>
      <div className="grid2">
        <section className="card">
          <h3>Join a class</h3>
          <p className="sub" style={{ margin: '0 0 12px' }}>Your teacher gives you a six-character code. Teachers see your attempts only on lines they assign to the class.</p>
          <form action={joinClass} className="inline-form">
            <input type="text" name="code" placeholder="e.g. K7M2QX" maxLength={12} autoComplete="off" required aria-label="Class code" style={{ textTransform: 'uppercase' }} />
            <button className="btn primary" type="submit">Join</button>
          </form>
          {error && <p className="err" role="alert" style={{ marginTop: 10 }}>{error}</p>}
        </section>
        <section className="card">
          <h3>Your classes</h3>
          {memberships.length === 0 ? <p className="empty">You have not joined a class yet.</p> : (
            <ul className="rowlist">
              {memberships.map((x) => (
                <li key={x.class_id}>
                  <span><strong>{x.classes?.name}</strong><br /><span className="meta">Teacher: {x.classes?.profiles?.display_name ?? 'unknown'}</span></span>
                  <form action={leaveClass}><input type="hidden" name="class_id" value={x.class_id} /><button className="btn quiet" style={{ padding: '4px 12px' }} type="submit">Leave</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {memberships.length > 0 && (
        <section className="card" style={{ marginTop: 20 }}>
          <h3>Assigned lines</h3>
          {assignments.length === 0 ? <p className="empty">Nothing assigned yet.</p> : (
            <ul className="rowlist">
              {assignments.map((x) => {
                const b = best.get(x.lesson_id);
                const cls = memberships.find((c) => c.class_id === x.class_id)?.classes?.name;
                const late = x.due_date && x.due_date < today && b == null;
                return (
                  <li key={x.id}>
                    <span>
                      <Link href={`/practice?lesson=${x.lesson_id}`}><strong>{x.lessons?.name ?? x.lesson_id}</strong></Link>{' '}
                      <span className="meta">{cls}{x.due_date ? ` · due ${fmtDate(x.due_date)}` : ''}</span>
                      {x.note && <><br /><span className="meta">{x.note}</span></>}
                    </span>
                    {b != null ? <span className="pill good">best {b}%</span> : late ? <span className="pill warn">overdue</span> : <span className="pill">not tried</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
