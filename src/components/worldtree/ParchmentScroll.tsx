import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildScroll, type ScrollGeometry } from '../../worldtree/core/scroll'
import { hashSeed } from '../../worldtree/geometry/prng'

/**
 * The great scroll. Everything on this page is drawn on it: the scroll is the
 * canvas, not a decorated card that happens to hold one.
 *
 * Two layers, both absolutely filling the same measured box:
 *
 *   1. a parchment SVG at `viewBox="0 0 w h"`, so one user unit is one CSS
 *      pixel and no ornament stretches with the window;
 *   2. the children — the tree — positioned into `geometry.canvas`, the
 *      generous inner region the parchment leaves clear.
 *
 * Sizing therefore has to come from a real measurement rather than from CSS,
 * which is what the ResizeObserver below is for. Until the first measurement
 * lands there is no geometry and nothing paints; that frame is invisible
 * because the element has no size to paint into yet either.
 */

type Phase = 'rolled' | 'unfurling' | 'open'

interface Props {
  /** Seeds the parchment's blemishes, so one repository keeps one sheet. */
  seed: string
  children: React.ReactNode
  /** Re-runs the unfurl. Changing it rolls the scroll shut and opens it again. */
  unfurlKey?: string
  /** Reports the moment the parchment is fully open, for staged reveals. */
  onOpen?: (open: boolean) => void
}

const UNFURL_MS = 1250

function useMeasured<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      // Sub-pixel churn would rebuild the whole parchment on every wobble of a
      // flex layout, so only a change worth redrawing counts as one.
      setBox((prev) =>
        prev && Math.abs(prev.w - r.width) < 2 && Math.abs(prev.h - r.height) < 2
          ? prev
          : { w: Math.round(r.width), h: Math.round(r.height) },
      )
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, box] as const
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ParchmentScroll({ seed, children, unfurlKey = '', onOpen }: Props) {
  const [wrapRef, box] = useMeasured<HTMLDivElement>()
  const [phase, setPhase] = useState<Phase>('rolled')

  const geo: ScrollGeometry | null = useMemo(() => {
    if (!box || box.w < 240 || box.h < 240) return null
    return buildScroll(box.w, box.h, hashSeed(seed))
  }, [box, seed])

  // The unfurl runs once per key. It waits for geometry, because opening a
  // scroll that has not been measured yet would animate rods to the wrong
  // place and then snap them.
  useEffect(() => {
    if (!geo) return
    if (prefersReducedMotion()) {
      setPhase('open')
      onOpen?.(true)
      return
    }
    setPhase('rolled')
    onOpen?.(false)
    // One frame closed, so the browser has a "before" to transition from.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('unfurling'))
    })
    const done = setTimeout(() => {
      setPhase('open')
      onOpen?.(true)
    }, UNFURL_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
    // `geo` is intentionally excluded: a resize re-measures the parchment but
    // must not re-open a scroll the reader already has open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unfurlKey, Boolean(geo)])

  const open = phase !== 'rolled'
  const id = useMemo(() => `ps-${hashSeed(seed).toString(36)}`, [seed])

  // Three hundred freckles as three hundred elements is a real DOM cost for
  // no visible gain, so they collapse into three paths — one per density band,
  // which is as much variation as the eye reads at this size anyway.
  const foxingBands = useMemo(() => {
    if (!geo) return []
    const bands = [0.12, 0.22, 0.34].map((opacity) => ({ opacity, d: '' }))
    for (const f of geo.foxing) {
      const b = f.opacity < 0.14 ? 0 : f.opacity < 0.23 ? 1 : 2
      bands[b].d +=
        `M${f.x} ${f.y}m${-f.r} 0a${f.r} ${f.r} 0 1 0 ${f.r * 2} 0a${f.r} ${f.r} 0 1 0 ${-f.r * 2} 0`
    }
    return bands.filter((b) => b.d)
  }, [geo])

  return (
    <div className="ps-scroll" ref={wrapRef} data-phase={phase}>
      {geo && (
        <>
          <svg
            className="ps-svg"
            viewBox={`0 0 ${geo.w} ${geo.h}`}
            width={geo.w}
            height={geo.h}
            aria-hidden="true"
            focusable="false"
          >
            <ScrollDefs id={id} geo={geo} />

            {/* ---- the sheet, clipped open from its own middle ---- */}
            <g
              className="ps-sheet"
              style={{
                clipPath: open
                  ? `inset(0 0 0 0)`
                  : `inset(${geo.travel.top}px 0 ${geo.travel.bottom}px 0)`,
              }}
            >
              <g className="ps-tension">
                <path d={geo.sheet.path} fill={`url(#${id}-paper)`} />
                <path d={geo.sheet.path} fill={`url(#${id}-bloom)`} />
                {/* The fibre of a hand-made sheet, and the raised lip where the
                    paper's own thickness catches the light along the top. */}
                <path d={geo.sheet.path} fill={`url(#${id}-fibre)`} opacity={0.5} />
                <path
                  d={geo.sheet.path}
                  fill="none"
                  stroke="#f2e2ba"
                  strokeWidth={1.4}
                  opacity={0.3}
                />

                <g clipPath={`url(#${id}-sheet-clip)`}>
                  {geo.stains.map((s, i) => (
                    <ellipse
                      key={i}
                      cx={s.cx}
                      cy={s.cy}
                      rx={s.rx}
                      ry={s.ry}
                      transform={`rotate(${s.rot} ${s.cx} ${s.cy})`}
                      fill={`url(#${id}-stain-${s.tone})`}
                      opacity={s.opacity}
                    />
                  ))}

                  {/* Age freckles. Drawn as one path of many subpaths rather
                      than hundreds of elements, because at three hundred specks
                      the DOM cost stops being free. */}
                  <g className="ps-foxing">
                    {foxingBands.map((band, i) => (
                      <path key={i} d={band.d} fill="#5c3d16" opacity={band.opacity} />
                    ))}
                  </g>

                  {/* folds read as a dark crease with a lit shoulder beside it */}
                  <g className="ps-folds">
                    {geo.folds.map((d, i) => (
                      <g key={i}>
                        <path d={d} stroke="#7d6034" strokeWidth={1.6} fill="none" opacity={0.2} />
                        <path
                          d={d}
                          stroke="#f0dfb6"
                          strokeWidth={2.4}
                          fill="none"
                          opacity={0.28}
                          transform="translate(1.6 0)"
                        />
                      </g>
                    ))}
                  </g>

                  <g className="ps-wrinkles">
                    {geo.wrinkles.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        stroke={i % 2 ? '#eddcb2' : '#6f5730'}
                        strokeWidth={1}
                        fill="none"
                        opacity={i % 2 ? 0.3 : 0.13}
                      />
                    ))}
                  </g>

                  {/* Weathering, in three passes from the inside out: a wide
                      grubby halo where hands have held the sheet, a scorch, and
                      a near-black char right on the tear. */}
                  <path
                    d={geo.sheet.path}
                    fill="none"
                    stroke="#7d5a26"
                    strokeWidth={76}
                    opacity={0.3}
                    filter={`url(#${id}-soft)`}
                  />
                  <path
                    d={geo.sheet.path}
                    fill="none"
                    stroke="#5d3d13"
                    strokeWidth={30}
                    opacity={0.52}
                    filter={`url(#${id}-soft)`}
                  />
                  <path
                    d={geo.sheet.path}
                    fill="none"
                    stroke="#2e1a06"
                    strokeWidth={9}
                    opacity={0.5}
                    filter={`url(#${id}-char)`}
                  />
                </g>

                {/* ---- engraved border ---- */}
                <g className="ps-border">
                  <path d={geo.rule.outer} fill="none" stroke="#513a15" strokeWidth={1.5} opacity={0.55} />
                  <path d={geo.rule.inner} fill="none" stroke="#513a15" strokeWidth={0.8} opacity={0.38} />
                  {geo.runes.map((r, i) => (
                    <g key={i} transform={`translate(${r.x} ${r.y}) scale(${r.scale})`}>
                      <path
                        d={r.d}
                        stroke="#e9d8ae"
                        strokeWidth={1.9}
                        strokeLinecap="round"
                        fill="none"
                        opacity={0.45}
                        transform="translate(0 1)"
                      />
                      <path
                        d={r.d}
                        stroke="#432f10"
                        strokeWidth={1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity={0.62}
                      />
                    </g>
                  ))}
                  {geo.corners.map((c, i) => (
                    <g
                      key={i}
                      transform={`translate(${c.x} ${c.y}) scale(${c.flipX ? -1 : 1} ${c.flipY ? -1 : 1})`}
                    >
                      <CornerMotif />
                    </g>
                  ))}
                </g>

                {/* ---- the curl the sheet keeps from having been rolled ---- */}
                <path
                  d={`M${geo.sheet.left} ${geo.sheet.top}
                      C${geo.sheet.left + 16} ${geo.sheet.top + (geo.sheet.bottom - geo.sheet.top) * 0.34}
                       ${geo.sheet.left + 16} ${geo.sheet.top + (geo.sheet.bottom - geo.sheet.top) * 0.66}
                       ${geo.sheet.left} ${geo.sheet.bottom}Z`}
                  fill={`url(#${id}-curl-l)`}
                />
                <path
                  d={`M${geo.sheet.right} ${geo.sheet.top}
                      C${geo.sheet.right - 16} ${geo.sheet.top + (geo.sheet.bottom - geo.sheet.top) * 0.34}
                       ${geo.sheet.right - 16} ${geo.sheet.top + (geo.sheet.bottom - geo.sheet.top) * 0.66}
                       ${geo.sheet.right} ${geo.sheet.bottom}Z`}
                  fill={`url(#${id}-curl-r)`}
                />

                <g className="ps-motes">
                  {geo.motes.map((m, i) => (
                    <circle
                      key={i}
                      cx={m.x}
                      cy={m.y}
                      r={m.r}
                      fill="#7a5c28"
                      opacity={0.4}
                      style={
                        {
                          animationDelay: `${m.delay}s`,
                          animationDuration: `${m.duration}s`,
                          '--drift': `${m.drift}px`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </g>
              </g>
            </g>

            {/* ---- rollers, drawn over the sheet they hold ---- */}
            <Roller
              id={id}
              geo={geo}
              y={geo.rod.topY}
              offset={open ? 0 : geo.travel.top}
              side="top"
            />
            <Roller
              id={id}
              geo={geo}
              y={geo.rod.bottomY}
              offset={open ? 0 : -geo.travel.bottom}
              side="bottom"
            />
          </svg>

          <div
            className="ps-canvas"
            style={{
              left: geo.canvas.left,
              top: geo.canvas.top,
              width: geo.canvas.width,
              height: geo.canvas.height,
            }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * One roller: the paper still rolled around it, the wooden rod, its iron
 * bands, and a carved cap at each end. Drawn in that order because that is
 * the order the parts occlude each other on a real one.
 */
function Roller({
  id,
  geo,
  y,
  offset,
  side,
}: {
  id: string
  geo: ScrollGeometry
  y: number
  offset: number
  side: 'top' | 'bottom'
}) {
  const { rod, cap } = geo
  const h = rod.height
  const top = y - h / 2
  const dir = side === 'top' ? 1 : -1
  // The roll of unused parchment sits on the sheet side of the rod.
  const rollY = side === 'top' ? y + h / 2 - 4 : y - h / 2 + 4
  /** How far past the rod the wound paper shows. */
  const rollDepth = 22
  // The roll runs the rod's full length, not the sheet's: ending it short of
  // the caps left a hard vertical cut in mid-air. The caps now cover both ends.
  const l = rod.left + 4
  const r = rod.right - 4

  /**
   * One turn of the roll at depth `k` (0 at the rod, 1 at the free edge). The
   * paper sags a little in the middle of a long span, so each turn is a
   * shallow curve rather than a straight line.
   */
  const rollTurn = (k: number) => {
    const yk = rollY + dir * rollDepth * k
    const sag = dir * (3 + 5 * k)
    return `M${l} ${yk} Q${geo.w / 2} ${yk + sag} ${r} ${yk}`
  }
  const rollBand = `${rollTurn(0)} L${r} ${rollY + dir * rollDepth} Q${geo.w / 2} ${
    rollY + dir * (rollDepth + 8)
  } ${l} ${rollY + dir * rollDepth} Z`

  return (
    <g className={`ps-roller ps-roller-${side}`} style={{ transform: `translateY(${offset}px)` }}>
      {/* The parchment still wound on the rod.
       *
       * Stacking a few pale strokes here just produced one flat white band:
       * the strokes overlapped, and the lightest simply covered the rest. What
       * is actually visible past the rod is a sliver of a paper *cylinder*, so
       * this is a filled band shaded across its depth — bright where it leaves
       * the rod, falling into shadow as it curves away toward the sheet — with
       * a couple of turn edges scored across it and a contact shadow thrown
       * onto the sheet below. */}
      <g className="ps-roll">
        <path d={rollBand} fill={`url(#${id}-roll-${side})`} />
        {/* The cut ends of the turns underneath, visible only close to the rod
            where the outermost turn has not yet flattened over them. */}
        {[0.16, 0.3].map((k, i) => (
          <path
            key={i}
            d={rollTurn(k)}
            fill="none"
            stroke="#8a6a38"
            strokeWidth={1.1}
            opacity={0.26 - i * 0.09}
          />
        ))}
        {/* the outermost turn's own lit edge, right against the rod */}
        <path d={rollTurn(0.05)} fill="none" stroke="#e8d6ab" strokeWidth={1.5} opacity={0.36} />
        {/* the rod's shadow falling across the paper wound beneath it */}
        <path
          d={rollTurn(0)}
          fill="none"
          stroke="#33230c"
          strokeWidth={9}
          opacity={0.3}
          filter={`url(#${id}-soft)`}
        />
      </g>

      <rect
        x={rod.left}
        y={top}
        width={rod.right - rod.left}
        height={h}
        rx={h / 2}
        fill={`url(#${id}-wood)`}
      />
      {/* grain, then the specular band that makes the rod read as a cylinder */}
      <rect
        x={rod.left}
        y={top}
        width={rod.right - rod.left}
        height={h}
        rx={h / 2}
        fill={`url(#${id}-grain)`}
        opacity={0.5}
      />
      <rect
        x={rod.left}
        y={top + h * 0.16}
        width={rod.right - rod.left}
        height={h * 0.2}
        rx={h * 0.1}
        fill="#a5844e"
        opacity={0.2}
      />

      {/* antique gold bands where the wood meets the caps */}
      {[rod.left + 26, rod.right - 26].map((bx, i) => (
        <g key={i}>
          <rect x={bx - 7} y={top - 2} width={14} height={h + 4} rx={3} fill={`url(#${id}-brass)`} />
          <rect x={bx - 7} y={top - 2} width={14} height={h + 4} rx={3} fill="none" stroke="#3a2a0f" strokeWidth={0.8} opacity={0.6} />
        </g>
      ))}

      {/* carved caps */}
      <Cap id={id} cx={cap.w * 0.5} cy={y} w={cap.w} h={cap.h} />
      <Cap id={id} cx={geo.w - cap.w * 0.5} cy={y} w={cap.w} h={cap.h} />
    </g>
  )
}

/**
 * A cast finial. Four turned parts, outside in: a dark bronze body, a ring of
 * cut notches around its rim, an antique-gold collar, and a star boss on the
 * face. The notches are what stop it reading as a plain brass oval — a turned
 * cap is worked on its rim, and that is where the eye looks for evidence of a
 * hand.
 */
function Cap({
  id,
  cx,
  cy,
  w,
  h,
}: {
  id: string
  cx: number
  cy: number
  w: number
  h: number
}) {
  const notches = 12
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={w * 0.5} ry={h * 0.5} fill={`url(#${id}-bronze)`} />
      <ellipse
        cx={cx}
        cy={cy}
        rx={w * 0.5}
        ry={h * 0.5}
        fill="none"
        stroke="#241705"
        strokeWidth={1.6}
        opacity={0.8}
      />

      {/* cut rim */}
      <g opacity={0.55}>
        {Array.from({ length: notches }, (_, i) => {
          const a = (i / notches) * Math.PI * 2
          const rx0 = w * 0.5
          const ry0 = h * 0.5
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * rx0 * 0.98}
              y1={cy + Math.sin(a) * ry0 * 0.98}
              x2={cx + Math.cos(a) * rx0 * 0.78}
              y2={cy + Math.sin(a) * ry0 * 0.78}
              stroke={i % 2 ? '#b99b5e' : '#1d1607'}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )
        })}
      </g>

      <ellipse cx={cx} cy={cy} rx={w * 0.36} ry={h * 0.36} fill={`url(#${id}-brass)`} />
      <ellipse
        cx={cx}
        cy={cy}
        rx={w * 0.36}
        ry={h * 0.36}
        fill="none"
        stroke="#3a2a0f"
        strokeWidth={1.1}
        opacity={0.75}
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={w * 0.26}
        ry={h * 0.26}
        fill="none"
        stroke="#2c1d08"
        strokeWidth={0.9}
        opacity={0.45}
      />

      {/* four-point star boss, the fitting's only ornament */}
      <path
        d={`M${cx} ${cy - h * 0.22}L${cx + w * 0.07} ${cy}L${cx} ${cy + h * 0.22}L${cx - w * 0.07} ${cy}Z`}
        fill="#c2a866"
      />
      <path
        d={`M${cx} ${cy - h * 0.22}L${cx + w * 0.07} ${cy}L${cx} ${cy + h * 0.22}L${cx - w * 0.07} ${cy}Z`}
        fill="none"
        stroke="#6b4a18"
        strokeWidth={0.7}
        opacity={0.7}
      />
      {/* the specular the whole casting turns on */}
      <ellipse cx={cx - w * 0.08} cy={cy - h * 0.24} rx={w * 0.2} ry={h * 0.11} fill="#e0cb96" opacity={0.2} />
    </g>
  )
}

function CornerMotif() {
  // An L of engraved rules closing on a rosette — the cartographer's mark that
  // says the border is finished here rather than merely stopping.
  return (
    <g fill="none" stroke="#432f10" strokeWidth={1.4} opacity={0.62} strokeLinecap="round">
      <path d="M0 30 C0 12 12 0 30 0" />
      <path d="M0 44 C0 19 19 0 44 0" strokeWidth={0.9} opacity={0.8} />
      <path d="M9 9 l7 7" strokeWidth={1.1} />
      <circle cx="17" cy="17" r="4.5" strokeWidth={1.1} />
      <circle cx="17" cy="17" r="1.4" fill="#432f10" stroke="none" />
      <path d="M31 3 l4 4M3 31 l4 4" strokeWidth={1} opacity={0.7} />
    </g>
  )
}

/* ------------------------------------------------------------------ */

function ScrollDefs({ id, geo }: { id: string; geo: ScrollGeometry }) {
  return (
    <defs>
      <clipPath id={`${id}-sheet-clip`}>
        <path d={geo.sheet.path} />
      </clipPath>

      {/* Aged sheet: warm in the middle, cooling and darkening toward the
          edges, which is how light falls on paper held open under a lamp. */}
      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#ddc9a0" />
        <stop offset="0.32" stopColor="#d2bb8d" />
        <stop offset="0.68" stopColor="#c2a877" />
        <stop offset="1" stopColor="#a98f62" />
      </linearGradient>

      {/* Lamplight falling on the sheet, off-centre. A perfectly centred bloom
          is the tell of a generated texture; a real one is lit from wherever
          the lamp happens to stand. */}
      <radialGradient id={`${id}-bloom`} cx="0.43" cy="0.36" r="0.66">
        <stop offset="0" stopColor="#fbeec9" stopOpacity="0.4" />
        <stop offset="0.48" stopColor="#f0dcb0" stopOpacity="0.12" />
        <stop offset="0.82" stopColor="#5c431c" stopOpacity="0.16" />
        <stop offset="1" stopColor="#3d2a0e" stopOpacity="0.34" />
      </radialGradient>

      <pattern
        id={`${id}-fibre`}
        width="160"
        height="160"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-4)"
      >
        <g stroke="#a88752" strokeWidth="0.7" fill="none" opacity="0.34">
          <path d="M0 26 C50 20 96 34 160 24" />
          <path d="M0 74 C58 82 108 66 160 78" />
          <path d="M0 124 C64 116 112 130 160 120" />
        </g>
        <g stroke="#fff4d8" strokeWidth="0.7" fill="none" opacity="0.36">
          <path d="M0 48 C46 42 104 56 160 46" />
          <path d="M0 100 C52 108 114 92 160 104" />
        </g>
      </pattern>

      <radialGradient id={`${id}-stain-umber`}>
        <stop offset="0" stopColor="#6b4718" stopOpacity="0.95" />
        <stop offset="0.5" stopColor="#6b4718" stopOpacity="0.5" />
        <stop offset="0.86" stopColor="#6b4718" stopOpacity="0.14" />
        <stop offset="1" stopColor="#6b4718" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-stain-tea`}>
        <stop offset="0" stopColor="#8f6b32" stopOpacity="0.85" />
        <stop offset="0.5" stopColor="#8f6b32" stopOpacity="0.38" />
        <stop offset="1" stopColor="#8f6b32" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-stain-soot`}>
        <stop offset="0" stopColor="#2e2411" stopOpacity="0.8" />
        <stop offset="0.55" stopColor="#2e2411" stopOpacity="0.3" />
        <stop offset="1" stopColor="#2e2411" stopOpacity="0" />
      </radialGradient>

      {/* The wound paper, shaded across its depth. Both rolls are lit from the
          same overhead source, so the top one shows its lit face and the
          bottom one shows the shadowed underside of the same cylinder. */}
      {/* The wound paper, shaded across its depth.
       *
       * The far stop is the parchment's own tone, not a darker edge: the
       * outermost turn of the roll IS the open sheet, so a boundary there
       * turned the whole thing into a shelf with the sheet hanging off it.
       * The roll now curves out of the rod's shadow and resolves into the
       * page. */}
      <linearGradient id={`${id}-roll-top`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6b5530" />
        <stop offset="0.3" stopColor="#c6ae82" />
        <stop offset="0.62" stopColor="#ddc9a0" />
        <stop offset="1" stopColor="#d8c398" />
      </linearGradient>
      <linearGradient id={`${id}-roll-bottom`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#63502c" />
        <stop offset="0.3" stopColor="#ab9268" />
        <stop offset="0.62" stopColor="#bda379" />
        <stop offset="1" stopColor="#b39a70" />
      </linearGradient>

      <linearGradient id={`${id}-curl-l`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8a6b38" stopOpacity="0.42" />
        <stop offset="0.45" stopColor="#c6ab77" stopOpacity="0.2" />
        <stop offset="1" stopColor="#fff6dd" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-curl-r`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#8a6b38" stopOpacity="0.42" />
        <stop offset="0.45" stopColor="#c6ab77" stopOpacity="0.2" />
        <stop offset="1" stopColor="#fff6dd" stopOpacity="0" />
      </linearGradient>

      {/* Rod: lit from above, so the highlight sits high and the reflected
          bounce sits low, with the core shadow between them. */}
      {/* Dry, dark, unvarnished wood. The earlier ramp peaked at a bright
          orange-tan that read as polished furniture; an archive rod is closer
          to bog oak with a dusty sheen. */}
      <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a1a0a" />
        <stop offset="0.15" stopColor="#5b4022" />
        <stop offset="0.33" stopColor="#725333" />
        <stop offset="0.6" stopColor="#402b14" />
        <stop offset="0.85" stopColor="#1e1206" />
        <stop offset="1" stopColor="#3c2812" />
      </linearGradient>

      <linearGradient id={`${id}-grain`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2a1a08" stopOpacity="0.5" />
        <stop offset="0.04" stopColor="#2a1a08" stopOpacity="0" />
        <stop offset="0.3" stopColor="#3b2712" stopOpacity="0.22" />
        <stop offset="0.44" stopColor="#3b2712" stopOpacity="0" />
        <stop offset="0.68" stopColor="#3b2712" stopOpacity="0.26" />
        <stop offset="0.8" stopColor="#3b2712" stopOpacity="0" />
        <stop offset="0.96" stopColor="#2a1a08" stopOpacity="0" />
        <stop offset="1" stopColor="#2a1a08" stopOpacity="0.5" />
      </linearGradient>

      {/* Tarnished bronze. Bright polished gold is the single fastest way to
          make a relic look like a game asset store icon, so the highlights
          here stop well short of yellow and the darks go green-black. */}
      <linearGradient id={`${id}-bronze`} x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#9c7f45" />
        <stop offset="0.26" stopColor="#6b5228" />
        <stop offset="0.58" stopColor="#33280f" />
        <stop offset="0.84" stopColor="#1d1607" />
        <stop offset="1" stopColor="#5a4720" />
      </linearGradient>

      <linearGradient id={`${id}-brass`} x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stopColor="#cdb277" />
        <stop offset="0.3" stopColor="#9a7c40" />
        <stop offset="0.62" stopColor="#57411c" />
        <stop offset="1" stopColor="#8f7439" />
      </linearGradient>

      <filter id={`${id}-soft`} x="-15%" y="-15%" width="130%" height="130%">
        <feGaussianBlur stdDeviation="14" />
      </filter>

      {/* Char does not blur evenly — it eats into the fibre. Turbulence
          displaces the burnt line so its inner boundary is ragged. */}
      <filter id={`${id}-char`} x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
    </defs>
  )
}
