import { useCallback, useMemo, useRef, useState } from 'react'
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

/**
 * The hero component. Layer order is the tree's own anatomy, back to front:
 *
 *   atmosphere -> roots -> canopy (back) -> limb wood -> trunk -> junctions
 *   -> commits -> canopy (front) -> markers -> motes
 *
 * Limb wood is drawn *under* the trunk on purpose, so every branch visibly
 * emerges from behind the trunk rather than being pasted on top of it; the
 * fork calluses and merge nodes are then drawn back over the trunk so the Git
 * topology stays legible through the anatomy.
 */
export function GitWorldTree({
  layout,
  topology,
  selectedBranch,
  selectedSha,
  onSelectBranch,
  onSelectCommit,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const [hoveredLimb, setHoveredLimb] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipTarget | null>(null)
  const { view, dragging, zoomIn, zoomOut, reset, handlers } = useTreeViewport(svgRef)

  const focus = selectedBranch ?? hoveredLimb
  const focusSha = selectedSha

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

  const limbState = (id: string): 'normal' | 'active' | 'dimmed' => {
    if (!litLimbs) return 'normal'
    if (id === focus) return 'active'
    return litLimbs.has(id) ? 'normal' : 'dimmed'
  }

  const place = useCallback((): { screenX: number; screenY: number } => {
    const box = wrapRef.current?.getBoundingClientRect()
    return {
      screenX: pointer.current.x - (box?.left ?? 0) + 16,
      screenY: pointer.current.y - (box?.top ?? 0) + 16,
    }
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
      setTooltip({ ...place(), commit })
    },
    [topology, place],
  )

  const hoverLimb = useCallback(
    (id: string | null) => {
      setHoveredLimb(id)
      if (!id) {
        setTooltip(null)
        return
      }
      const limb = layout.byId.get(id)
      if (limb) setTooltip({ ...place(), limb })
    },
    [layout, place],
  )

  // Level of detail: bark, markers and small foliage drop out when zoomed far
  // out or when the tree is very large, instead of shrinking into mush.
  const lod = view.scale < 0.7 ? 'low' : view.scale > 1.6 ? 'high' : 'mid'
  const showMarkers = lod !== 'low'

  return (
    <div className="wt-stage" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="wt-svg"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerMove={(e) => {
          pointer.current = { x: e.clientX, y: e.clientY }
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

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {/* distant ranges, kept soft so they never compete with the tree */}
          <g className="wt-layer-hills" filter="url(#wt-mist)" opacity={0.32}>
            {layout.hills.map((d, i) => (
              <path key={i} d={d} fill={i === 0 ? '#9d8a63' : i === 1 ? '#8d7b57' : '#7d6c4b'} />
            ))}
          </g>

          <WorldTreeRoots
            roots={layout.roots}
            groundY={layout.groundY}
            width={layout.width}
            cx={layout.cx}
            baseHalfWidth={layout.trunk.baseHalfWidth}
          />

          <WorldTreeCanopy
            clusters={[...layout.canopy, ...layout.limbs.flatMap((l) => l.foliage)]}
            layer="back"
            dimmedLimbs={dimmedLimbs}
          />

          {/* ---- Git branch geometry (behind the trunk) ---- */}
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

          {/* ---- forks and merges, back over the trunk ---- */}
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

          {/* ---- commits ---- */}
          <g className="wt-layer-commits" data-interactive="true">
            {layout.all.flatMap((limb) =>
              limb.commits.map((dot) => (
                <CommitNode
                  key={dot.sha + dot.limbId}
                  dot={dot}
                  state={
                    focusSha === dot.sha
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

          <WorldTreeCanopy
            clusters={[...layout.canopy, ...layout.limbs.flatMap((l) => l.foliage)]}
            layer="front"
            dimmedLimbs={dimmedLimbs}
          />

          {/* ---- labels ---- */}
          {showMarkers && (
            <g className="wt-layer-markers" data-interactive="true">
              {layout.limbs
                .filter((l) => lod === 'high' || !l.skeleton.isStub)
                .map((limb) => (
                  <BranchMarker
                    key={limb.id}
                    limb={limb}
                    state={limbState(limb.id)}
                    onHover={hoverLimb}
                    onSelect={onSelectBranch}
                  />
                ))}
              {/* the trunk names itself */}
              <g transform={`translate(${layout.cx} ${layout.groundY + 74})`}>
                <text
                  textAnchor="middle"
                  fontSize={19}
                  letterSpacing="0.26em"
                  fill={PALETTE.ink}
                  opacity={0.72}
                  style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
                >
                  {layout.trunk.id.toUpperCase()}
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
                  {layout.trunk.skeleton.commits.length} GROWTH RINGS
                </text>
              </g>
            </g>
          )}

          {/* ---- drifting motes, the only ambient motion ---- */}
          <g className="wt-layer-motes" aria-hidden>
            {layout.motes.map((m, i) => (
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

      <TreeTooltip target={tooltip} />
    </div>
  )
}
