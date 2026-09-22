import fs from 'node:fs';
import path from 'node:path';

export const ISSUES_DIR = path.join(process.cwd(), 'content', 'issues');

export interface IssueMeta {
  slug: string;
  /** The email subject line, exactly as it was sent. */
  subject: string;
  /** Preview text, if the email had any. */
  preheader: string;
  excerpt: string;
  /** ISO timestamp of when the newsletter went out. */
  sentAt: string;
  /** Flodesk's id for the send, when we know it. Useful for pulling stats later. */
  flodeskId?: string | null;
}

export interface Issue extends IssueMeta {
  html: string;
}

function readMeta(file: string): IssueMeta | null {
  try {
    const raw = fs.readFileSync(path.join(ISSUES_DIR, file), 'utf8');
    const meta = JSON.parse(raw) as IssueMeta;
    if (!meta.slug || !meta.sentAt) return null;
    return meta;
  } catch {
    return null;
  }
}

/** Every archived issue, newest first. */
export function listIssues(): IssueMeta[] {
  if (!fs.existsSync(ISSUES_DIR)) return [];
  return fs
    .readdirSync(ISSUES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map(readMeta)
    .filter((m): m is IssueMeta => m !== null)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export function getIssue(slug: string): Issue | null {
  const meta = readMeta(`${slug}.json`);
  if (!meta) return null;

  const htmlPath = path.join(ISSUES_DIR, `${slug}.html`);
  if (!fs.existsSync(htmlPath)) return null;

  return { ...meta, html: fs.readFileSync(htmlPath, 'utf8') };
}

/** "September 22, 2026" in the newsletter's own timezone, not the server's. */
export function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}
