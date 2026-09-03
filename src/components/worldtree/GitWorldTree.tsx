import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Compass, Maximize2, Minus, Plus } from 'lucide-react'
import type { GitTopology } from '../../types/git'
import type { CommitDot, WorldTreeLayout } from '../../worldtree/core/layout'
import { PALETTE } from '../../worldtree/theme'
import { TreeDefs } from './TreeDefs'
import { WorldTreeRoots } from './WorldTreeRoots'
import { WorldTreeTrunk } from './WorldTreeTrunk'
import { WorldTreeBranch } from './WorldTreeBranch'
import { WorldTreeCanopy } from './WorldTreeCanopy'
import { CommitNode } from './CommitNode'
import { BranchMarker } from './BranchMarker'
import { TreeTooltip, type TooltipTarget } from './TreeTooltip'
import { useTreeViewport } from './useTreeViewport'

interface Props {
  layout: WorldTreeLayout
  topology: GitTopology
  selectedBranch: string | null
  selectedSha: string | null
  onSelectBranch: (id: string | null) => void
  onSelectCommit: (sha: string | null) => void
}

type LimbState = 'normal' | 'active' | 'dimmed'

/**
 * The tree itself, drawn onto whatever surface it is given. It knows nothing
 * about the scroll: the page mounts this only once the parchment is open, and
 * the staged fade-in is CSS on `.wt-tree-body` / `.wt-tree-marks`.
 *
 * Layer order is the tree's own anatomy, back to front:
 *
 *   atmosphere -> roots -> canopy (back) -> limb wood -> trunk -> junctions
 *   -> commits -> canopy (front) -> markers -> motes
 *
 * Limb wood is drawn *under* the trunk on purpose, so every branch visibly
 * emerges from behind the trunk rather than being pasted on top of it; the
 * fork calluses and merge nodes are then drawn back over the trunk so the Git
 * topology stays legible through the anatomy.
 *
 * Three things here exist for the sake of frame rate, and all three are easy
 * to undo by accident:
 *
 *   1. the pan/zoom transform is written to `panRef` imperatively, never
 *      through state (see useTreeViewport);
 *   2. `clusters` is memoised, because rebuilding that array on every render made
 *      `memo` on the canopy — much the most expensive layer — do nothing;
 *   3. the tooltip's *position* is a DOM write on pointermove while only its
 *      *target* is state, so tracking the cursor does not re-render the tree.
 */
export const GitWorldTree = memo(function GitWorldTree({
  layout,
  topology,
  selectedBranch,
  selectedSha,
  onSelectBranch,
  onSelectCommit,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panRef = useRef<SVGGElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [hoveredLimb, setHoveredLimb] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipTarget | null>(null)
  const { scale, zoomIn, zoomOut, reset, handlers } = useTreeViewport(svgRef, panRef)

  const focus = selectedBranch ?? hoveredLimb

  /** Which limbs stay lit: the focused one plus its ancestry back to the trunk. */
  const litLimbs = useMemo(() => {
    if (!focus) return null
    const lit = new Set<string>()
    let cursor: string | null = focus
    while (cursor) {
      lit.add(cursor)
      cursor = layout.byId.get(cursor)?.skeleton.parentId ?? null
    }
    return lit
  }, [focus, layout])

  const dimmedLimbs = useMemo(() => {
    if (!litLimbs) return null
    const dim = new Set<string>()
    layout.all.forEach((l) => {
      if (!litLimbs.has(l.id)) dim.add(l.id)
    })
    return dim
  }, [litLimbs, layout])

  const limbState = useCallback(
    (id: string): LimbState => {
      if (!litLimbs) return 'normal'
      if (id === focus) return 'active'
      return litLimbs.has(id) ? 'normal' : 'dimmed'
    },
    [litLimbs, focus],
  )

  // Foliage is one array built from two sources. Rebuilding it on every render
  // handed `memo` a fresh reference each time, so the canopy — blob paths
  // behind displacement filters — repainted on every hover.
  const clusters = useMemo(
    () => [...layout.canopy, ...layout.limbs.flatMap((l) => l.foliage)],
    [layout],
  )

  /** Moves the tooltip without telling React, so hovering costs no re-render. */
  const trackPointer = useCallback((e: React.PointerEvent) => {
    const tip = tipRef.current
    const box = wrapRef.current?.getBoundingClientRect()
    if (!tip || !box) return
    tip.style.transform = `translate(${e.clientX - box.left + 16}px, ${e.clientY - box.top + 16}px)`
  }, [])

  const hoverCommit = useCallback(
    (dot: CommitDot | null) => {
      if (!dot) {
        setTooltip(null)
        return
      }
      const commit = topology.commits[dot.sha]
      if (!commit) return
      setHoveredLimb(dot.limbId)
      // Only the identity matters here; position is handled by trackPointer.
      setTooltip((prev) => (prev?.commit?.sha === commit.sha ? prev : { commit }))
    },
    [topology],
  )

  const hoverLimb = useCallback(
    (id: string | null) => {
      setHoveredLimb(id)
      if (!id) {
        setTooltip(null)
        return
      }
      const limb = layout.byId.get(id)
      if (limb) setTooltip((prev) => (prev?.limb?.id === id ? prev : { limb }))
    },
    [layout],
  )

  // Level of detail: markers and stub limbs drop out when zoomed far out
  // instead of shrinking into mush. `scale` only updates once a gesture
  // settles, so this never churns mid-drag.
  const lod = scale < 0.7 ? 'low' : scale > 1.6 ? 'high' : 'mid'
  const markers = useMemo(() => {
    if (lod === 'low') return []
    return lod === 'high' ? layout.limbs : layout.limbs.filter((l) => !l.skeleton.isStub)
  }, [lod, layout])

  return (
    <div className="wt-stage" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="wt-svg"
        onPointerMove={(e) => {
          trackPointer(e)
          handlers.onPointerMove(e)
        }}
        onPointerDown={handlers.onPointerDown}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onClick={() => {
          onSelectBranch(null)
          onSelectCommit(null)
        }}
        role="img"
        aria-label={`World Tree of ${topology.repo.fullName}: ${layout.limbs.length + 1} branches`}
      >
        <TreeDefs />

        <g ref={panRef}>
          <Atmosphere hills={layout.hills} />

          {/* ---- the tree's body: what a reader sees first ---- */}
          <g className="wt-tree-body">
            <WorldTreeRoots
              roots={layout.roots}
              groundY={layout.groundY}
              width={layout.width}
              cx={layout.cx}
              baseHalfWidth={layout.trunk.baseHalfWidth}
            />

            <WorldTreeCanopy clusters={clusters} layer="back" dimmedLimbs={dimmedLimbs} />

            {/* Git branch geometry, behind the trunk */}
            <g className="wt-layer-limbs" data-interactive="true">
              {layout.limbs.map((limb) => (
                <WorldTreeBranch
                  key={`wood-${limb.id}`}
                  limb={limb}
                  part="wood"
                  state={limbState(limb.id)}
                  onHover={hoverLimb}
                  onSelect={onSelectBranch}
                />
              ))}
            </g>

            <WorldTreeTrunk trunk={layout.trunk} dimmed={limbState(layout.trunk.id) === 'dimmed'} />

            {/* forks and merges, back over the trunk */}
            <g className="wt-layer-junctions" data-interactive="true">
              {layout.limbs.map((limb) => (
                <WorldTreeBranch
                  key={`junction-${limb.id}`}
                  limb={limb}
                  part="junction"
                  state={limbState(limb.id)}
                  onHover={hoverLimb}
                  onSelect={onSelectBranch}
                />
              ))}
            </g>

            <WorldTreeCanopy clusters={clusters} layer="front" dimmedLimbs={dimmedLimbs} />
          </g>

          {/* ---- what is written on the tree: runes, names, motes ---- */}
          <g className="wt-tree-marks">
            <g className="wt-layer-commits" data-interactive="true">
              {layout.all.flatMap((limb) =>
                limb.commits.map((dot) => (
                  <CommitNode
                    key={dot.sha + dot.limbId}
                    dot={dot}
                    state={
                      selectedSha === dot.sha
                        ? 'active'
                        : limbState(limb.id) === 'dimmed'
                          ? 'dimmed'
                          : 'normal'
                    }
                    onHover={hoverCommit}
                    onSelect={(d) => {
                      onSelectCommit(d.sha)
                      onSelectBranch(d.limbId)
                    }}
                  />
                )),
              )}
            </g>

            <g className="wt-layer-markers" data-interactive="true">
              {markers.map((limb) => (
                <BranchMarker
                  key={limb.id}
                  limb={limb}
                  state={limbState(limb.id)}
                  onHover={hoverLimb}
                  onSelect={onSelectBranch}
                />
              ))}
              {markers.length > 0 && (
                <TrunkName
                  cx={layout.cx}
                  y={layout.groundY + 74}
                  name={layout.trunk.id}
                  rings={layout.trunk.skeleton.commits.length}
                />
              )}
            </g>

            <Motes motes={layout.motes} />
          </g>
        </g>
      </svg>

      <div className="wt-controls">
        <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
          <Plus size={15} />
        </button>
        <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
          <Minus size={15} />
        </button>
        <button type="button" onClick={reset} aria-label="Fit tree" title="Fit the whole tree">
          <Maximize2 size={15} />
        </button>
      </div>

      <div className="wt-legend">
        <span className="wt-legend-title">
          <Compass size={13} /> Reading the tree
        </span>
        <span>
          <i className="wt-key wt-key-trunk" /> trunk = {layout.trunk.id}
        </span>
        <span>
          <i className="wt-key wt-key-growing" /> growing branch
        </span>
        <span>
          <i className="wt-key wt-key-merged" /> merged back
        </span>
        <span>
          <i className="wt-key wt-key-severed" /> closed, never merged
        </span>
        <span>
          <i className="wt-key wt-key-commit" /> commit rune
        </span>
      </div>

      <TreeTooltip ref={tipRef} target={tooltip} />
    </div>
  )
})

/* ------------------------------------------------------------------ */

/**
 * Distant ranges. Feathered at all four edges so they dissolve into the
 * parchment: they span the whole viewBox, and left alone they end on its
 * straight edge, which paints exactly the rectangle the scroll exists to
 * get rid of.
 */
const Atmosphere = memo(function Atmosphere({ hills }: { hills: string[] }) {
  return (
    <g mask="url(#wt-fade-y)">
      <g mask="url(#wt-fade-x)">
        <g className="wt-layer-hills" filter="url(#wt-mist)" opacity={0.15}>
          {hills.map((d, i) => (
            <path key={i} d={d} fill={i === 0 ? '#9d8a63' : i === 1 ? '#8d7b57' : '#7d6c4b'} />
          ))}
        </g>
      </g>
    </g>
  )
})

/** The trunk names itself, the way a map names its main road. */
const TrunkName = memo(function TrunkName({
  cx,
  y,
  name,
  rings,
}: {
  cx: number
  y: number
  name: string
  rings: number
}) {
  return (
    <g transform={`translate(${cx} ${y})`}>
      <text
        textAnchor="middle"
        fontSize={19}
        letterSpacing="0.26em"
        fill={PALETTE.ink}
        opacity={0.72}
        style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
      >
        {name.toUpperCase()}
      </text>
      <text
        y={17}
        textAnchor="middle"
        fontSize={10}
        letterSpacing="0.2em"
        fill={PALETTE.inkSoft}
        opacity={0.6}
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {rings} GROWTH RINGS
      </text>
    </g>
  )
})

/** The only ambient motion on the tree itself. */
const Motes = memo(function Motes({
  motes,
}: {
  motes: { x: number; y: number; r: number; delay: number }[]
}) {
  return (
    <g className="wt-layer-motes" aria-hidden>
      {motes.map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={m.r}
          fill={PALETTE.gold}
          opacity={0.45}
          className="wt-mote"
          style={{ animationDelay: `${m.delay}s` }}
        />
      ))}
    </g>
  )
})
