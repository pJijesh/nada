import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth';
import { COURSE, DAYS } from '@/lib/daily';

export const metadata: Metadata = { title: 'Daily lessons' };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const viewer = await getViewer();
  const progress = new Map<number, { done: boolean; hearted: boolean }>();
  if (viewer) {
    const { data } = await viewer.supabase.from('daily_progress').select('day, completed_at, hearted').eq('course', COURSE.id);
    for (const r of (data ?? []) as { day: number; completed_at: string | null; hearted: boolean }[]) {
      progress.set(r.day, { done: !!r.completed_at, hearted: r.hearted });
    }
  }
  const next = DAYS.find((d) => !progress.get(d.day)?.done) ?? null;
  const doneDay = Number(done);
  const finished = DAYS.length > 0 && !next;

  return (
    <div className="page" data-trad="carnatic">
      <h1>Daily lessons</h1>
      <p className="lead">
        {COURSE.name}: one short idea a day, a small activity you can do with just your voice, and a line to try in the practice player.
        {!viewer && <> <Link href="/signup?next=/learn">Create an account</Link> to keep track of the days you have finished.</>}
      </p>
      {doneDay > 0 && <p className="okmsg" role="status" style={{ marginBottom: 14 }}>Day {doneDay} marked as done. {next ? `Day ${next.day} is next.` : 'You have finished every day so far.'}</p>}
      {finished && <p className="lead">You have finished every day so far. More lessons are on the way.</p>}
      <div className="daycards">
        {DAYS.map((d) => {
          const p = progress.get(d.day);
          const isNext = next?.day === d.day;
          return (
            <section key={d.day} className={'card' + (isNext && viewer ? ' today' : '')}>
              <span className="dnum">Day {d.day}</span>
              <h3>{d.kicker ?? 'Carnatic foundations'}</h3>
              <h2><Link href={`/learn/${d.day}`}>{d.title}</Link></h2>
              <p className="dstatus">
                {p?.done && <span className="pill good">done</span>}
                {p?.hearted && <span className="pill" aria-label="You hearted this day">♥ hearted</span>}
                {isNext && viewer && !p?.done && <span className="pill warn">up next</span>}
              </p>
              <div className="actions" style={{ marginTop: 'auto' }}>
                <Link className={'btn' + (isNext ? ' primary' : '')} href={`/learn/${d.day}`}>{p?.done ? 'Read again' : 'Open day ' + d.day}</Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
