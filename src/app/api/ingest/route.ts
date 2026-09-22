import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { commitFiles, issueExists } from '@/lib/github';
import { IngestError, normalizeIngestPayload, prepareIssue } from '@/lib/ingest';
import { site } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const expected = process.env.ARCHIVE_INGEST_SECRET;
  if (!expected) return false;

  const url = new URL(request.url);
  const presented =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    request.headers.get('x-archive-secret') ??
    url.searchParams.get('secret') ??
    '';

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  try {
    const issue = prepareIssue(normalizeIngestPayload(body));

    // A Flodesk resend delivers the same newsletter twice. Treat the second one
    // as a no-op success so the sender does not keep retrying.
    if (body.force !== true && (await issueExists(issue.meta.slug))) {
      return NextResponse.json({
        ok: true,
        skipped: 'already-archived',
        slug: issue.meta.slug,
        url: `${site.url}/issues/${issue.meta.slug}`,
      });
    }

    const sha = await commitFiles(issue.files, `Archive newsletter: ${issue.meta.subject}`);

    return NextResponse.json({
      ok: true,
      slug: issue.meta.slug,
      url: `${site.url}/issues/${issue.meta.slug}`,
      commit: sha,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof IngestError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Lets you confirm the endpoint and secret are wired up from a browser or curl. */
export async function GET(request: Request) {
  return authorized(request)
    ? NextResponse.json({ ok: true, message: 'Ingest endpoint ready' })
    : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
