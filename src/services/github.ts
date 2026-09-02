/**
 * Thin GitHub REST API client used by the "Linked Items" feature on quests.
 *
 * Calls go straight from the browser to api.github.com — GitHub's API returns
 * `Access-Control-Allow-Origin: *`, so no backend/proxy is required. The token
 * is supplied by the user (Settings → Integrations) and stored in IndexedDB;
 * see db/operations.ts for the export-redaction handling of that token.
 */

export interface GithubIssueResult {
  number: number
  url: string
  title: string
  /** "open" | "closed" */
  state: string
}

interface GithubApiError {
  message?: string
}

function parseRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.trim().split('/')
  if (!owner || !name) {
    throw new Error('Repo must be in "owner/repo" format')
  }
  return { owner, name }
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as GithubApiError | null
  return data?.message ?? `GitHub request failed (${res.status})`
}

/** Verifies the token works and returns the authenticated username. */
export async function testGithubConnection(token: string): Promise<{ login: string }> {
  const res = await fetch('https://api.github.com/user', { headers: authHeaders(token) })
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json()
  return { login: data.login }
}

export async function createGithubIssue(
  token: string,
  repo: string,
  title: string,
  body: string,
): Promise<GithubIssueResult> {
  const { owner, name } = parseRepo(repo)
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/issues`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json()
  return { number: data.number, url: data.html_url, title: data.title, state: data.state }
}

export async function getGithubIssueStatus(
  token: string,
  repo: string,
  issueNumber: number,
): Promise<GithubIssueResult> {
  const { owner, name } = parseRepo(repo)
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json()
  return { number: data.number, url: data.html_url, title: data.title, state: data.state }
}

/** Parses "https://github.com/owner/repo/issues/123" (also matches /pull/123). */
export function parseGithubIssueUrl(
  url: string,
): { owner: string; repo: string; number: number } | null {
  const match = url
    .trim()
    .match(/github\.com\/([^/\s]+)\/([^/\s]+)\/(?:issues|pull)\/(\d+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2], number: Number(match[3]) }
}
