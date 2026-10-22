import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DayCard, { TryIt } from '@/components/DayCard';
import { getViewer } from '@/lib/auth';
import { COURSE, DAYS, getDay } from '@/lib/daily';
import { setDayDone, toggleHeart } from '../../actions';

export async function generateMetadata({ params }: { params: Promise<{ day: string }> }): Promise<Metadata> {
  const d = getDay(Number((await params).day));
  return { title: d ? `Day ${d.day}: ${d.kicker ? d.kicker + ' ' : ''}${d.title}` : 'Daily lessons' };
}

export default async function DayPage({ params, searchParams }: { params: Promise<{ day: string }>; searchParams: Promise<{ error?: string }> }) {
  const n = Number((await params).day);
  const lesson = getDay(n);
  if (!lesson) notFound();
  const { error } = await searchParams;
  const viewer = await getViewer();
  let hearted = false, done = false;
  if (viewer) {
    const { data } = await viewer.supabase.from('daily_progress').select('completed_at, hearted')
      .eq('course', COURSE.id).eq('day', n).maybeSingle();
    hearted = !!data?.hearted; done = !!data?.completed_at;
  }
  const prev = DAYS.find((d) => d.day === n - 1);
  const next = DAYS.find((d) => d.day === n + 1);
  const signIn = `/login?next=/learn/${n}`;

  return (
    <div className="page">
      <p className="sub" style={{ margin: '0 0 10px' }}><Link href="/learn">← All daily lessons</Link></p>
      <DayCard lesson={lesson} />
      <TryIt lesson={lesson} />
      {error && <p className="err" role="alert" style={{ textAlign: 'center' }}>{error}</p>}
      <div className="dayact">
        {viewer ? (
          <>
            <form action={setDayDone}>
              <input type="hidden" name="day" value={n} /><input type="hidden" name="done" value={done ? '0' : '1'} />
              <button className={'btn' + (done ? '' : ' primary')} type="submit">{done ? 'Done ✓ (undo)' : 'I did today’s activity'}</button>
            </form>
            <form action={toggleHeart}>
              <input type="hidden" name="day" value={n} />
              <button className="heart" type="submit" aria-pressed={hearted}>{hearted ? '♥ Hearted' : '♡ React with a heart'}</button>
            </form>
          </>
        ) : (
          <Link className="heart" href={signIn}>♡ Sign in to react and track your days</Link>
        )}
      </div>
      <p className="script signoff">{lesson.signoff}</p>
      <div className="daynav">
        {prev ? <Link className="btn quiet" href={`/learn/${prev.day}`}>← Day {prev.day}</Link> : <span />}
        {next && <Link className="btn" href={`/learn/${next.day}`}>Day {next.day} →</Link>}
      </div>
    </div>
  );
}
