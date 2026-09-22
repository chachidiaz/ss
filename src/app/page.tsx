import Link from 'next/link';
import { Subscribe } from '@/components/Subscribe';
import { formatSentAt, listIssues } from '@/lib/issues';
import { site } from '@/lib/site';

export default function ArchiveIndex() {
  const issues = listIssues();

  return (
    <div className="wrap">
      <section className="hero">
        <span className="eyebrow">{site.tagline}</span>
        <h1>{site.name}</h1>
        <p>{site.description}</p>
      </section>

      {issues.length === 0 ? (
        <div className="empty">
          <h2>No issues archived yet</h2>
          <p>The first newsletter will appear here automatically once it goes out.</p>
        </div>
      ) : (
        <>
          <p className="section-label">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </p>
          <ul className="issues">
            {issues.map((issue) => (
              <li key={issue.slug}>
                <Link className="issue-link" href={`/issues/${issue.slug}`}>
                  <time className="issue-date" dateTime={issue.sentAt}>
                    {formatSentAt(issue.sentAt)}
                  </time>
                  <h2 className="issue-title">{issue.subject}</h2>
                  <p className="issue-excerpt">{issue.preheader || issue.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Subscribe />
    </div>
  );
}
