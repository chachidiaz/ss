---
name: archive-newsletter
description: Pull a sent newsletter out of Gmail and publish it to The Six Figure Insider archive. Use when the user says they just sent the newsletter, asks to archive an issue, says "add the latest newsletter to the archive", or wants to backfill past issues. Also use when an automatic archive run was missed or failed.
---

# Archive a newsletter issue

Publishes a newsletter that has already been sent in Flodesk to the public
archive in this repo. The archive copy comes from the Gmail inbox that is
subscribed to the newsletter, so it is byte-for-byte what subscribers received.

## Before you start

The archive mailbox is set in `ARCHIVE_MAILBOX` below. If it is still a
placeholder, ask the user which address receives their own newsletter, then
update this file.

```
ARCHIVE_MAILBOX = chachi+archive@emilydiazslp.com
```

## Steps

1. **Find the email.** Use the Zapier Gmail "Find Email" read action
   (`selected_api: GoogleMailV2CLIAPI`, `action: message`,
   `tool_name: gmail_find_email`) with a query that pins down the issue:

   ```
   to:ARCHIVE_MAILBOX newer_than:14d
   ```

   Add `subject:"..."` when the user names a specific issue. The response is
   large — write it straight to a file in the scratchpad rather than reading it
   into the conversation, then pull out `subject`, `body_html` and `date` with a
   short script.

   If several issues match, list the subjects and dates and let the user pick.
   Do not guess which one they meant.

2. **Write the HTML to a file** in the scratchpad directory, e.g.
   `issue.html`. Do not edit or reformat it — the archive is meant to show the
   email exactly as it went out.

3. **Add it to the archive:**

   ```bash
   npm run archive:add -- <path-to-issue.html> \
     --subject "<the exact subject line>" \
     --date "<the date field from Gmail>"
   ```

   This sanitizes the email (strips tracking pixels, neutralizes the
   unsubscribe links) and writes two files into `content/issues/`.

4. **Check the result.** Read the generated `.json` and confirm the subject,
   date, preheader and excerpt look right. A blank excerpt usually means the
   email was an image-only design — mention it rather than silently shipping it.

5. **Publish:**

   ```bash
   git add content/issues && git commit -m "Archive: <subject>" && git push
   ```

   Vercel redeploys on push, so the issue is live about a minute later at
   `/issues/<slug>`. Give the user that URL.

## Backfilling older issues

Same steps with a wider Gmail query (`newer_than:1y`). Archive oldest first so
the commit history reads in order. `npm run archive:add` is idempotent per
slug — running it twice for the same issue overwrites rather than duplicates.

## If the email is not in Gmail

The user can export it from Flodesk (or forward it to themselves) and save it as
`.eml` or `.html`. The same command takes an `.eml` directly and reads the
subject and date from its headers:

```bash
npm run archive:add -- ~/Downloads/issue.eml
```
