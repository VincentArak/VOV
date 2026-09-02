/**
 * Thin GitHub REST API client used by the "Linked Items" feature on quests.
 *
 * Calls go straight from the browser to api.github.com — GitHub's API returns
 * `Access-Control-Allow-Origin: *`, so no backend/proxy is required. The token
 * is supplied by the user (Settings → Integrations) and stored in IndexedDB;
 * see db/operations.ts for the export-redaction handling of that token.
 */

/**
 * `state` collapses GitHub's separate issue/PR vocabularies into one value
 * the UI can render directly.
 *
 * The distinction that matters here is merged versus closed. GitHub's REST
 * API reports a merged pull request as `state: "closed"`, which in a
 * ticket-to-PR workflow is exactly wrong: shipped work and abandoned work
 * would look identical on the quest. A PR carries a `merged_at` timestamp,
 * so we promote that to a first-class state.
 */
export type GithubState = 'open' | 'closed' | 'merged' | 'draft'

export interface GithubIssueResult {
  number: number
  url: string
  title: string
  state: GithubState
  /** True when the linked item is a pull request rather than an issue. */
  isPullRequest: boolean
}

interface GithubItemPayload {
  number: number
  html_url: string
  title: string
  state: string
  draft?: boolean
  merged_at?: string | null
  pull_request?: { merged_at?: string | null }
}

function toResult(data: GithubItemPayload): GithubIssueResult {
  // The issues endpoint marks a PR with a `pull_request` object; the pulls
  // endpoint returns `merged_at` at the top level.
  const isPullRequest = Boolean(data.pull_request || data.merged_at !== undefined)
  const mergedAt = data.merged_at ?? data.pull_request?.merged_at ?? null

  let state: GithubState
  if (mergedAt) state = 'merged'
  else if (data.state === 'open' && data.draft) state = 'draft'
  else state = data.state === 'closed' ? 'closed' : 'open'

  return { number: data.number, url: data.html_url, title: data.title, state, isPullRequest }
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
  return toResult(await res.json())
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

  // The issues endpoint knows an item is a PR but not whether it merged, so
  // a second call to the pulls endpoint is required to tell shipped from
  // abandoned. Failing that call is not fatal — fall back to open/closed.
  if (data.pull_request) {
    try {
      const prRes = await fetch(
        `https://api.github.com/repos/${owner}/${name}/pulls/${issueNumber}`,
        { headers: authHeaders(token) },
      )
      if (prRes.ok) return toResult(await prRes.json())
    } catch {
      /* fall through to the issue payload */
    }
  }
  return toResult(data)
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
