import { memo } from 'react'
import type { RenderLimb } from '../../worldtree/core/layout'
import { PALETTE } from '../../worldtree/theme'

const FILL: Record<string, string> = {
  growing: 'url(#wt-bark-limb)',
  merged: 'url(#wt-bark-merged)',
  severed: 'url(#wt-bark-severed)',
  trunk: 'url(#wt-bark)',
}

/**
 * One Git branch = one physical limb.
 *
 * - it emerges from the trunk at the commit it forked from
 * - it tapers outward like real wood
 * - a MERGED branch bends back and re-enters the trunk at its merge commit,
 *   drawn as an enchanted vine so the reconnection is unmistakable
 * - a SEVERED branch (closed, never merged) droops and ends in a broken tip
 */
function Branch({
  limb,
  state,
  part,
  onHover,
  onSelect,
}: {
  limb: RenderLimb
  state: 'normal' | 'active' | 'dimmed'
  /** 'wood' draws behind the trunk so the limb emerges from it;
   *  'junction' draws the fork callus and merge node above the trunk. */
  part: 'wood' | 'junction'
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}) {
  const active = state === 'active'
  const dimmed = state === 'dimmed'
  const merged = limb.status === 'merged'

  return (
    <g
      className="wt-branch"
      opacity={dimmed ? 0.24 : 1}
      style={{ transition: 'opacity 220ms ease', cursor: 'pointer' }}
      onPointerEnter={() => onHover(limb.id)}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(limb.id)
      }}
      role="button"
      tabIndex={0}
      aria-label={`Branch ${limb.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(limb.id)
        }
      }}
    >
      {/* selection aura, drawn under the wood */}
      {part === 'wood' && active && (
        <path
          d={limb.center}
          fill="none"
          stroke={merged ? PALETTE.arcaneGlow : PALETTE.gold}
          strokeWidth={Math.max(12, limb.baseHalfWidth * 2.6)}
          strokeOpacity={0.24}
          strokeLinecap="round"
          filter="url(#wt-glow)"
          className="wt-pulse"
        />
      )}

      {part === 'wood' && (
        <>
      <path d={limb.outline} fill="#33240f" opacity={0.26} transform="translate(4 6)" />

      <g filter="url(#wt-rough)">
        <path
          d={limb.outline}
          fill={FILL[limb.status] ?? FILL.growing}
          stroke={PALETTE.ink}
          strokeWidth={active ? 2.2 : 1.6}
          strokeOpacity={0.7}
        />
      </g>

      {limb.bark.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={i === 0 ? '#33240f' : PALETTE.barkHigh}
          strokeWidth={i === 0 ? 1.4 : 0.9}
          strokeOpacity={0.3}
          strokeLinecap="round"
        />
      ))}

      {/* a merged limb keeps a faint arcane thread along its length — the
          visual language for "this history flowed back into main" */}
      {merged && (
        <path
          d={limb.center}
          fill="none"
          stroke={PALETTE.arcaneGlow}
          strokeWidth={active ? 2.2 : 1.4}
          strokeOpacity={active ? 0.75 : 0.4}
          strokeDasharray="7 9"
          strokeLinecap="round"
        />
      )}
        </>
      )}

      {/* the fork: a callus of new growth where the limb leaves its parent */}
      {part === 'junction' && limb.fork && (
        <ellipse
          cx={limb.fork.x}
          cy={limb.fork.y}
          rx={limb.baseHalfWidth * 1.25 + 3}
          ry={limb.baseHalfWidth * 0.9 + 3}
          fill={PALETTE.barkMid}
          stroke={PALETTE.ink}
          strokeWidth={1}
          strokeOpacity={0.4}
          opacity={0.85}
          filter="url(#wt-rough-soft)"
        />
      )}

      {/* the merge: the limb visibly enters the trunk again */}
      {part === 'junction' && limb.mergePoint && (
        <g>
          <circle
            cx={limb.mergePoint.x}
            cy={limb.mergePoint.y}
            r={13}
            fill="url(#wt-hollow)"
            opacity={active ? 0.95 : 0.6}
          />
          <circle
            cx={limb.mergePoint.x}
            cy={limb.mergePoint.y}
            r={5.2}
            fill={PALETTE.arcaneGlow}
            stroke={PALETTE.ink}
            strokeWidth={1.1}
            strokeOpacity={0.55}
          />
        </g>
      )}

      {/* a severed limb ends in splintered wood */}
      {part === 'junction' && limb.status === 'severed' && (
        <g transform={`translate(${limb.tip.x} ${limb.tip.y})`}>
          <path
            d="M-7,-4 L2,-9 L0,-1 L8,2 L-1,5 L-5,11 Z"
            fill="#4a3222"
            stroke={PALETTE.ink}
            strokeWidth={1}
            strokeOpacity={0.6}
          />
        </g>
      )}
    </g>
  )
}

export const WorldTreeBranch = memo(Branch)
