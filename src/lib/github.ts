/**
 * Commits archived issues back to this repository.
 *
 * The webhook route runs on Vercel, where the filesystem is read-only, so a new
 * issue is published by committing the two content files through the GitHub API
 * — which is also what triggers Vercel to rebuild and put the issue live.
 */

const API = 'https://api.github.com';

interface CommitFile {
  path: string;
  content: string;
}

function config() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  if (!repo || !repo.includes('/')) throw new Error('GITHUB_REPO must be set to "owner/name"');
  return { token, repo, branch };
}

async function gh<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`GitHub ${init?.method ?? 'GET'} ${url} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Writes several files in a single commit so the archive is never half-published. */
export async function commitFiles(files: CommitFile[], message: string): Promise<string> {
  const { token, repo, branch } = config();

  const ref = await gh<{ object: { sha: string } }>(token, `/repos/${repo}/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;

  const head = await gh<{ tree: { sha: string } }>(token, `/repos/${repo}/git/commits/${headSha}`);

  const blobs = await Promise.all(
    files.map(async (file) => {
      const blob = await gh<{ sha: string }>(token, `/repos/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: Buffer.from(file.content, 'utf8').toString('base64'),
          encoding: 'base64',
        }),
      });
      return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
    }),
  );

  const tree = await gh<{ sha: string }>(token, `/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.tree.sha, tree: blobs }),
  });

  const commit = await gh<{ sha: string }>(token, `/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
  });

  await gh(token, `/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  return commit.sha;
}

/** True when the slug is already archived, so a resend does not create a duplicate. */
export async function issueExists(slug: string): Promise<boolean> {
  const { token, repo, branch } = config();
  const res = await fetch(`${API}/repos/${repo}/contents/content/issues/${slug}.json?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  return res.ok;
}
