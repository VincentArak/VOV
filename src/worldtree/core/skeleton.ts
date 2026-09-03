import type { GitBranch, GitCommit, GitPullRequest, GitTopology } from '../../types/git'

/**
 * STAGE 2 of the pipeline:  raw Git topology -> SEMANTIC SKELETON
 *
 * Nothing here knows about pixels, SVG or fantasy. It answers only structural
 * questions: what is the trunk, which limbs fork from it, where do they fork,
 * where do they reconnect, and how are they stacked so they do not collide.
 * The organic geometry stage consumes this and never re-reads the Git data.
 */

export type LimbStatus = 'trunk' | 'growing' | 'merged' | 'severed'

export interface SkeletonCommit {
  sha: string
  /** 0 = oldest commit unique to this limb */
  index: number
  /** normalized position along the limb, 0 (base) -> 1 (tip) */
  u: number
  isMerge: boolean
  isRoot: boolean
}

export interface SkeletonLimb {
  id: string
  branch: GitBranch
  depth: number
  parentId: string | null
  /** commit on the parent limb where this one diverges */
  forkSha: string | null
  forkU: number
  /** commit on the parent limb where this one flows back in */
  mergeSha: string | null
  mergeU: number | null
  status: LimbStatus
  /** -1 grows left of its parent, +1 grows right */
  side: -1 | 1
  /** outward stacking slot among siblings on the same side */
  lane: number
  commits: SkeletonCommit[]
  pullRequests: GitPullRequest[]
  /** true when the branch head is already contained in its parent (a bud, not a limb) */
  isStub: boolean
  /** true when the fork point fell outside the fetched history and was clamped */
  approximateFork: boolean
  /** how far outward this limb reaches, 0..1, from its commit weight */
  vigor: number
}

export interface TreeSkeleton {
  trunk: SkeletonLimb
  limbs: SkeletonLimb[]
  /** trunk + limbs */
  all: SkeletonLimb[]
  byId: Map<string, SkeletonLimb>
  stats: {
    commits: number
    branches: number
    openPullRequests: number
    mergedPullRequests: number
    contributors: number
    truncated: boolean
  }
}

const MAX_LIMB_COMMITS = 24

/**
 * The single most important correctness detail in this file.
 *
 * `GET /commits?sha=<ref>` (like `git log <ref>`) returns EVERY commit reachable
 * from the ref, so a merged feature branch's commits appear inside main's list.
 * Walking that list would let the trunk swallow every branch it ever merged and
 * leave the branches as stubs. Following first parents instead gives the spine
 * that actually belongs to the ref, and leaves each merged branch's own commits
 * unclaimed so they can grow into a real limb.
 */
function firstParentWalk(
  head: string | undefined,
  commits: Record<string, GitCommit>,
  limit = 400,
): string[] {
  const walk: string[] = []
  const seen = new Set<string>()
  let cursor = head
  while (cursor && !seen.has(cursor) && walk.length < limit) {
    seen.add(cursor)
    walk.push(cursor)
    const commit = commits[cursor]
    if (!commit) break
    cursor = commit.parents[0]
  }
  return walk
}

function normalizeU(index: number, count: number): number {
  if (count <= 1) return 1
  return index / (count - 1)
}

export function buildSkeleton(topology: GitTopology): TreeSkeleton {
  const { repo, branches, commits, commitsByBranch, pullRequests } = topology

  const defaultBranch =
    branches.find((b) => b.isDefault) ??
    branches.find((b) => b.name === repo.defaultBranch) ??
    branches[0]

  /* ---------------- trunk ---------------- */

  const defaultHead = defaultBranch?.headSha ?? commitsByBranch[repo.defaultBranch]?.[0]
  const trunkWalk = firstParentWalk(defaultHead, commits)
  const trunkShas = [...trunkWalk].reverse() // oldest -> newest

  const owner = new Map<string, string>()
  const trunkId = defaultBranch?.name ?? repo.defaultBranch

  const makeCommits = (shas: string[]): SkeletonCommit[] =>
    shas.map((sha, i) => {
      const commit = commits[sha]
      return {
        sha,
        index: i,
        u: normalizeU(i, shas.length),
        isMerge: (commit?.parents.length ?? 0) > 1,
        isRoot: (commit?.parents.length ?? 0) === 0,
      }
    })

  const trunk: SkeletonLimb = {
    id: trunkId,
    branch:
      defaultBranch ??
      { name: repo.defaultBranch, headSha: trunkShas.at(-1) ?? '', isDefault: true, isProtected: false },
    depth: 0,
    parentId: null,
    forkSha: null,
    forkU: 0,
    mergeSha: null,
    mergeU: null,
    status: 'trunk',
    side: 1,
    lane: 0,
    commits: makeCommits(trunkShas),
    pullRequests: pullRequests.filter((p) => p.baseRef === repo.defaultBranch && p.state === 'open'),
    isStub: false,
    approximateFork: false,
    vigor: 1,
  }
  trunkShas.forEach((sha) => owner.set(sha, trunk.id))

  const byId = new Map<string, SkeletonLimb>([[trunk.id, trunk]])
  const limbs: SkeletonLimb[] = []

  /* ---------------- limbs ----------------
   * Branches are attached nearest-first: the number of commits between a head
   * and the first already-claimed commit tells us how close to the existing
   * tree it is, so a branch forked off another branch lands on that branch
   * instead of stealing its commits.
   */

  const pending = branches.filter((b) => b.name !== trunk.id)

  const distanceToTree = (branch: GitBranch): number => {
    const hit = firstParentWalk(branch.headSha, commits).findIndex((sha) => owner.has(sha))
    return hit === -1 ? Number.POSITIVE_INFINITY : hit
  }

  const attached = new Set<string>()

  const attach = (branch: GitBranch) => {
    const walk = firstParentWalk(branch.headSha, commits) // newest -> oldest
    const hitIndex = walk.findIndex((sha) => owner.has(sha))

    let parent: SkeletonLimb
    let forkSha: string | null
    let approximateFork = false
    let uniqueShas: string[]

    if (hitIndex === -1) {
      // Fork point is older than the history we were allowed to fetch.
      parent = trunk
      forkSha = trunk.commits[0]?.sha ?? null
      approximateFork = true
      uniqueShas = [...walk].reverse()
    } else {
      forkSha = walk[hitIndex]
      parent = byId.get(owner.get(forkSha)!) ?? trunk
      uniqueShas = walk.slice(0, hitIndex).reverse() // oldest -> newest
    }

    // Long-running branches are clipped at the tip; the oldest commits stay
    // near the fork so the shape of the divergence is preserved.
    if (uniqueShas.length > MAX_LIMB_COMMITS) {
      uniqueShas = [
        ...uniqueShas.slice(0, 2),
        ...uniqueShas.slice(uniqueShas.length - (MAX_LIMB_COMMITS - 2)),
      ]
    }

    const uniqueSet = new Set(uniqueShas)
    uniqueShas.forEach((sha) => owner.set(sha, branch.name))

    const parentCommitU = (sha: string | null): number => {
      if (!sha) return 0
      const found = parent.commits.find((c) => c.sha === sha)
      return found ? found.u : 0
    }

    const branchPrs = pullRequests.filter((p) => p.headRef === branch.name)
    const mergedPr = branchPrs.find((p) => p.state === 'merged')

    /* --- where does it flow back in? --- */
    let mergeSha: string | null = null

    if (mergedPr?.mergeCommitSha && owner.get(mergedPr.mergeCommitSha) === parent.id) {
      mergeSha = mergedPr.mergeCommitSha
    }
    if (!mergeSha) {
      // A merge commit on the parent whose non-first parent belongs to us.
      const found = parent.commits.find((c) => {
        if (!c.isMerge) return false
        const parents = commits[c.sha]?.parents ?? []
        return parents.slice(1).some((p) => uniqueSet.has(p) || p === branch.headSha)
      })
      if (found) mergeSha = found.sha
    }
    if (!mergeSha && uniqueShas.length === 0 && owner.get(branch.headSha) === parent.id) {
      // Fully contained in the parent: the branch pointer sits on the trunk.
      mergeSha = branch.headSha
    }

    const closedPr = branchPrs.find((p) => p.state === 'closed')
    const status: LimbStatus = mergeSha || mergedPr ? 'merged' : closedPr ? 'severed' : 'growing'

    const limb: SkeletonLimb = {
      id: branch.name,
      branch,
      depth: parent.depth + 1,
      parentId: parent.id,
      forkSha,
      forkU: parentCommitU(forkSha),
      mergeSha,
      mergeU: mergeSha ? parentCommitU(mergeSha) : null,
      status,
      side: 1,
      lane: 0,
      commits: makeCommits(uniqueShas),
      pullRequests: branchPrs,
      isStub: uniqueShas.length === 0,
      approximateFork,
      vigor: Math.min(1, 0.34 + uniqueShas.length / 14),
    }

    limbs.push(limb)
    byId.set(limb.id, limb)
    attached.add(branch.name)
  }

  // Repeated nearest-first passes so depth builds outward from the trunk.
  let guard = 0
  while (attached.size < pending.length && guard++ < pending.length + 2) {
    const next = pending
      .filter((b) => !attached.has(b.name))
      .sort((a, b) => distanceToTree(a) - distanceToTree(b) || a.name.localeCompare(b.name))[0]
    if (!next) break
    attach(next)
  }

  /* ---------------- side + lane packing ----------------
   * Limbs are stacked so two branches never grow through each other. Spans are
   * measured in the parent's own 0..1 commit space, which is monotonic in Y.
   */

  const childrenOf = new Map<string, SkeletonLimb[]>()
  limbs.forEach((l) => {
    const list = childrenOf.get(l.parentId!) ?? []
    list.push(l)
    childrenOf.set(l.parentId!, list)
  })

  childrenOf.forEach((children, parentId) => {
    const parent = byId.get(parentId)
    const ordered = [...children].sort((a, b) => a.forkU - b.forkU || a.id.localeCompare(b.id))
    // Side alternates so the silhouette stays balanced; a limb inherits its
    // parent's outward direction once we are off the trunk.
    const lanesBySide: Record<number, { end: number }[]> = { [-1]: [], [1]: [] }

    ordered.forEach((limb, i) => {
      const side: -1 | 1 = parent && parent.depth > 0 ? parent.side : i % 2 === 0 ? -1 : 1
      limb.side = side

      const reach = limb.mergeU !== null ? limb.mergeU : Math.min(1, limb.forkU + 0.12 + limb.vigor * 0.34)
      const span = { start: limb.forkU, end: Math.max(reach, limb.forkU + 0.06) }

      const lanes = lanesBySide[side]
      let lane = 0
      while (lane < lanes.length && lanes[lane].end > span.start - 0.035) lane += 1
      lanes[lane] = { end: span.end }
      limb.lane = lane
    })
  })

  const contributors = new Set(Object.values(commits).map((c) => c.author))

  return {
    trunk,
    limbs,
    all: [trunk, ...limbs],
    byId,
    stats: {
      commits: Object.keys(commits).length,
      branches: branches.length,
      openPullRequests: pullRequests.filter((p) => p.state === 'open').length,
      mergedPullRequests: pullRequests.filter((p) => p.state === 'merged').length,
      contributors: contributors.size,
      truncated: topology.truncated || trunkShas.length >= 100,
    },
  }
}
