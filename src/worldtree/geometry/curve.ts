export interface Pt {
  x: number
  y: number
}

export const pt = (x: number, y: number): Pt => ({ x, y })
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
export const len = (a: Pt): number => Math.hypot(a.x, a.y)

export function norm(a: Pt): Pt {
  const l = len(a) || 1
  return { x: a.x / l, y: a.y / l }
}

/** Rotate a vector. SVG y grows downward, so a positive angle turns clockwise on screen. */
export function rotate(a: Pt, rad: number): Pt {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * A densely sampled centerline with an arc-length table, so commits, forks and
 * bark strokes are positioned by "how far along the branch" instead of by a raw
 * bezier parameter (which bunches up around curves).
 */
export class Spine {
  readonly points: Pt[]
  readonly cumulative: number[]
  readonly length: number

  private constructor(points: Pt[]) {
    this.points = points
    this.cumulative = [0]
    let total = 0
    for (let i = 1; i < points.length; i += 1) {
      total += len(sub(points[i], points[i - 1]))
      this.cumulative.push(total)
    }
    this.length = total || 1
  }

  static fromPoints(points: Pt[]): Spine {
    return new Spine(points.length >= 2 ? points : [pt(0, 0), pt(0, 1)])
  }

  /** Smooth spine through control points, sampled with Catmull-Rom. */
  static through(control: Pt[], samplesPerSegment = 18): Spine {
    if (control.length < 2) return Spine.fromPoints([])
    if (control.length === 2) {
      const out: Pt[] = []
      for (let i = 0; i <= samplesPerSegment; i += 1) {
        out.push(lerpPt(control[0], control[1], i / samplesPerSegment))
      }
      return new Spine(out)
    }
    const p = [control[0], ...control, control[control.length - 1]]
    const out: Pt[] = []
    for (let i = 1; i < p.length - 2; i += 1) {
      const p0 = p[i - 1]
      const p1 = p[i]
      const p2 = p[i + 1]
      const p3 = p[i + 2]
      for (let j = 0; j < samplesPerSegment; j += 1) {
        const t = j / samplesPerSegment
        const t2 = t * t
        const t3 = t2 * t
        out.push({
          x:
            0.5 *
            (2 * p1.x +
              (-p0.x + p2.x) * t +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y:
            0.5 *
            (2 * p1.y +
              (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        })
      }
    }
    out.push(p[p.length - 2])
    return new Spine(out)
  }

  /** `s` is normalized arc length in [0, 1]. */
  pointAt(s: number): Pt {
    const target = Math.max(0, Math.min(1, s)) * this.length
    const i = this.indexFor(target)
    const segLen = this.cumulative[i + 1] - this.cumulative[i] || 1
    const local = (target - this.cumulative[i]) / segLen
    return lerpPt(this.points[i], this.points[i + 1], local)
  }

  tangentAt(s: number): Pt {
    const eps = 0.004
    const a = this.pointAt(Math.max(0, s - eps))
    const b = this.pointAt(Math.min(1, s + eps))
    return norm(sub(b, a))
  }

  /** Left-hand normal in screen space. */
  normalAt(s: number): Pt {
    const t = this.tangentAt(s)
    return { x: -t.y, y: t.x }
  }

  private indexFor(target: number): number {
    let lo = 0
    let hi = this.cumulative.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (this.cumulative[mid] <= target) lo = mid
      else hi = mid
    }
    return Math.min(lo, this.points.length - 2)
  }
}

/** Catmull-Rom to cubic bezier: fewer points than an L-polyline, still smooth. */
export function smoothPath(points: Pt[], closed = false): string {
  if (points.length < 2) return ''
  const p = closed
    ? [points[points.length - 1], ...points, points[0], points[1]]
    : [points[0], ...points, points[points.length - 1]]

  let d = 'M' + r2(p[1].x) + ',' + r2(p[1].y)
  for (let i = 1; i < p.length - 2; i += 1) {
    const p0 = p[i - 1]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d +=
      'C' + r2(c1.x) + ',' + r2(c1.y) + ' ' + r2(c2.x) + ',' + r2(c2.y) + ' ' + r2(p2.x) + ',' + r2(p2.y)
  }
  return closed ? d + 'Z' : d
}

export interface RibbonOptions {
  samples?: number
  /** half-width on the left of the spine, keyed by normalized arc length */
  leftAt: (s: number) => number
  /** half-width on the right */
  rightAt: (s: number) => number
  from?: number
  to?: number
}

/**
 * Turn a centerline into a closed, asymmetrically tapered silhouette.
 * This single primitive is behind the trunk, every limb and every root, which
 * is why a Git branch literally is a tree branch in this visualization.
 */
export function ribbon(spine: Spine, opts: RibbonOptions): string {
  const from = opts.from ?? 0
  const to = opts.to ?? 1
  const samples = opts.samples ?? Math.max(20, Math.min(96, Math.round(spine.length / 14)))
  const left: Pt[] = []
  const right: Pt[] = []

  for (let i = 0; i <= samples; i += 1) {
    const s = from + ((to - from) * i) / samples
    const c = spine.pointAt(s)
    const n = spine.normalAt(s)
    const k = (s - from) / (to - from || 1)
    left.push(add(c, scale(n, opts.leftAt(k))))
    right.push(add(c, scale(n, -opts.rightAt(k))))
  }
  return smoothPath([...left, ...right.reverse()], true)
}

/** A stroke running alongside the spine: bark grooves, highlights, vine lines. */
export function offsetPath(
  spine: Spine,
  offsetAt: (s: number) => number,
  from = 0,
  to = 1,
  samples = 32,
): string {
  const pts: Pt[] = []
  for (let i = 0; i <= samples; i += 1) {
    const s = from + ((to - from) * i) / samples
    const k = (s - from) / (to - from || 1)
    pts.push(add(spine.pointAt(s), scale(spine.normalAt(s), offsetAt(k))))
  }
  return smoothPath(pts)
}

export function spinePath(spine: Spine, from = 0, to = 1, samples = 44): string {
  const pts: Pt[] = []
  for (let i = 0; i <= samples; i += 1) pts.push(spine.pointAt(from + ((to - from) * i) / samples))
  return smoothPath(pts)
}

/** Irregular closed blob: the base shape for every foliage cluster. */
export function blobPath(cx: number, cy: number, radius: number, wobble: (a: number) => number, lobes = 14): string {
  const pts: Pt[] = []
  for (let i = 0; i < lobes; i += 1) {
    const a = (i / lobes) * Math.PI * 2
    const r = radius * (1 + wobble(i / lobes) * 0.34)
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.82 })
  }
  return smoothPath(pts, true)
}
