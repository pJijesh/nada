import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireViewer, loadLessons } from '@/lib/auth';
import { assignLesson, deleteClass, removeStudent, unassignLesson } from '../../actions';
import { fmtDate, pct } from '@/lib/stats';

export const metadata: Metadata = { title: 'Class' };

interface Member { student_id: string; joined_at: string; profiles: { display_name: string } | null }
interface Assignment { id: string; lesson_id: string; note: string | null; due_date: string | null; lessons: { name: string } | null }
interface Attempt { user_id: string; lesson_id: string; in_tune: number; total: number; drill: boolean; created_at: string }

export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireViewer('teacher');
  const { data: cls } = await supabase.from('classes').select('id, name, join_code').eq('id', id).maybeSingle();
  if (!cls) notFound();

  const [{ data: m }, { data: a }, lessons] = await Promise.all([
    supabase.from('class_members').select('student_id, joined_at, profiles(display_name)').eq('class_id', id).order('joined_at'),
    supabase.from('assignments').select('id, lesson_id, note, due_date, lessons(name)').eq('class_id', id).order('created_at'),
    loadLessons(),
  ]);
  const members = (m ?? []) as unknown as Member[];
  const assignments = (a ?? []) as unknown as Assignment[];
  const studentIds = members.map((x) => x.student_id);
  const lessonIds = assignments.map((x) => x.lesson_id);

  let attempts: Attempt[] = [];
  if (studentIds.length && lessonIds.length) {
    const { data } = await supabase.from('attempts').select('user_id, lesson_id, in_tune, total, drill, created_at')
      .in('user_id', studentIds).in('lesson_id', lessonIds).eq('drill', false);
    attempts = (data ?? []) as Attempt[];
  }
  const cell = (sid: string, lid: string) => {
    const mine = attempts.filter((x) => x.user_id === sid && x.lesson_id === lid);
    if (!mine.length) return null;
    return { best: Math.max(...mine.map((x) => pct(x.in_tune, x.total))), n: mine.length, last: mine.reduce((p, c) => (c.created_at > p ? c.created_at : p), '') };
  };
  const assignable = lessons.filter((l) => !lessonIds.includes(l.id));

  return (
    <div className="page">
      <p className="sub" style={{ margin: '0 0 4px' }}><Link href="/teacher">← All classes</Link></p>
      <h1>{cls.name}</h1>
      <p className="lead" style={{ marginBottom: 8 }}>Students join with this code:</p>
      <p className="code" style={{ margin: '0 0 24px' }}>{cls.join_code}</p>
      {error && <p className="err" role="alert">{error}</p>}

      <div className="grid2">
        <section className="card">
          <h3>Assign a line</h3>
          {assignable.length === 0 ? <p className="empty">Every available line is assigned.</p> : (
            <form action={assignLesson} className="form">
              <input type="hidden" name="class_id" value={cls.id} />
              <div className="field">
                <label htmlFor="lesson_id">Line</label>
                <select id="lesson_id" name="lesson_id" required>
                  {assignable.map((l) => <option key={l.id} value={l.id}>{l.tradition === 'hindustani' ? 'Hindustani' : 'Carnatic'} · {l.name}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="due_date">Due date (optional)</label><input id="due_date" type="date" name="due_date" /></div>
              <div className="field"><label htmlFor="note">Note for students (optional)</label><textarea id="note" name="note" maxLength={500} /></div>
              <button className="btn primary" type="submit">Assign</button>
            </form>
          )}
        </section>
        <section className="card">
          <h3>Assigned lines</h3>
          {assignments.length === 0 ? <p className="empty">Nothing assigned yet.</p> : (
            <ul className="rowlist">
              {assignments.map((x) => (
                <li key={x.id}>
                  <span><strong>{x.lessons?.name ?? x.lesson_id}</strong>{x.due_date && <span className="meta"> · due {fmtDate(x.due_date)}</span>}{x.note && <><br /><span className="meta">{x.note}</span></>}</span>
                  <form action={unassignLesson}>
                    <input type="hidden" name="class_id" value={cls.id} /><input type="hidden" name="assignment_id" value={x.id} />
                    <button className="btn quiet" style={{ padding: '4px 12px' }} type="submit">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <h3>Results</h3>
        {members.length === 0 ? <p className="empty">No students yet. Share the code above.</p> : (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Student</th>{assignments.map((x) => <th key={x.id}>{x.lessons?.name ?? x.lesson_id}</th>)}<th></th></tr>
              </thead>
              <tbody>
                {members.map((s) => (
                  <tr key={s.student_id}>
                    <td>{s.profiles?.display_name ?? 'Student'}</td>
                    {assignments.map((x) => {
                      const c = cell(s.student_id, x.lesson_id);
                      return c
                        ? <td key={x.id} className={c.best >= 80 ? 'cell-good' : 'cell-warn'}>best {c.best}% <span className="meta">· {c.n} {c.n === 1 ? 'try' : 'tries'} · {fmtDate(c.last)}</span></td>
                        : <td key={x.id} className="cell-none">not tried</td>;
                    })}
                    <td>
                      <form action={removeStudent}>
                        <input type="hidden" name="class_id" value={cls.id} /><input type="hidden" name="student_id" value={s.student_id} />
                        <button className="btn quiet" style={{ padding: '3px 10px' }} type="submit">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="sub" style={{ marginTop: 10 }}>Scores are the share of swaras in tune on a student’s best full-line attempt. Drill attempts are not counted.</p>
      </section>

      <details style={{ marginTop: 24 }}>
        <summary className="sub" style={{ cursor: 'pointer' }}>Delete this class…</summary>
        <form action={deleteClass} style={{ marginTop: 10 }}>
          <input type="hidden" name="class_id" value={cls.id} />
          <p className="sub" style={{ margin: '0 0 10px' }}>This removes the class, its roster and its assignments. Students keep their own attempts. It cannot be undone.</p>
          <button className="btn quiet" type="submit">Yes, delete {cls.name}</button>
        </form>
      </details>
    </div>
  );
}
