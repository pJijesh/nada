import type { Metadata } from 'next';
import AuthForm from '@/components/AuthForm';
import { safeNext, supabaseConfigured } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="page narrow">
      <h1>Create your account</h1>
      <p className="lead">Students save progress and join a teacher’s class. Teachers make classes and assign lines.</p>
      <section className="card"><AuthForm mode="signup" next={safeNext(next)} configured={supabaseConfigured()} /></section>
    </div>
  );
}
