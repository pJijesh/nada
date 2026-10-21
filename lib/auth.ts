import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Lesson } from '@/lib/content';
import { FALLBACK_LESSONS } from '@/lib/seed-lessons';

export interface Profile { id: string; display_name: string; role: 'student' | 'teacher' }

export function supabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Signed-in user and profile, or null (also null when Supabase is not configured). */
export async function getViewer() {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id, display_name, role').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  return { supabase, user, profile: profile as Profile };
}

export async function requireViewer(role?: 'student' | 'teacher') {
  const v = await getViewer();
  if (!v) redirect('/login');
  if (role && v.profile.role !== role) redirect(v.profile.role === 'teacher' ? '/teacher' : '/classes');
  return v;
}

export async function loadLessons(): Promise<Lesson[]> {
  if (!supabaseConfigured()) return FALLBACK_LESSONS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lessons').select('id, tradition, grp, name, notes, scale').eq('published', true).order('sort_order');
    if (error || !data?.length) return FALLBACK_LESSONS;
    return data as Lesson[];
  } catch {
    return FALLBACK_LESSONS;
  }
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = '/practice'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}
