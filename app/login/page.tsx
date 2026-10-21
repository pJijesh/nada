import type { Metadata } from 'next';
import AuthForm from '@/components/AuthForm';
import { safeNext, supabaseConfigured } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="page narrow">
      <h1>Sign in</h1>
      <section className="card"><AuthForm mode="login" next={safeNext(next)} configured={supabaseConfigured()} /></section>
    </div>
  );
}
