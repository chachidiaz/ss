#!/usr/bin/env tsx
/**
 * Adds a newsletter to the archive from a file on disk.
 *
 * This is the manual path — the webhook at /api/ingest does the same thing
 * automatically. Use it to backfill older issues, or any time an automation
 * misses one.
 *
 *   npm run archive:add -- ~/Downloads/newsletter.eml
 *   npm run archive:add -- ./issue.html --subject "How I hit six figures" --date 2026-09-22
 */

import fs from 'node:fs';
import path from 'node:path';
import { simpleParser } from 'mailparser';
import { prepareIssue } from '../src/lib/ingest';

interface Args {
  file: string;
  subject?: string;
  date?: string;
  slug?: string;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=');
      flags[key] = inline ?? argv[++i] ?? '';
    } else {
      positional.push(arg);
    }
  }

  if (!positional[0]) {
    console.error(
      'Usage: npm run archive:add -- <file.eml|file.html> [--subject "..."] [--date YYYY-MM-DD] [--slug ...]',
    );
    process.exit(1);
  }

  return { file: positional[0], subject: flags.subject, date: flags.date, slug: flags.slug };
}

async function readSource(args: Args): Promise<{ subject: string; html: string; sentAt: string }> {
  const raw = fs.readFileSync(args.file);

  // A saved .eml carries the subject and send date in its headers, so nothing
  // needs to be passed on the command line.
  if (path.extname(args.file).toLowerCase() === '.eml') {
    const mail = await simpleParser(raw);
    const html = typeof mail.html === 'string' ? mail.html : '';
    if (!html) throw new Error(`${args.file} has no HTML part`);

    return {
      subject: args.subject ?? mail.subject ?? '',
      html,
      sentAt: args.date ?? mail.date?.toISOString() ?? new Date().toISOString(),
    };
  }

  if (!args.subject) {
    throw new Error('An .html file needs --subject "the email subject line"');
  }

  return {
    subject: args.subject,
    html: raw.toString('utf8'),
    sentAt: args.date ?? fs.statSync(args.file).mtime.toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = await readSource(args);
  const issue = prepareIssue({ ...source, slug: args.slug });

  for (const file of issue.files) {
    const target = path.join(process.cwd(), file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
    console.log(`  wrote ${file.path}`);
  }

  console.log(`\nArchived "${issue.meta.subject}" as ${issue.meta.slug}`);
  console.log('\nPublish it with:');
  console.log(`  git add content/issues && git commit -m "Archive: ${issue.meta.subject}" && git push`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
