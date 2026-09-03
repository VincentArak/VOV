/** Deterministic noise so a repository always grows the same tree. */

export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261 >>> 0
  const str = parts.join('')
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export interface Rng {
  (): number
  range: (min: number, max: number) => number
  pick: <T>(items: T[]) => T
  sign: () => 1 | -1
}

export function makeRng(seed: number): Rng {
  let s = (seed || 1) >>> 0
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng = next as Rng
  rng.range = (min, max) => min + next() * (max - min)
  rng.pick = <T,>(items: T[]) => items[Math.floor(next() * items.length) % items.length]
  rng.sign = () => (next() < 0.5 ? -1 : 1)
  return rng
}

/**
 * Smooth 1-D value noise in [-1, 1]. Used for bark wobble, trunk sway and
 * silhouette irregularity: cheap, continuous, stable for a given seed.
 */
export function makeNoise(seed: number, octaves = 3): (t: number) => number {
  const rng = makeRng(seed)
  const layers = Array.from({ length: octaves }, (_, i) => ({
    freq: 1.7 * Math.pow(2.1, i),
    phase: rng.range(0, Math.PI * 2),
    amp: 1 / Math.pow(2, i),
  }))
  const norm = layers.reduce((sum, l) => sum + l.amp, 0)
  return (t: number) => {
    let v = 0
    for (const l of layers) v += Math.sin(t * l.freq * Math.PI * 2 + l.phase) * l.amp
    return v / norm
  }
}
