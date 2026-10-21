import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { getViewer } from '@/lib/auth';
import { signOut } from './actions';

export const metadata: Metadata = {
  title: { default: 'Sur: riyaz practice for Hindustani and Carnatic singers', template: '%s · Sur' },
  description: 'Free, in-browser riyaz practice with tanpura, tabla and live pitch feedback, for Hindustani and Carnatic students and their teachers.',
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
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Tiro+Devanagari+Hindi&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site">
          <div className="brand">
            <Link href="/"><span className="wordmark">Sur</span></Link>
            <span className="tag">beta</span>
          </div>
          <nav className="nav" aria-label="Main">
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
      </body>
    </html>
  );
}
