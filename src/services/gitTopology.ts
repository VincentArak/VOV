import type {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitRepoMeta,
  GitTopology,
  PullRequestState,
} from '../types/git'

const API = 'https://api.github.com'

/** Keeps the request budget sane on the unauthenticated 60/hr rate limit. */
const MAX_SIDE_BRANCHES = 14
const TRUNK_COMMIT_PAGE = 100
const BRANCH_COMMIT_PAGE = 40

export class GitHubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

export function parseRepoInput(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim().replace(/\.git$/, '').replace(/\/+$/, '')
  if (!trimmed) return null
  const url = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)/i)
  if (url) return { owner: url[1], name: url[2] }
  const slug = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (slug) return { owner: slug[1], name: slug[2] }
  return null
}

async function gh<T>(path: string, token: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) detail = body.message
    } catch {
      /* keep statusText */
    }
    if (res.status === 403 && /rate limit/i.test(detail)) {
      throw new GitHubError(
        'GitHub rate limit reached. Add a personal access token to keep exploring.',
        403,
      )
    }
    if (res.status === 404) {
      throw new GitHubError(
        'Repository not found. Private repositories need a personal access token.',
        404,
      )
    }
    throw new GitHubError(detail, res.status)
  }
  return (await res.json()) as T
}

/* ---------- raw GitHub response shapes (only the fields we consume) ---------- */

interface RawRepo {
  name: string
  full_name: string
  description: string | null
  default_branch: string
  stargazers_count: number
  forks_count: number
  html_url: string
  created_at: string
  pushed_at: string
  owner: { login: string }
}

interface RawBranch {
  name: string
  protected?: boolean
  commit: { sha: string }
}

interface RawCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { name?: string; date?: string } | null
  }
  author: { login?: string; avatar_url?: string } | null
  parents: { sha: string }[]
}

interface RawPull {
  number: number
  title: string
  state: string
  draft?: boolean
  merged_at: string | null
  closed_at: string | null
  created_at: string
  html_url: string
  merge_commit_sha: string | null
  head: { ref: string }
  base: { ref: string }
  user: { login?: string; avatar_url?: string } | null
}

function normalizeCommit(raw: RawCommit): GitCommit {
  const message = raw.commit.message ?? ''
  return {
    sha: raw.sha,
    shortSha: raw.sha.slice(0, 7),
    message: message.split('\n')[0].trim() || '(no message)',
    author: raw.author?.login ?? raw.commit.author?.name ?? 'unknown',
    authorAvatar: raw.author?.avatar_url ?? null,
    date: raw.commit.author?.date ?? new Date(0).toISOString(),
    parents: raw.parents.map((p) => p.sha),
    url: raw.html_url,
  }
}

function pullState(raw: RawPull): PullRequestState {
  if (raw.merged_at) return 'merged'
  if (raw.state === 'closed') return 'closed'
  return 'open'
}

/**
 * Pull a repository's real topology. Requests are bounded so the visualization
 * stays usable on the anonymous rate limit; `truncated` reports when we clipped.
 */
export async function fetchTopology(
  owner: string,
  name: string,
  token = '',
  onProgress?: (message: string) => void,
): Promise<GitTopology> {
  const slug = `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`

  onProgress?.('Reading the repository charter…')
  const rawRepo = await gh<RawRepo>(`/repos/${slug}`, token)

  const repo: GitRepoMeta = {
    owner: rawRepo.owner.login,
    name: rawRepo.name,
    fullName: rawRepo.full_name,
    description: rawRepo.description ?? '',
    defaultBranch: rawRepo.default_branch,
    stars: rawRepo.stargazers_count,
    forks: rawRepo.forks_count,
    url: rawRepo.html_url,
    createdAt: rawRepo.created_at,
    pushedAt: rawRepo.pushed_at,
  }

  onProgress?.('Counting living branches…')
  const [rawBranches, rawPulls] = await Promise.all([
    gh<RawBranch[]>(`/repos/${slug}/branches?per_page=100`, token),
    gh<RawPull[]>(`/repos/${slug}/pulls?state=all&per_page=100&sort=updated&direction=desc`, token),
  ])

  const pullRequests: GitPullRequest[] = rawPulls.map((p) => ({
    number: p.number,
    title: p.title,
    state: pullState(p),
    headRef: p.head.ref,
    baseRef: p.base.ref,
    mergeCommitSha: p.merged_at ? p.merge_commit_sha : null,
    author: p.user?.login ?? 'unknown',
    authorAvatar: p.user?.avatar_url ?? null,
    createdAt: p.created_at,
    mergedAt: p.merged_at,
    closedAt: p.closed_at,
    draft: Boolean(p.draft),
    url: p.html_url,
  }))

  const branches: GitBranch[] = rawBranches.map((b) => ({
    name: b.name,
    headSha: b.commit.sha,
    isDefault: b.name === repo.defaultBranch,
    isProtected: Boolean(b.protected),
  }))

  // Branch budget: default trunk first, then branches with open PRs, then any
  // branch touched by a PR, then the rest in stable alphabetical order.
  const openPrRefs = new Set(pullRequests.filter((p) => p.state === 'open').map((p) => p.headRef))
  const anyPrRefs = new Set(pullRequests.map((p) => p.headRef))
  const rank = (b: GitBranch) =>
    b.isDefault ? 0 : openPrRefs.has(b.name) ? 1 : anyPrRefs.has(b.name) ? 2 : 3
  const ordered = [...branches].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))

  const sideBranches = ordered.filter((b) => !b.isDefault).slice(0, MAX_SIDE_BRANCHES)
  const truncated = branches.length - 1 > sideBranches.length

  const commits: Record<string, GitCommit> = {}
  const commitsByBranch: Record<string, string[]> = {}

  const loadRef = async (ref: string, perPage: number) => {
    const raws = await gh<RawCommit[]>(
      `/repos/${slug}/commits?sha=${encodeURIComponent(ref)}&per_page=${perPage}`,
      token,
    )
    const shas: string[] = []
    raws.forEach((raw) => {
      const commit = normalizeCommit(raw)
      commits[commit.sha] = commit
      shas.push(commit.sha)
    })
    commitsByBranch[ref] = shas
  }

  onProgress?.(`Tracing the trunk of ${repo.defaultBranch}…`)
  await loadRef(repo.defaultBranch, TRUNK_COMMIT_PAGE)

  for (const branch of sideBranches) {
    onProgress?.(`Following the limb ${branch.name}…`)
    try {
      await loadRef(branch.name, BRANCH_COMMIT_PAGE)
    } catch {
      // A branch we cannot read simply grows no limb; the rest of the tree stands.
      commitsByBranch[branch.name] = [branch.headSha]
    }
  }

  return {
    repo,
    branches: [...branches].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)),
    commits,
    commitsByBranch,
    pullRequests,
    truncated,
    fetchedAt: new Date().toISOString(),
  }
}
