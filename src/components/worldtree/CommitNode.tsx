import { memo } from 'react'
import type { CommitDot } from '../../worldtree/core/layout'
import { PALETTE } from '../../worldtree/theme'

/**
 * Commits are carved growth marks, not graph dots: a rune notch for an ordinary
 * commit, a bronze stud with a ring where two histories met, an amber ember for
 * a branch HEAD, and a seed for the root commit.
 */
function Node({
  dot,
  state,
  onHover,
  onSelect,
}: {
  dot: CommitDot
  state: 'normal' | 'active' | 'dimmed'
  onHover: (dot: CommitDot | null) => void
  onSelect: (dot: CommitDot) => void
}) {
  const active = state === 'active'
  const dimmed = state === 'dimmed'
  const r = dot.r * (active ? 1.35 : 1)

  return (
    <g
      transform={`translate(${dot.x} ${dot.y})`}
      opacity={dimmed ? 0.22 : 1}
      style={{ transition: 'opacity 200ms ease', cursor: 'pointer' }}
      onPointerEnter={() => onHover(dot)}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(dot)
      }}
    >
      {/* generous invisible hit area */}
      <circle r={Math.max(13, r + 8)} fill="transparent" />

      {active && <circle r={r + 11} fill="url(#wt-ember)" opacity={0.55} />}

      {dot.kind === 'head' && <circle r={r + 6} fill="url(#wt-ember)" opacity={0.5} />}

      {dot.kind === 'merge' ? (
        <g>
          <circle r={r + 2.4} fill="none" stroke={PALETTE.arcane} strokeWidth={1.6} strokeOpacity={0.75} />
          <circle r={r} fill={PALETTE.bronze} stroke={PALETTE.ink} strokeWidth={1.2} strokeOpacity={0.7} />
          <path
            d={`M${-r * 0.55},${r * 0.5} L0,${-r * 0.15} L${r * 0.55},${r * 0.5}`}
            fill="none"
            stroke="#f0dcae"
            strokeWidth={1.2}
            strokeOpacity={0.8}
            strokeLinecap="round"
          />
        </g>
      ) : dot.kind === 'root' ? (
        <g>
          <ellipse rx={r * 1.1} ry={r * 1.5} fill={PALETTE.ochre} stroke={PALETTE.ink} strokeWidth={1.2} strokeOpacity={0.7} />
          <path d={`M0,${-r * 1.2} L0,${r * 0.9}`} stroke="#f0dcae" strokeWidth={1} strokeOpacity={0.7} />
        </g>
      ) : dot.kind === 'head' ? (
        <g>
          <circle r={r} fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth={1.4} strokeOpacity={0.75} />
          <circle r={r * 0.42} fill="#fff2cd" opacity={0.9} />
        </g>
      ) : (
        <g>
          {/* carved rune notch */}
          <circle r={r} fill={PALETTE.barkPale} stroke={PALETTE.ink} strokeWidth={1.2} strokeOpacity={0.65} />
          <path
            d={`M${-r * 0.45},${r * 0.16} L${r * 0.45},${-r * 0.16}`}
            stroke="#4a3520"
            strokeWidth={1.2}
            strokeOpacity={0.6}
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  )
}

export const CommitNode = memo(Node)
