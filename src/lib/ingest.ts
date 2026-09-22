import { buildExcerpt, extractPreheader, sanitizeEmailHtml } from './sanitize';
import { issueSlug } from './slug';
import type { IssueMeta } from './issues';

export interface IngestInput {
  subject: string;
  html: string;
  sentAt?: string;
  preheader?: string;
  flodeskId?: string | null;
  /** Override the generated slug. Mostly useful for re-importing old issues. */
  slug?: string;
}

export interface PreparedIssue {
  meta: IssueMeta;
  html: string;
  files: { path: string; content: string }[];
}

/** Shortest believable newsletter. Anything under this is a bounce or an auto-reply. */
const MIN_HTML_LENGTH = 200;

/**
 * Different senders label the same fields differently — Zapier's email parser
 * uses `body_html`, Gmail's trigger uses `bodyHtml`, a hand-rolled curl uses
 * `html`. Accept all of them rather than making the sender match one shape.
 */
export function normalizeIngestPayload(body: Record<string, unknown>): IngestInput {
  const pick = (...keys: string[]): string => {
    for (const key of keys) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  return {
    subject: pick('subject', 'Subject', 'title', 'email_subject'),
    html: pick('html', 'body_html', 'bodyHtml', 'body', 'html_body', 'bodyHTML'),
    sentAt: pick('sentAt', 'date', 'Date', 'received_at', 'sent_at') || undefined,
    preheader: pick('preheader', 'preview_text', 'previewText', 'snippet') || undefined,
    flodeskId: pick('flodeskId', 'flodesk_id') || null,
    slug: pick('slug') || undefined,
  };
}

export function prepareIssue(input: IngestInput): PreparedIssue {
  const subject = input.subject.trim();
  if (!subject) throw new IngestError('Missing subject');
  if (!input.html || input.html.trim().length < MIN_HTML_LENGTH) {
    throw new IngestError('Missing or suspiciously short HTML body');
  }

  const parsed = input.sentAt ? new Date(input.sentAt) : new Date();
  const sentAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const html = sanitizeEmailHtml(input.html);
  const slug = input.slug?.trim() || issueSlug(subject, sentAt);

  const meta: IssueMeta = {
    slug,
    subject,
    preheader: input.preheader?.trim() || extractPreheader(html).preheader,
    excerpt: buildExcerpt(html),
    sentAt: sentAt.toISOString(),
    flodeskId: input.flodeskId ?? null,
  };

  return {
    meta,
    html,
    files: [
      { path: `content/issues/${slug}.json`, content: `${JSON.stringify(meta, null, 2)}\n` },
      { path: `content/issues/${slug}.html`, content: `${html}\n` },
    ],
  };
}

export class IngestError extends Error {}
