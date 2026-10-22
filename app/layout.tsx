import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { getViewer } from '@/lib/auth';
import { signOut } from './actions';
import { BRAND } from '@/lib/brand';
import { WaveBand } from '@/components/art';

export const metadata: Metadata = {
  title: { default: `${BRAND.name}: riyaz practice and daily Carnatic lessons`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
};
export const dynamic = 'force-dynamic';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const p = viewer?.profile;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Tiro+Devanagari+Hindi&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site">
          <div className="brand">
            <Link href="/"><span className="wordmark">{BRAND.name}</span><span className="tagline">{BRAND.tagline}</span></Link>
          </div>
          <nav className="nav" aria-label="Main">
            <Link href="/learn">Daily lessons</Link>
            <Link href="/practice">Practice</Link>
            {p && <Link href="/progress">Progress</Link>}
            {p?.role === 'student' && <Link href="/classes">My classes</Link>}
            {p?.role === 'teacher' && <Link href="/teacher">Teacher</Link>}
            {p ? (
              <>
                <span className="who">{p.display_name}</span>
                <form action={signOut} className="inline"><button type="submit">Sign out</button></form>
              </>
            ) : (
              <><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></>
            )}
          </nav>
        </header>
        <main>{children}</main>
        <WaveBand />
        <p className="script" style={{ textAlign: 'center', fontSize: 20, margin: '8px 0 0', color: 'var(--muted)' }}>{BRAND.name} · {BRAND.tagline}</p>
      </body>
    </html>
  );
}
