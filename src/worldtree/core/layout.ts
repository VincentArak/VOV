import type { SkeletonLimb, TreeSkeleton, LimbStatus } from './skeleton'
import {
  Spine,
  add,
  blobPath,
  len,
  norm,
  offsetPath,
  pt,
  ribbon,
  scale,
  smoothPath,
  spinePath,
  sub,
  type Pt,
} from '../geometry/curve'
import { hashSeed, makeNoise, makeRng } from '../geometry/prng'

/**
 * STAGE 3 of the pipeline:  SEMANTIC SKELETON -> ORGANIC GEOMETRY
 *
 * Every path emitted here is derived from the skeleton, never hand-drawn.
 * Change the repository and the anatomy changes with it: the trunk is as tall
 * as `main` is long, a limb is as thick as the branch has commits, a fork sits
 * exactly at the commit it diverged from, and a merge physically returns to the
 * trunk at its merge commit.
 */

export type CommitKind = 'commit' | 'merge' | 'root' | 'head'

export interface CommitDot {
  sha: string
  limbId: string
  x: number
  y: number
  angle: number
  r: number
  kind: CommitKind
  u: number
}

export interface FoliageCluster {
  id: string
  limbId: string
  x: number
  y: number
  r: number
  /** 0 = deep shade, 1 = mid, 2 = sunlit */
  tone: 0 | 1 | 2
  lobes: string[]
  layer: 'back' | 'front'
  dim: boolean
}

export interface Knot {
  x: number
  y: number
  rx: number
  ry: number
  rot: number
}

export interface RenderLimb {
  id: string
  kind: 'trunk' | 'limb'
  status: LimbStatus
  skeleton: SkeletonLimb
  spine: Spine
  /** closed, tapered silhouette */
  outline: string
  /** centerline, used for highlight and selection glow */
  center: string
  bark: string[]
  highlight: string
  knots: Knot[]
  /** upper boughs — anatomy only, they carry no Git meaning */
  crownBoughs?: string[]
  commits: CommitDot[]
  foliage: FoliageCluster[]
  tip: Pt
  fork: Pt | null
  mergePoint: Pt | null
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
  side: -1 | 1
  depth: number
  baseHalfWidth: number
}

export interface RootShape {
  id: string
  outline: string
  bark: string[]
  tip: Pt
}

export interface WorldTreeLayout {
  width: number
  height: number
  cx: number
  groundY: number
  trunkTopY: number
  trunk: RenderLimb
  limbs: RenderLimb[]
  all: RenderLimb[]
  byId: Map<string, RenderLimb>
  roots: RootShape[]
  canopy: FoliageCluster[]
  hills: string[]
  motes: { x: number; y: number; r: number; delay: number }[]
}

/* ------------------------------------------------------------------ */
/* tuning                                                              */
/* ------------------------------------------------------------------ */

const TOP_PAD = 40
const CROWN_SPACE = 330
const ROOT_DEPTH = 240
const SIDE_PAD = 110
const MIN_HALF_WIDTH = 470

const TRUNK_COMMIT_STEP = 34
const TRUNK_MIN = 620
const TRUNK_MAX = 2400
/** keeps the silhouette heroic instead of a thin mast */
const MAX_ASPECT = 1.16

/** Commits never sit at the very ends of a limb — the ends belong to anatomy. */
const TRUNK_FROM = 0.05
const TRUNK_TO = 0.93

function depthScale(depth: number): number {
  return Math.pow(0.66, Math.max(0, depth - 1))
}

/** Outward reach of a limb, in px. Pre-computed so the canvas can be sized. */
function limbReach(limb: SkeletonLimb): number {
  const base = 205 + limb.vigor * 340 + limb.lane * 96
  const merged = limb.status === 'merged' ? 0.86 : 1
  const stub = limb.isStub ? 0.34 : 1
  return base * merged * stub * depthScale(limb.depth)
}

function limbSpan(limb: SkeletonLimb): number {
  return limbReach(limb) + (limb.status === 'growing' ? 130 : 60)
}

/* ------------------------------------------------------------------ */

export function buildLayout(skeleton: TreeSkeleton, repoKey: string): WorldTreeLayout {
  const seed = hashSeed(repoKey, skeleton.trunk.commits.length, skeleton.limbs.length)
  const rng = makeRng(seed)

  const trunkCommits = Math.max(1, skeleton.trunk.commits.length)

  // Horizontal budget first: the widest limb on each side decides where the
  // trunk stands, and the canvas width then bounds how tall the trunk may grow.
  let leftMost = MIN_HALF_WIDTH
  let rightMost = MIN_HALF_WIDTH
  skeleton.limbs.forEach((l) => {
    const reach = limbSpan(l) * (l.depth > 1 ? 1.5 : 1)
    if (l.side < 0) leftMost = Math.max(leftMost, reach)
    else rightMost = Math.max(rightMost, reach)
  })
  // A symmetric canvas keeps the trunk centred no matter which side the
  // repository happens to branch on.
  const halfWidth = Math.max(leftMost, rightMost)
  const cx = halfWidth + SIDE_PAD
  const width = cx + halfWidth + SIDE_PAD

  const trunkLen = Math.max(
    TRUNK_MIN,
    Math.min(TRUNK_MAX, width * MAX_ASPECT, trunkCommits * TRUNK_COMMIT_STEP + 300),
  )

  const trunkTopY = TOP_PAD + CROWN_SPACE
  const groundY = trunkTopY + trunkLen
  const height = groundY + ROOT_DEPTH

  /* ---------------- trunk ---------------- */

  const swayNoise = makeNoise(seed + 11, 3)
  const leftNoise = makeNoise(seed + 23, 4)
  const rightNoise = makeNoise(seed + 37, 4)

  const swayAmp = Math.min(52, trunkLen * 0.045)
  const trunkControl: Pt[] = []
  const SEGMENTS = 22
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS
    const y = groundY - trunkLen * t
    const damp = 0.12 + 0.88 * t
    trunkControl.push(pt(cx + swayNoise(t * 0.85) * swayAmp * damp, y))
  }
  const trunkSpine = Spine.through(trunkControl, 10)

  const baseHalf = 64 + Math.min(52, trunkCommits * 1.15)
  const tipHalf = 15

  const knotSpots = Array.from({ length: 4 + Math.floor(rng() * 3) }, () => ({
    at: rng.range(0.12, 0.82),
    amp: rng.range(0.1, 0.24),
    w: rng.range(0.03, 0.075),
  }))

  const trunkCore = (k: number) => {
    const taper = tipHalf + (baseHalf - tipHalf) * Math.pow(1 - k, 1.45)
    const flare = k < 0.11 ? 1 + 1.95 * Math.pow((0.11 - k) / 0.11, 1.5) : 1
    let bulge = 1
    for (const s of knotSpots) bulge += s.amp * Math.exp(-Math.pow((k - s.at) / s.w, 2))
    return taper * flare * bulge
  }

  const trunkLeft = (k: number) => trunkCore(k) * (1 + 0.17 * leftNoise(k))
  const trunkRight = (k: number) => trunkCore(k) * (1 + 0.17 * rightNoise(k))

  const trunkOutline = ribbon(trunkSpine, {
    leftAt: trunkLeft,
    rightAt: trunkRight,
    samples: 110,
  })

  const trunkBark: string[] = []
  for (let i = 0; i < 7; i += 1) {
    const n = makeNoise(seed + 100 + i * 13, 4)
    const frac = -0.78 + (i / 6) * 1.56
    const from = 0.02 + rng() * 0.1
    const to = 0.72 + rng() * 0.26
    trunkBark.push(
      offsetPath(
        trunkSpine,
        (k) => {
          const w = frac >= 0 ? trunkRight(from + k * (to - from)) : trunkLeft(from + k * (to - from))
          return frac * w * (0.82 + 0.22 * n(k)) * -1
        },
        from,
        to,
        54,
      ),
    )
  }

  const trunkHighlight = offsetPath(
    trunkSpine,
    (k) => -trunkLeft(0.02 + k * 0.9) * 0.66,
    0.02,
    0.92,
    46,
  )

  const trunkKnots: Knot[] = knotSpots.slice(0, 3).map((s, i) => {
    const p = trunkSpine.pointAt(s.at)
    const n = trunkSpine.normalAt(s.at)
    const off = (i % 2 === 0 ? -1 : 1) * trunkCore(s.at) * 0.34
    return {
      x: p.x + n.x * off,
      y: p.y + n.y * off,
      rx: 13 + s.amp * 46,
      ry: 8 + s.amp * 30,
      rot: (rng() - 0.5) * 50,
    }
  })

  const crownBoughs: string[] = []
  {
    const boughCount = 5
    for (let i = 0; i < boughCount; i += 1) {
      const s0 = 0.86 + (i / boughCount) * 0.13
      const P = trunkSpine.pointAt(s0)
      const T = trunkSpine.tangentAt(s0)
      const N = trunkSpine.normalAt(s0)
      const dir: 1 | -1 = i % 2 === 0 ? -1 : 1
      const L = rng.range(150, 300)
      const outv = scale(N, dir)
      const upv = scale(T, -1)
      const bSpine = Spine.through(
        [
          P,
          add(add(P, scale(outv, L * 0.3)), scale(upv, L * 0.42)),
          add(add(P, scale(outv, L * 0.62)), scale(upv, L * 0.92)),
          add(add(P, scale(outv, L * 0.74)), scale(upv, L * 1.32)),
        ],
        12,
      )
      const w0 = trunkCore(s0) * rng.range(0.3, 0.46)
      const bw = (k: number) => Math.max(1.6, 2 + w0 * (1 - 0.88 * Math.pow(k, 1.1)))
      crownBoughs.push(ribbon(bSpine, { leftAt: bw, rightAt: (k) => bw(k) * 0.9, samples: 34 }))
    }
  }

  const trunkU = (u: number) => TRUNK_FROM + u * (TRUNK_TO - TRUNK_FROM)

  const trunkDots: CommitDot[] = skeleton.trunk.commits.map((c, i, arr) => {
    const s = trunkU(c.u)
    const p = trunkSpine.pointAt(s)
    const n = trunkSpine.normalAt(s)
    // Nudge the rune onto the visible face of the trunk rather than dead centre.
    const off = trunkCore(s) * 0.22 * (i % 2 === 0 ? -1 : 1)
    const kind: CommitKind =
      i === arr.length - 1 ? 'head' : c.isRoot ? 'root' : c.isMerge ? 'merge' : 'commit'
    return {
      sha: c.sha,
      limbId: skeleton.trunk.id,
      x: p.x + n.x * off,
      y: p.y + n.y * off,
      angle: 0,
      r: kind === 'head' ? 10 : kind === 'merge' ? 8 : 6,
      kind,
      u: c.u,
    }
  })

  const trunkRender: RenderLimb = {
    id: skeleton.trunk.id,
    kind: 'trunk',
    status: 'trunk',
    skeleton: skeleton.trunk,
    spine: trunkSpine,
    outline: trunkOutline,
    center: spinePath(trunkSpine, 0.02, 0.98, 40),
    bark: trunkBark,
    highlight: trunkHighlight,
    knots: trunkKnots,
    crownBoughs,
    commits: trunkDots,
    foliage: [],
    tip: trunkSpine.pointAt(1),
    fork: null,
    mergePoint: null,
    label: { x: trunkSpine.pointAt(0.5).x, y: trunkSpine.pointAt(0.5).y, anchor: 'middle' },
    side: 1,
    depth: 0,
    baseHalfWidth: baseHalf,
  }

  /* ---------------- limbs ---------------- */

  const byId = new Map<string, RenderLimb>([[trunkRender.id, trunkRender]])
  const limbRenders: RenderLimb[] = []

  const limbU = (u: number) => 0.13 + u * 0.74

  const ordered = [...skeleton.limbs].sort((a, b) => a.depth - b.depth)

  ordered.forEach((limb) => {
    const parent = byId.get(limb.parentId ?? trunkRender.id) ?? trunkRender
    const parentMap = parent.kind === 'trunk' ? trunkU : limbU
    const lseed = hashSeed(repoKey, limb.id)
    const lrng = makeRng(lseed)
    const lnoise = makeNoise(lseed + 5, 3)

    const sFork = Math.max(0.02, Math.min(0.96, parentMap(limb.forkU)))
    const A = parent.spine.pointAt(sFork)
    const T = parent.spine.tangentAt(sFork) // points toward the tip of the parent
    const N = parent.spine.normalAt(sFork)
    const outward = norm(scale(N, limb.side))
    const up = norm(scale(T, -1)) // screen-up along the parent
    const reach = limbReach(limb)
    const ds = depthScale(limb.depth)

    const jitter = (amount: number) => (lrng() - 0.5) * amount

    let control: Pt[]
    let mergePoint: Pt | null = null

    if (limb.status === 'merged' && limb.mergeU !== null) {
      const sMerge = Math.max(sFork + 0.01, Math.min(0.98, parentMap(limb.mergeU)))
      const B = parent.spine.pointAt(sMerge)
      mergePoint = B
      const gap = Math.max(len(sub(B, A)), 150)
      // Apex sits past the midpoint and high, so the bough leaves the trunk,
      // carries its commits along the outside, then folds back in — not a
      // symmetric lasso.
      const apexBase = {
        x: A.x + (B.x - A.x) * 0.62,
        y: A.y + (B.y - A.y) * 0.62,
      }
      control = [
        A,
        add(add(A, scale(outward, reach * 0.52)), scale(up, gap * 0.3 + jitter(22))),
        add(
          add(apexBase, scale(outward, reach * (1 + lnoise(0.4) * 0.08))),
          scale(up, gap * 0.12 + jitter(24)),
        ),
        add(add(B, scale(outward, reach * 0.46)), scale(up, -gap * 0.2 + jitter(16))),
        add(add(B, scale(outward, reach * 0.13)), scale(up, -gap * 0.05)),
        B,
      ]
    } else if (limb.isStub) {
      control = [
        A,
        add(add(A, scale(outward, reach * 0.6)), scale(up, reach * 0.16)),
        add(add(A, scale(outward, reach)), scale(up, reach * 0.34)),
      ]
    } else if (limb.status === 'severed') {
      control = [
        A,
        add(add(A, scale(outward, reach * 0.36)), scale(up, reach * 0.14 + jitter(12))),
        add(add(A, scale(outward, reach * 0.74)), scale(up, reach * 0.2 + jitter(16))),
        add(add(A, scale(outward, reach * 0.96)), scale(up, reach * 0.04)),
        add(add(A, scale(outward, reach * 1.04)), scale(up, -reach * 0.16)),
      ]
    } else {
      const rise = 0.34 + limb.lane * 0.05 + lrng() * 0.12
      control = [
        A,
        add(add(A, scale(outward, reach * 0.34)), scale(up, reach * rise * 0.34 + jitter(16))),
        add(add(A, scale(outward, reach * 0.7)), scale(up, reach * rise * 0.95 + jitter(22))),
        add(add(A, scale(outward, reach * 0.93)), scale(up, reach * rise * 1.72 + jitter(18))),
        add(add(A, scale(outward, reach * 1.0)), scale(up, reach * rise * 2.3)),
      ]
    }

    const spine = Spine.through(control, 16)

    const parentHalf =
      parent.kind === 'trunk' ? trunkCore(sFork) : parent.baseHalfWidth * 0.5
    const base = Math.max(
      6,
      Math.min(parentHalf * 0.72, (10 + limb.vigor * 30) * ds) * (limb.isStub ? 0.55 : 1),
    )

    const widthAt = (k: number) => {
      const taper =
        limb.status === 'merged' ? 1 - 0.72 * Math.pow(k, 0.92) : 1 - 0.82 * Math.pow(k, 1.15)
      const entry = limb.status === 'merged' && k > 0.8 ? 1 - ((k - 0.8) / 0.2) * 0.55 : 1
      const wobble = 1 + 0.2 * lnoise(k * 1.4)
      // The very first slice matches the parent so the limb grows out of the
      // trunk instead of being glued onto it.
      const rootBlend = k < 0.06 ? 1 + 2.1 * (0.06 - k) / 0.06 : 1
      return Math.max(1.4, (2.1 + base * taper) * entry * wobble * rootBlend)
    }

    const outline = ribbon(spine, {
      leftAt: (k) => widthAt(k) * (1 + 0.1 * lnoise(k + 0.31)),
      rightAt: (k) => widthAt(k) * (1 + 0.1 * lnoise(k + 0.77)),
      samples: 62,
    })

    const bark: string[] = []
    if (base > 9) {
      for (let i = 0; i < 3; i += 1) {
        const frac = -0.55 + i * 0.55
        const n = makeNoise(lseed + 40 + i * 7, 3)
        bark.push(
          offsetPath(
            spine,
            (k) => frac * widthAt(0.05 + k * 0.7) * (0.8 + 0.3 * n(k)),
            0.05,
            0.78,
            30,
          ),
        )
      }
    }

    const from = limb.status === 'merged' ? 0.15 : 0.17
    const to = limb.status === 'merged' ? 0.84 : 0.9
    const commits: CommitDot[] = limb.commits.map((c, i, arr) => {
      const s = arr.length === 1 ? (from + to) / 2 : from + c.u * (to - from)
      const p = spine.pointAt(s)
      const n = spine.normalAt(s)
      const off = widthAt(s) * 0.28 * (i % 2 === 0 ? 1 : -1)
      const kind: CommitKind = i === arr.length - 1 ? 'head' : c.isMerge ? 'merge' : 'commit'
      return {
        sha: c.sha,
        limbId: limb.id,
        x: p.x + n.x * off,
        y: p.y + n.y * off,
        angle: 0,
        r: kind === 'head' ? 8 : 5.5,
        kind,
        u: c.u,
      }
    })

    const tip = spine.pointAt(1)
    const labelAnchorS = limb.status === 'merged' ? 0.5 : 0.99
    const labelPt = spine.pointAt(labelAnchorS)
    const labelN = spine.normalAt(labelAnchorS)

    /* --- foliage for this limb --- */
    const foliage: FoliageCluster[] = []
    if (!limb.isStub) {
      const dim = limb.status !== 'growing'
      const count = limb.status === 'growing' ? 3 + Math.floor(lrng() * 3) : 1
      const baseR = (limb.status === 'growing' ? 46 + limb.vigor * 52 : 28 + limb.vigor * 20) * ds
      for (let i = 0; i < count; i += 1) {
        const s = limb.status === 'growing' ? 0.72 + (i / Math.max(1, count)) * 0.3 : 0.42 + i * 0.2
        const p = spine.pointAt(Math.min(1, s))
        const spread = baseR * 0.9
        const cxi = p.x + (lrng() - 0.5) * spread + outward.x * baseR * 0.35
        const cyi = p.y + (lrng() - 0.5) * spread * 0.7 - baseR * 0.42
        const r = baseR * lrng.range(0.62, 1.12)
        foliage.push(makeCluster(`${limb.id}-f${i}`, limb.id, cxi, cyi, r, lseed + i * 17, i === 0 ? 'back' : 'front', dim))
      }
    }

    const render: RenderLimb = {
      id: limb.id,
      kind: 'limb',
      status: limb.status,
      skeleton: limb,
      spine,
      outline,
      center: spinePath(spine, 0.02, 0.99, 34),
      bark,
      highlight: offsetPath(spine, (k) => -widthAt(0.05 + k * 0.8) * 0.5, 0.05, 0.85, 26),
      knots: [],
      commits,
      foliage,
      tip,
      fork: A,
      mergePoint,
      label: {
        x: labelPt.x + labelN.x * limb.side * 16 + outward.x * 22,
        y: labelPt.y + labelN.y * limb.side * 16 + outward.y * 22 - 8,
        anchor: limb.side < 0 ? 'end' : 'start',
      },
      side: limb.side,
      depth: limb.depth,
      baseHalfWidth: base,
    }

    limbRenders.push(render)
    byId.set(render.id, render)
  })

  /* ---------------- keep wayfinder labels from colliding ---------------- */

  const MIN_LABEL_GAP = 30
  ;([-1, 1] as const).forEach((side) => {
    const column = limbRenders
      .filter((l) => l.side === side)
      .sort((a, b) => a.label.y - b.label.y)
    for (let i = 1; i < column.length; i += 1) {
      const gap = column[i].label.y - column[i - 1].label.y
      if (gap < MIN_LABEL_GAP) column[i].label.y = column[i - 1].label.y + MIN_LABEL_GAP
    }
  })

  /* ---------------- crown canopy ---------------- */

  const canopy: FoliageCluster[] = []
  const crownCenter = trunkSpine.pointAt(1)
  const crownW = Math.min(width * 0.4, 580)
  const crownH = 236
  const crownCount = 20 + Math.min(12, skeleton.limbs.length * 2)

  // An irregular dome, not a disc: radius, height and density all vary, and the
  // lowest ring sits *below* the trunk top so the crown grows out of the wood.
  for (let i = 0; i < crownCount; i += 1) {
    const a = Math.PI + (i / crownCount) * Math.PI * 2 + rng.range(-0.18, 0.18)
    const shell = rng() < 0.46 ? rng.range(0.14, 0.58) : rng.range(0.66, 0.98)
    const rx = Math.cos(a) * crownW * shell
    const ry = Math.sin(a) * crownH * shell * (Math.sin(a) < 0 ? 1.12 : 0.52)
    const r = rng.range(56, 126) * (shell < 0.65 ? 1.16 : 0.9)
    canopy.push(
      makeCluster(
        `crown-${i}`,
        skeleton.trunk.id,
        crownCenter.x + rx,
        crownCenter.y + ry - 74,
        r,
        seed + 300 + i * 19,
        i % 5 === 0 ? 'front' : 'back',
        false,
      ),
    )
  }
  // Shoulder masses hugging the upper trunk, for depth against the sky.
  for (let i = 0; i < 7; i += 1) {
    const s = 0.62 + i * 0.055
    const p = trunkSpine.pointAt(Math.min(0.99, s))
    const dir = i % 2 === 0 ? -1 : 1
    canopy.push(
      makeCluster(
        `shoulder-${i}`,
        skeleton.trunk.id,
        p.x + dir * rng.range(70, 300),
        p.y - rng.range(0, 90),
        rng.range(48, 112),
        seed + 400 + i * 23,
        i % 3 === 0 ? 'front' : 'back',
        false,
      ),
    )
  }

  /* ---------------- roots ---------------- */

  const roots: RootShape[] = []
  const rootCount = Math.max(6, Math.min(11, 5 + Math.round(skeleton.limbs.length / 2)))
  for (let i = 0; i < rootCount; i += 1) {
    const t = rootCount === 1 ? 0.5 : i / (rootCount - 1)
    const dir = t < 0.5 ? -1 : 1
    const spreadT = Math.abs(t - 0.5) * 2
    const startX = cx + (t - 0.5) * baseHalf * 1.7
    const start = pt(startX, groundY - 24)
    const rseed = hashSeed(repoKey, 'root', i)
    const rr = makeRng(rseed)
    const rn = makeNoise(rseed + 3, 3)
    const outLen = 165 + spreadT * 330 + rr() * 120
    const dropY = 52 + spreadT * 40 + rr() * 110

    const control = [
      start,
      pt(startX + dir * outLen * 0.28, groundY + dropY * 0.34 + rr.range(-18, 10)),
      pt(startX + dir * outLen * 0.66, groundY + dropY * 0.74 + rr.range(-20, 20)),
      pt(startX + dir * outLen, groundY + dropY + rr.range(-12, 26)),
    ]
    const rspine = Spine.through(control, 14)
    const rBase = 17 + (1 - spreadT) * 34 + rr() * 9
    const rwidth = (k: number) =>
      Math.max(2, (2.5 + rBase * (1 - 0.86 * Math.pow(k, 0.75))) * (1 + 0.2 * rn(k)))
    roots.push({
      id: `root-${i}`,
      outline: ribbon(rspine, { leftAt: rwidth, rightAt: (k) => rwidth(k) * 0.86, samples: 40 }),
      bark: [offsetPath(rspine, (k) => -rwidth(k * 0.8) * 0.45, 0.05, 0.8, 22)],
      tip: rspine.pointAt(1),
    })
  }

  /* ---------------- distant hills (map atmosphere) ---------------- */

  const hills: string[] = []
  for (let i = 0; i < 3; i += 1) {
    const hn = makeNoise(seed + 700 + i * 31, 3)
    const baseY = groundY - 40 + i * 34
    const amp = 130 - i * 34
    const pts: Pt[] = []
    for (let x = -60; x <= width + 60; x += 70) {
      pts.push(pt(x, baseY - Math.abs(hn(x / width) * amp) - 20))
    }
    hills.push(
      smoothPath([...pts, pt(width + 60, height + 40), pt(-60, height + 40)], true),
    )
  }

  const motes = Array.from({ length: 22 }, (_, i) => ({
    x: cx + rng.range(-width * 0.34, width * 0.34),
    y: trunkTopY + rng.range(-160, trunkLen * 0.6),
    r: rng.range(1.1, 2.8),
    delay: (i / 22) * 8,
  }))

  return {
    width,
    height,
    cx,
    groundY,
    trunkTopY,
    trunk: trunkRender,
    limbs: limbRenders,
    all: [trunkRender, ...limbRenders],
    byId,
    roots,
    canopy,
    hills,
    motes,
  }
}

function makeCluster(
  id: string,
  limbId: string,
  x: number,
  y: number,
  r: number,
  seed: number,
  layer: 'back' | 'front',
  dim: boolean,
): FoliageCluster {
  const rng = makeRng(seed)
  const noiseA = makeNoise(seed + 1, 3)
  const lobes: string[] = []
  const subCount = 3 + Math.floor(rng() * 4)
  lobes.push(blobPath(x, y, r, (a) => noiseA(a), 15))
  for (let i = 0; i < subCount; i += 1) {
    const a = rng.range(0, Math.PI * 2)
    const d = rng.range(0.3, 0.85) * r
    const sr = r * rng.range(0.35, 0.7)
    const n = makeNoise(seed + 10 + i * 5, 3)
    lobes.push(blobPath(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, sr, (t) => n(t), 12))
  }
  const tone = (Math.floor(rng() * 3) as 0 | 1 | 2)
  return { id, limbId, x, y, r, tone, lobes, layer, dim }
}
