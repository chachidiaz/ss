import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmailFrame } from '@/components/EmailFrame';
import { Subscribe } from '@/components/Subscribe';
import { formatSentAt, getIssue, listIssues } from '@/lib/issues';
import { prepareForFrame } from '@/lib/sanitize';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listIssues().map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return { title: 'Issue not found' };

  const description = issue.preheader || issue.excerpt;
  return {
    title: issue.subject,
    description,
    openGraph: {
      type: 'article',
      title: issue.subject,
      description,
      publishedTime: issue.sentAt,
    },
  };
}

export default async function IssuePage({ params }: PageProps) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  // Issues are ordered newest first, so "previous" sits at the higher index.
  const all = listIssues();
  const index = all.findIndex((i) => i.slug === slug);
  const newer = index > 0 ? all[index - 1] : null;
  const older = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  return (
    <div className="wrap">
      <article>
        <header className="issue-header">
          <Link className="back" href="/">
            ← All issues
          </Link>
          <time className="issue-date" dateTime={issue.sentAt}>
            {formatSentAt(issue.sentAt)}
          </time>
          <h1>{issue.subject}</h1>
          {issue.preheader ? <p className="issue-preheader">{issue.preheader}</p> : null}
        </header>

        <EmailFrame html={prepareForFrame(issue.html)} title={issue.subject} />
      </article>

      <Subscribe />

      {newer || older ? (
        <nav className="pager">
          {older ? (
            <Link href={`/issues/${older.slug}`}>
              <span>Previous issue</span>
              {older.subject}
            </Link>
          ) : null}
          {newer ? (
            <Link className="next" href={`/issues/${newer.slug}`}>
              <span>Next issue</span>
              {newer.subject}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
