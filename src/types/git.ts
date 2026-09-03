/**
 * Git domain model for the World Tree visualization.
 *
 * This layer is pure DATA. It knows nothing about SVG, geometry or fantasy.
 * Pipeline:  raw Git topology -> semantic skeleton -> organic geometry -> rendering
 */

export interface GitCommit {
  sha: string
  shortSha: string
  message: string
  author: string
  authorAvatar: string | null
  date: string
  parents: string[]
  url: string
}

export interface GitBranch {
  name: string
  headSha: string
  isDefault: boolean
  isProtected: boolean
}

export type PullRequestState = 'open' | 'merged' | 'closed'

export interface GitPullRequest {
  number: number
  title: string
  state: PullRequestState
  headRef: string
  baseRef: string
  mergeCommitSha: string | null
  author: string
  authorAvatar: string | null
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  draft: boolean
  url: string
}

export interface GitRepoMeta {
  owner: string
  name: string
  fullName: string
  description: string
  defaultBranch: string
  stars: number
  forks: number
  url: string
  createdAt: string
  pushedAt: string
}

/**
 * Everything the layout algorithm is allowed to see.
 * `commits` is a flat pool keyed by sha; `commitsByBranch` holds the ordered
 * (newest -> oldest) sha walk that GitHub reported for each ref.
 */
export interface GitTopology {
  repo: GitRepoMeta
  branches: GitBranch[]
  commits: Record<string, GitCommit>
  commitsByBranch: Record<string, string[]>
  pullRequests: GitPullRequest[]
  truncated: boolean
  fetchedAt: string
}

export interface GitRepoRecord {
  /** `${owner}/${name}` lowercased */
  id: string
  owner: string
  name: string
  topology: GitTopology
  fetchedAt: string
}

export interface GitConfig {
  id: 'default'
  /** optional GitHub personal access token, stored locally only */
  token: string
  lastRepoId: string | null
}
