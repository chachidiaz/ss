# The Six Figure Insider — Archive

A public, searchable home for every issue of The Six Figure Insider, so new
subscribers can read everything they missed.

Write and send the newsletter in Flodesk exactly as you do now. A copy lands in
a dedicated mailbox, an automation posts it here, and the issue is live a minute
later. Nothing to copy, paste or reformat.

**Setup instructions live in [SETUP.md](./SETUP.md).**

## How it works

```
  Flodesk send
       │
       ▼
  archive mailbox  ──▶  Zap (Gmail → Webhook)  ──▶  POST /api/ingest
   (a subscriber                                         │
    like you+archive@…)                                  ▼
                                            commit to content/issues/
                                                         │
                                                         ▼
                                              Vercel rebuild → live
```

Flodesk has no API for reading the content of a sent email, so the archive is
fed from the sent email itself. That turns out to be the better source anyway:
it is exactly what subscribers saw, design and all.

Each issue is stored as two files in `content/issues/`:

| File | Contents |
| --- | --- |
| `<slug>.html` | The email's HTML, cleaned up |
| `<slug>.json` | Subject, send date, preview text, excerpt |

On the way in, the ingest step strips `<script>` tags and inline event handlers,
removes open-tracking pixels, and turns the unsubscribe and preferences links
into plain text — otherwise a reader clicking "Unsubscribe" in the archive would
unsubscribe your archive mailbox. Issues render inside a sandboxed iframe, which
keeps the email's own table layout and CSS from leaking into the site.

## Three ways to add an issue

1. **Automatic** — the Zap above. Set it up once and forget it.
2. **Ask Claude** — "archive the latest newsletter". The
   [`archive-newsletter` skill](./.claude/skills/archive-newsletter/SKILL.md)
   pulls it from Gmail and publishes it.
3. **By hand** — for backfilling old issues or when something goes wrong:

   ```bash
   npm run archive:add -- ~/Downloads/issue.eml
   npm run archive:add -- ./issue.html --subject "Stop pricing like a beginner" --date 2026-09-19
   git add content/issues && git commit -m "Archive: ..." && git push
   ```

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # what Vercel runs
```

There is a sample email at `scripts/fixtures/sample-newsletter.html` if you want
to see the archive with something in it:

```bash
npm run archive:add -- scripts/fixtures/sample-newsletter.html \
  --subject "Stop pricing like a beginner" --date 2026-09-19
```

Delete the two generated files from `content/issues/` when you're done.

## Project layout

```
content/issues/          archived issues (the actual content)
src/app/                 pages, RSS, sitemap, /api/ingest
src/lib/sanitize.ts      email HTML cleanup
src/lib/ingest.ts        turns an email into an archived issue
src/lib/github.ts        commits issues from the webhook
scripts/add-issue.ts     the manual command
```
