import type { Metadata } from 'next';
import Player from '@/components/Player';
import { getViewer, loadLessons } from '@/lib/auth';
import { saveAttempt } from '../actions';

export const metadata: Metadata = { title: 'Practice' };

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const { lesson } = await searchParams;
  const [lessons, viewer] = await Promise.all([loadLessons(), getViewer()]);
  let assignedIds: string[] = [];
  if (viewer?.profile.role === 'student') {
    const { data } = await viewer.supabase.from('assignments').select('lesson_id');
    assignedIds = Array.from(new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id)));
  }
  return (
    <Player
      lessons={lessons}
      assignedIds={assignedIds}
      signedIn={!!viewer}
      initialLessonId={lesson}
      saveAttempt={saveAttempt}
    />
  );
}
