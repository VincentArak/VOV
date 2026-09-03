/**
 * Geometry for the great scroll the World Tree is drawn on.
 *
 * The scroll is not a frame around the visualization — it *is* the canvas, so
 * this module is sized in real screen pixels rather than in an abstract
 * viewBox. The parchment SVG renders at `viewBox="0 0 w h"` against a
 * container measured at `w × h`, which keeps one user unit equal to one CSS
 * pixel. That matters: a rune, a fold crease and a carved cap each have a
 * physical size that should not stretch when the window does, and the cheap
 * alternative — a fixed viewBox scaled with `preserveAspectRatio="none"` —
 * would smear every one of them.
 *
 * Everything irregular here is deterministic noise seeded from the repository,
 * so a given repo always opens the same sheet: the same stains, the same nicks
 * along the edge, the same runes. The parchment is meant to read as an artifact
 * with a history, and an artifact that reshuffles its own blemishes on every
 * render does not read as one.
 */

import { makeNoise, makeRng, type Rng } from '../geometry/prng'
import { smoothPath, pt, type Pt } from '../geometry/curve'

/* ------------------------------------------------------------------ */
/* tuning                                                              */
/* ------------------------------------------------------------------ */

/** Height of a roller's wooden cylinder. */
const ROD_H = 62
/** Carved end caps stand proud of the rod on both axes. */
const CAP_H = 96
const CAP_W = 58
/** Horizontal gap between a rod's end cap and the parchment's torn edge. */
const SHEET_GUTTER = 30
/** How far the sheet tucks in behind each rod. */
const TUCK = 10
/** Amplitude of the hand-torn wobble along the sheet's free edges. */
const DECKLE = 9
/** Inset from the deckled edge to the engraved border rule. */
const RULE_INSET = 26

export interface Stain {
  cx: number
  cy: number
  rx: number
  ry: number
  rot: number
  opacity: number
  tone: 'umber' | 'tea' | 'soot'
}

/** A foxing spot: the small rust-brown freckle old paper grows as it ages. */
export interface Fox {
  x: number
  y: number
  r: number
  opacity: number
}

export interface Rune {
  x: number
  y: number
  d: string
  scale: number
}

export interface Mote {
  x: number
  y: number
  r: number
  delay: number
  duration: number
  drift: number
}

export interface ScrollGeometry {
  w: number
  h: number
  rod: { topY: number; bottomY: number; left: number; right: number; height: number }
  cap: { w: number; h: number }
  sheet: { left: number; right: number; top: number; bottom: number; path: string }
  /** Where the tree is allowed to draw: generously inside the parchment. */
  canvas: { left: number; top: number; width: number; height: number }
  /** The engraved double rule, inset from the deckle. */
  rule: { outer: string; inner: string }
  stains: Stain[]
  foxing: Fox[]
  folds: string[]
  wrinkles: string[]
  runes: Rune[]
  corners: { x: number; y: number; flipX: boolean; flipY: boolean }[]
  motes: Mote[]
  /** Distance each rod travels between the rolled-up position and the open one. */
  travel: { top: number; bottom: number }
}

/* ------------------------------------------------------------------ */
/* runes                                                               */
/* ------------------------------------------------------------------ */

/**
 * Angular glyphs drawn in a 14x14 box centred on the origin. They are
 * deliberately invented rather than borrowed from a real futhark: the border
 * should read as "an archive hand nobody alive still writes", and lifting
 * actual runes would make it read as a specific claim instead of atmosphere.
 */
const RUNE_GLYPHS = [
  'M0 -7 0 7M0 -2 5 -6M0 2 -5 6',
  'M-4 -7 -4 7M-4 -7 4 -1 -4 4',
  'M0 -7 0 7M-5 -4 5 -4M-5 4 5 4',
  'M-4 7 -4 -7 4 -7M-4 0 2 0',
  'M-5 -7 0 7 5 -7M-3 -1 3 -1',
  'M0 -7 0 7M-5 -7 5 -7M-4 5 4 5',
  'M-5 5 -5 -5 0 1 5 -5 5 5',
  'M0 -7 5 0 0 7 -5 0Z',
  'M-4 -7 4 -7M0 -7 0 7M-4 7 4 7',
  'M-5 -5 5 5M5 -5 -5 5M0 -7 0 7',
]

/* ------------------------------------------------------------------ */

/**
 * The sheet's outline. Top and bottom are held straight by the rods, so only
 * the free left and right edges are torn; the held edges take a shallow sag
 * instead, which is what a sheet under its own weight actually does.
 */
function deckledSheet(
  left: number,
  right: number,
  top: number,
  bottom: number,
  seed: number,
): string {
  const edge = makeNoise(seed, 4)
  const nick = makeRng(seed ^ 0x9e3779b9)
  const pts: Pt[] = []
  const steps = Math.max(14, Math.round((bottom - top) / 34))
  const across = Math.max(8, Math.round((right - left) / 90))

  // right edge, top -> bottom
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const y = top + (bottom - top) * t
    // The tear settles down as it nears a rod: the paper is clamped there.
    const clamp = Math.min(1, Math.min(t, 1 - t) * 6)
    const bite = nick() < 0.2 ? nick.range(3, 11) : 0
    pts.push(pt(right + (edge(t * 1.6) * DECKLE + bite) * clamp, y))
  }
  // bottom edge, right -> left, sagging under its own weight
  for (let i = 1; i < across; i += 1) {
    const t = i / across
    const x = right - (right - left) * t
    pts.push(pt(x, bottom + Math.sin(t * Math.PI) * 3.5 + edge(t * 0.9 + 4) * 1.6))
  }
  // left edge, bottom -> top
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const y = bottom - (bottom - top) * t
    const clamp = Math.min(1, Math.min(t, 1 - t) * 6)
    const bite = nick() < 0.2 ? nick.range(3, 11) : 0
    pts.push(pt(left - (edge(t * 1.6 + 9) * DECKLE + bite) * clamp, y))
  }
  // top edge, left -> right
  for (let i = 1; i < across; i += 1) {
    const t = i / across
    const x = left + (right - left) * t
    pts.push(pt(x, top - Math.sin(t * Math.PI) * 2.2 + edge(t * 0.9 + 12) * 1.4))
  }
  return smoothPath(pts, true)
}

function insetRect(
  left: number,
  right: number,
  top: number,
  bottom: number,
  by: number,
): string {
  const r = 3
  return (
    `M${left + by + r} ${top + by}` +
    `H${right - by - r}` +
    `A${r} ${r} 0 0 1 ${right - by} ${top + by + r}` +
    `V${bottom - by - r}` +
    `A${r} ${r} 0 0 1 ${right - by - r} ${bottom - by}` +
    `H${left + by + r}` +
    `A${r} ${r} 0 0 1 ${left + by} ${bottom - by - r}` +
    `V${top + by + r}` +
    `A${r} ${r} 0 0 1 ${left + by + r} ${top + by}Z`
  )
}

function buildStains(rng: Rng, l: number, r: number, t: number, b: number): Stain[] {
  const out: Stain[] = []
  const count = Math.round(Math.min(26, Math.max(13, ((r - l) * (b - t)) / 62000)))
  const tones: Stain['tone'][] = ['umber', 'tea', 'tea', 'soot']
  for (let i = 0; i < count; i += 1) {
    // Stains cluster toward the edges, where a rolled sheet takes its damage.
    const edgeBias = rng() < 0.62
    const cx = edgeBias
      ? rng() < 0.5
        ? rng.range(l - 10, l + (r - l) * 0.22)
        : rng.range(r - (r - l) * 0.22, r + 10)
      : rng.range(l, r)
    const rx = rng.range(28, 130)
    out.push({
      cx,
      cy: rng.range(t - 6, b + 6),
      rx,
      ry: rx * rng.range(0.45, 1.05),
      rot: rng.range(0, 180),
      opacity: rng.range(0.09, 0.28),
      tone: rng.pick(tones),
    })
  }
  return out
}

/**
 * Foxing. Age on paper is not only broad staining — it is hundreds of tiny
 * rust-coloured specks, denser toward the edges and in the creases, and their
 * absence is most of why a generated parchment reads as new. They are drawn as
 * plain circles because at this size that is all they are.
 */
function buildFoxing(rng: Rng, l: number, r: number, t: number, b: number): Fox[] {
  const out: Fox[] = []
  const count = Math.round(Math.min(340, Math.max(120, ((r - l) * (b - t)) / 3400)))
  for (let i = 0; i < count; i += 1) {
    // Bias toward the margins: the middle of a rolled sheet is the best
    // protected part of it.
    const u = rng()
    const edged = Math.pow(u, 0.45)
    const side = rng() < 0.5 ? -1 : 1
    const x = (l + r) / 2 + side * edged * ((r - l) / 2)
    const v = Math.pow(rng(), 0.7)
    const y = (t + b) / 2 + (rng() < 0.5 ? -1 : 1) * v * ((b - t) / 2)
    out.push({
      x,
      y,
      r: rng.range(0.6, 2.6),
      opacity: rng.range(0.07, 0.3),
    })
  }
  return out
}

/** Creases from the times this sheet was folded flat rather than rolled. */
function buildFolds(rng: Rng, l: number, r: number, t: number, b: number): string[] {
  const out: string[] = []
  const wobble = makeNoise(Math.floor(rng() * 1e9), 3)
  const verticals = Math.max(2, Math.round((r - l) / 520))
  for (let i = 1; i <= verticals; i += 1) {
    const x = l + ((r - l) * i) / (verticals + 1) + rng.range(-24, 24)
    const pts: Pt[] = []
    for (let k = 0; k <= 10; k += 1) {
      pts.push(pt(x + wobble(k / 10 + i) * 4.5, t + (b - t) * (k / 10)))
    }
    out.push(smoothPath(pts))
  }
  const y = t + (b - t) * rng.range(0.42, 0.58)
  const hp: Pt[] = []
  for (let k = 0; k <= 12; k += 1) {
    hp.push(pt(l + (r - l) * (k / 12), y + wobble(k / 12 + 7) * 3.2))
  }
  out.push(smoothPath(hp))
  return out
}

/** Fine surface wrinkles — much shorter and fainter than a fold. */
function buildWrinkles(rng: Rng, l: number, r: number, t: number, b: number): string[] {
  const out: string[] = []
  const count = Math.round(Math.min(26, Math.max(12, (r - l) / 70)))
  for (let i = 0; i < count; i += 1) {
    const x0 = rng.range(l, r)
    const y0 = rng.range(t, b)
    const reach = rng.range(40, 190)
    const ang = rng.range(-0.5, 0.5) + (rng() < 0.5 ? 0 : Math.PI / 2)
    const pts: Pt[] = []
    for (let k = 0; k <= 5; k += 1) {
      const s = k / 5
      pts.push(
        pt(
          x0 + Math.cos(ang) * reach * s + rng.range(-3, 3),
          y0 + Math.sin(ang) * reach * s + rng.range(-3, 3),
        ),
      )
    }
    out.push(smoothPath(pts))
  }
  return out
}

/** Runes ride the margin between the engraved rule and the torn edge. */
function buildRunes(rng: Rng, l: number, r: number, t: number, b: number): Rune[] {
  const out: Rune[] = []
  const band = RULE_INSET / 2 + 1
  const step = 58
  const glyph = () => RUNE_GLYPHS[Math.floor(rng() * RUNE_GLYPHS.length) % RUNE_GLYPHS.length]

  const run = (from: number, to: number, place: (v: number) => Pt) => {
    const span = to - from
    const n = Math.floor(span / step)
    if (n < 2) return
    const gap = span / n
    for (let i = 0; i <= n; i += 1) {
      // Not every slot is carved; an unbroken chain reads as machine-printed.
      if (rng() < 0.28) continue
      const p = place(from + gap * i)
      out.push({ x: p.x, y: p.y, d: glyph(), scale: rng.range(0.62, 0.86) })
    }
  }

  run(l + 66, r - 66, (x) => pt(x, t + band))
  run(l + 66, r - 66, (x) => pt(x, b - band))
  run(t + 74, b - 74, (y) => pt(l + band, y))
  run(t + 74, b - 74, (y) => pt(r - band, y))
  return out
}

function buildMotes(rng: Rng, l: number, r: number, t: number, b: number): Mote[] {
  return Array.from({ length: 22 }, () => ({
    x: rng.range(l, r),
    y: rng.range(t, b),
    r: rng.range(0.7, 2.1),
    delay: rng.range(0, 9),
    duration: rng.range(11, 21),
    drift: rng.range(-26, 26),
  }))
}

/* ------------------------------------------------------------------ */

export function buildScroll(w: number, h: number, seed: number): ScrollGeometry {
  const rng = makeRng(seed)

  const capPad = (CAP_H - ROD_H) / 2
  const topY = capPad + ROD_H / 2
  const bottomY = h - capPad - ROD_H / 2

  const sheetLeft = CAP_W + SHEET_GUTTER
  const sheetRight = w - CAP_W - SHEET_GUTTER
  const sheetTop = topY + ROD_H / 2 - TUCK
  const sheetBottom = bottomY - ROD_H / 2 + TUCK

  const sheetW = sheetRight - sheetLeft
  const sheetH = sheetBottom - sheetTop

  // The tree gets a wide margin on purpose: the parchment has to read as much
  // larger than what is drawn on it, the way a cartographer leaves the border
  // alone before touching the map.
  const padX = Math.max(52, sheetW * 0.075)
  const padY = Math.max(46, sheetH * 0.085)

  return {
    w,
    h,
    rod: { topY, bottomY, left: CAP_W * 0.5, right: w - CAP_W * 0.5, height: ROD_H },
    cap: { w: CAP_W, h: CAP_H },
    sheet: {
      left: sheetLeft,
      right: sheetRight,
      top: sheetTop,
      bottom: sheetBottom,
      path: deckledSheet(sheetLeft, sheetRight, sheetTop, sheetBottom, seed),
    },
    canvas: {
      left: sheetLeft + padX,
      top: sheetTop + padY,
      width: Math.max(80, sheetW - padX * 2),
      height: Math.max(80, sheetH - padY * 2),
    },
    rule: {
      outer: insetRect(sheetLeft, sheetRight, sheetTop, sheetBottom, RULE_INSET),
      inner: insetRect(sheetLeft, sheetRight, sheetTop, sheetBottom, RULE_INSET + 5),
    },
    stains: buildStains(rng, sheetLeft, sheetRight, sheetTop, sheetBottom),
    foxing: buildFoxing(rng, sheetLeft, sheetRight, sheetTop, sheetBottom),
    folds: buildFolds(rng, sheetLeft, sheetRight, sheetTop, sheetBottom),
    wrinkles: buildWrinkles(rng, sheetLeft, sheetRight, sheetTop, sheetBottom),
    runes: buildRunes(rng, sheetLeft, sheetRight, sheetTop, sheetBottom),
    corners: [
      { x: sheetLeft + RULE_INSET, y: sheetTop + RULE_INSET, flipX: false, flipY: false },
      { x: sheetRight - RULE_INSET, y: sheetTop + RULE_INSET, flipX: true, flipY: false },
      { x: sheetLeft + RULE_INSET, y: sheetBottom - RULE_INSET, flipX: false, flipY: true },
      { x: sheetRight - RULE_INSET, y: sheetBottom - RULE_INSET, flipX: true, flipY: true },
    ],
    motes: buildMotes(rng, sheetLeft, sheetRight, sheetTop, sheetBottom),
    // Rolled up, both rods meet at the sheet's middle.
    travel: {
      top: (sheetTop + sheetBottom) / 2 - topY,
      bottom: bottomY - (sheetTop + sheetBottom) / 2,
    },
  }
}
