import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Archive`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} — Archive`,
    description: site.description,
  },
  alternates: {
    types: { 'application/rss+xml': `${site.url}/rss.xml` },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="masthead">
          <div className="wrap masthead-inner">
            <Link href="/" className="wordmark">
              {site.name}
            </Link>
            <nav>
              <Link href="/">Archive</Link>
              {site.signupUrl ? (
                <a href={site.signupUrl} target="_blank" rel="noreferrer">
                  Subscribe
                </a>
              ) : null}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="foot wrap">
          <span>
            © {new Date().getFullYear()} {site.author}
          </span>
          <span>
            <a href="/rss.xml">RSS</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
