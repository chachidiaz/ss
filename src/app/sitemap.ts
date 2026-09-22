import type { MetadataRoute } from 'next';
import { listIssues } from '@/lib/issues';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const issues = listIssues();

  return [
    { url: site.url, lastModified: issues[0] ? new Date(issues[0].sentAt) : new Date() },
    ...issues.map((issue) => ({
      url: `${site.url}/issues/${issue.slug}`,
      lastModified: new Date(issue.sentAt),
    })),
  ];
}
