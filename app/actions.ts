'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AttemptInput } from '@/components/Player';

function bounce(path: string, error: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(error)}`);
}
function text(form: FormData, key: string, max: number): string {
  return String(form.get(key) ?? '').trim().slice(0, max);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function saveAttempt(a: AttemptInput): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in to save progress' };
  const { error } = await supabase.from('attempts').insert({
    user_id: user.id, lesson_id: a.lesson_id, drill: a.drill, source: a.source,
    sa_note: a.sa_note, sa_oct: a.sa_oct, scale: a.scale, tuning: a.tuning, bpm: a.bpm, taal: a.taal,
    in_tune: a.in_tune, total: a.total, notes: a.notes,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/progress');
  return { ok: true };
}

export async function createClass(form: FormData) {
  const name = text(form, 'name', 80);
  if (!name) bounce('/teacher', 'Give the class a name');
  const supabase = await createClient();
  const { data, error } = await supabase.from('classes').insert({ name }).select('id').single();
  if (error || !data) bounce('/teacher', error?.message ?? 'Could not create the class');
  redirect(`/teacher/${data.id}`);
}

export async function deleteClass(form: FormData) {
  const id = text(form, 'class_id', 64);
  const supabase = await createClient();
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) bounce(`/teacher/${id}`, error.message);
  redirect('/teacher');
}

export async function assignLesson(form: FormData) {
  const classId = text(form, 'class_id', 64);
  const lessonId = text(form, 'lesson_id', 64);
  const note = text(form, 'note', 500);
  const due = text(form, 'due_date', 10);
  const supabase = await createClient();
  const { error } = await supabase.from('assignments').insert({
    class_id: classId, lesson_id: lessonId, note: note || null, due_date: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
  });
  if (error) bounce(`/teacher/${classId}`, error.code === '23505' ? 'That lesson is already assigned' : error.message);
  revalidatePath(`/teacher/${classId}`);
  redirect(`/teacher/${classId}`);
}

export async function unassignLesson(form: FormData) {
  const classId = text(form, 'class_id', 64);
  const supabase = await createClient();
  const { error } = await supabase.from('assignments').delete().eq('id', text(form, 'assignment_id', 64));
  if (error) bounce(`/teacher/${classId}`, error.message);
  revalidatePath(`/teacher/${classId}`);
  redirect(`/teacher/${classId}`);
}

export async function removeStudent(form: FormData) {
  const classId = text(form, 'class_id', 64);
  const supabase = await createClient();
  const { error } = await supabase.from('class_members').delete()
    .eq('class_id', classId).eq('student_id', text(form, 'student_id', 64));
  if (error) bounce(`/teacher/${classId}`, error.message);
  revalidatePath(`/teacher/${classId}`);
  redirect(`/teacher/${classId}`);
}

export async function joinClass(form: FormData) {
  const code = text(form, 'code', 12);
  if (!code) bounce('/classes', 'Enter the class code');
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_class', { code });
  if (error) bounce('/classes', error.message.replace(/^.*?:\s*/, ''));
  revalidatePath('/classes');
  redirect('/classes');
}

export async function leaveClass(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('class_members').delete()
    .eq('class_id', text(form, 'class_id', 64)).eq('student_id', user.id);
  if (error) bounce('/classes', error.message);
  revalidatePath('/classes');
  redirect('/classes');
}
