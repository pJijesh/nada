import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';
import { fmtDate, pct, streakDays } from '@/lib/stats';

export const metadata: Metadata = { title: 'Progress' };

interface Row {
  id: string; lesson_id: string; drill: boolean; source: string; in_tune: number; total: number; created_at: string;
  lessons: { name: string; tradition: string } | null;
}

export default async function ProgressPage() {
  const { supabase, user } = await requireViewer();
  const { data } = await supabase
    .from('attempts')
    .select('id, lesson_id, drill, source, in_tune, total, created_at, lessons(name, tradition)')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(500);
  const rows = (data ?? []) as unknown as Row[];
  const full = rows.filter((r) => !r.drill);

  const byLesson = new Map<string, { name: string; tradition: string; n: number; best: number; last: Row }>();
  for (const r of full) {
    const p = pct(r.in_tune, r.total);
    const cur = byLesson.get(r.lesson_id);
    if (!cur) byLesson.set(r.lesson_id, { name: r.lessons?.name ?? r.lesson_id, tradition: r.lessons?.tradition ?? '', n: 1, best: p, last: r });
    else { cur.n++; cur.best = Math.max(cur.best, p); }
  }
  const lessons = Array.from(byLesson.values());
  const bestOverall = lessons.length ? Math.max(...lessons.map((l) => l.best)) : 0;

  return (
    <div className="page">
      <h1>Your progress</h1>
      {rows.length === 0 ? (
        <p className="lead">No saved attempts yet. Sing a line with the microphone or upload a recording and it will show up here. <Link href="/practice">Go to practice</Link>.</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><b>{rows.length}</b><span>Attempts</span></div>
            <div className="stat"><b>{lessons.length}</b><span>Lines practised</span></div>
            <div className="stat"><b>{bestOverall}%</b><span>Best line score</span></div>
            <div className="stat"><b>{streakDays(rows.map((r) => r.created_at))}</b><span>Day streak</span></div>
          </div>
          <div className="grid2">
            <section className="card">
              <h3>By line</h3>
              <div className="tbl">
                <table>
                  <thead><tr><th>Line</th><th>Attempts</th><th>Best</th><th>Latest</th></tr></thead>
                  <tbody>
                    {lessons.map((l) => (
                      <tr key={l.last.lesson_id}>
                        <td><Link href={`/practice?lesson=${l.last.lesson_id}`}>{l.name}</Link></td>
                        <td>{l.n}</td><td>{l.best}%</td><td>{pct(l.last.in_tune, l.last.total)}% · {fmtDate(l.last.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="sub" style={{ marginTop: 10 }}>Drill attempts are listed on the right but not counted here.</p>
            </section>
            <section className="card">
              <h3>Recent attempts</h3>
              <ul className="rowlist">
                {rows.slice(0, 12).map((r) => (
                  <li key={r.id}>
                    <span>{r.lessons?.name ?? r.lesson_id} {r.drill && <span className="pill">drill</span>}</span>
                    <span className="meta">{r.in_tune} of {r.total} in tune · {fmtDate(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
