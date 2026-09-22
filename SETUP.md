# Setting up the archive

About 30 minutes, once. After this, sending the newsletter is the only thing you
ever do — the archive updates itself.

Work through the parts in order. Part 1 gets the site live; Part 2 makes it
automatic.

---

## Part 1 — Put the site online (10 min)

### 1. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `chachidiaz/ss` repository.
2. Leave every build setting alone — Vercel detects Next.js on its own.
3. Deploy. You'll get a URL like `https://ss-abc123.vercel.app`.

You can point a real domain at it later (Vercel → Settings → Domains).
`archive.chachidiaz.com` or `sixfigureinsider.com` both work well.

### 2. Add your Flodesk signup link

In Flodesk, open the signup form for The Six Figure Insider and copy its share
link. Then in Vercel → Settings → Environment Variables, add:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SIGNUP_URL` | your Flodesk form link |
| `NEXT_PUBLIC_SITE_URL` | your live URL, no trailing slash |

The Subscribe buttons stay hidden until `NEXT_PUBLIC_SIGNUP_URL` is set, so the
archive never shows a dead button.

Redeploy (Vercel → Deployments → ⋯ → Redeploy) for these to take effect.

---

## Part 2 — Make it automatic (20 min)

### 3. Create a mailbox that receives your own newsletter

The archive is fed by the sent email, so you need a copy of every send landing
somewhere an automation can read.

Use a **plus address** on the Gmail account you'll connect to Zapier — Gmail
delivers `you+archive@yourdomain.com` straight to `you@yourdomain.com`, and
nothing else will ever arrive at that address, which keeps the automation
precise.

Pick yours now and use it everywhere below:

```
you+archive@yourdomain.com
```

### 4. Subscribe that address in Flodesk

1. Flodesk → Audience → Add subscriber.
2. Enter the plus address from step 3.
3. Add it to **every segment you send The Six Figure Insider to**. If you send
   to a segment it isn't in, that issue won't reach the archive.

Send yourself a test newsletter and confirm it arrives. Don't continue until it
does — everything downstream depends on this.

### 5. Create a GitHub token

The webhook publishes by committing to this repo, so it needs permission to
write to it.

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Repository access** → Only select repositories → `chachidiaz/ss`
3. **Permissions** → Repository permissions → **Contents: Read and write**
4. Set expiration to No expiration (or set a calendar reminder to rotate it).
5. Generate and copy the token — GitHub shows it once.

### 6. Add the remaining environment variables

First generate a secret. In a terminal:

```bash
openssl rand -hex 32
```

Then in Vercel → Settings → Environment Variables, add:

| Name | Value |
| --- | --- |
| `ARCHIVE_INGEST_SECRET` | the random string you just generated |
| `GITHUB_TOKEN` | the token from step 5 |
| `GITHUB_REPO` | `chachidiaz/ss` |
| `GITHUB_BRANCH` | the branch Vercel deploys from (see note below) |

> **Which branch?** This repo starts out on
> `claude/newsletter-archive-workflow-45f5da`. Rename it to `main` in GitHub
> (Settings → Branches) and use `main` here — or leave the name as-is and put
> that exact branch name in `GITHUB_BRANCH`. It has to match the branch Vercel
> builds, or new issues will commit somewhere that never deploys.

Redeploy, then check it took:

```
https://YOUR-SITE.vercel.app/api/ingest?secret=YOUR-SECRET
```

You should see `{"ok":true,"message":"Ingest endpoint ready"}`. A `401` means
the secret doesn't match what's in Vercel.

### 7. Build the Zap

In Zapier, create a Zap with one trigger and one action.

**Trigger — Gmail → New Email Matching Search**

- Account: the Gmail account behind your plus address
- Search String: `to:you+archive@yourdomain.com`

Test the trigger. It should find the test newsletter from step 4.

**Action — Webhooks by Zapier → POST**

- **URL:** `https://YOUR-SITE.vercel.app/api/ingest`
- **Payload Type:** `json`
- **Data:**

  | Field | Value |
  | --- | --- |
  | `subject` | the trigger's **Subject** |
  | `body_html` | the trigger's **Body HTML** |
  | `date` | the trigger's **Date** |

- **Headers:**

  | Field | Value |
  | --- | --- |
  | `Authorization` | `Bearer YOUR-SECRET` |

Test the action. A success looks like:

```json
{ "ok": true, "slug": "2026-09-19-stop-pricing-like-a-beginner",
  "url": "https://YOUR-SITE.vercel.app/issues/..." }
```

Open that URL. If the issue is there, turn the Zap on. **Done.**

---

## From now on

Write and send in Flodesk exactly as you always have. Within about 15 minutes
the issue appears in the archive by itself. (Gmail triggers poll on a schedule —
that delay is Zapier's, not the site's.)

## If an issue doesn't show up

Check in this order:

1. **Did the email reach the archive mailbox?** If not, the address isn't in the
   segment you sent to — fix that in Flodesk (step 4).
2. **Did the Zap run?** Zapier → Zap History. A red run shows the error.
   `401` means the secret is wrong; `400` means the email had no HTML body.
3. **Did the commit land?** Check the repo's commit history for
   "Archive newsletter: …". If it's there, the issue is live.

You can always publish an issue by hand — ask Claude to "archive the latest
newsletter", or run `npm run archive:add`. See the README.

## Good to know

- **Resends don't duplicate.** A newsletter resent to non-openers has the same
  subject and date, so the webhook recognizes it and skips it.
- **Unsubscribe links are neutralized.** In the archive they're plain text, so a
  reader can't accidentally unsubscribe your archive mailbox.
- **Tracking pixels are removed**, so archive reads don't inflate your open rate.
- **To fix a typo in a published issue**, edit the `.html` file in
  `content/issues/` and push. The site rebuilds.
- **To unpublish an issue**, delete its two files from `content/issues/` and
  push.
