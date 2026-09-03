import { memo } from 'react'
import type { RenderLimb } from '../../worldtree/core/layout'
import { PALETTE } from '../../worldtree/theme'

/**
 * A carved wayfinder hung on the limb: branch name, plus a quest sigil when a
 * pull request is attached to that branch.
 */
function Marker({
  limb,
  state,
  onHover,
  onSelect,
}: {
  limb: RenderLimb
  state: 'normal' | 'active' | 'dimmed'
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}) {
  const { label } = limb
  const name = limb.id.length > 26 ? `${limb.id.slice(0, 24)}…` : limb.id
  const openPr = limb.skeleton.pullRequests.find((p) => p.state === 'open')
  const pr = openPr ?? limb.skeleton.pullRequests[0]
  const flip = label.anchor === 'end'
  const active = state === 'active'

  const charW = 6.6
  const w = Math.max(72, name.length * charW + 26 + (pr ? 34 : 0))
  const h = 24
  const x = flip ? -w : 0

  return (
    <g
      transform={`translate(${label.x} ${label.y})`}
      opacity={state === 'dimmed' ? 0.2 : 1}
      style={{ transition: 'opacity 200ms ease', cursor: 'pointer' }}
      onPointerEnter={() => onHover(limb.id)}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(limb.id)
      }}
    >
      {/* cord tying the plaque to the limb */}
      <path
        d={`M${flip ? 0 : 0},${h / 2} L${flip ? 14 : -14},${h / 2 + 12}`}
        stroke={PALETTE.bronze}
        strokeWidth={1.4}
        strokeOpacity={0.7}
      />

      <g filter={active ? 'url(#wt-drop)' : undefined}>
        <path
          d={`M${x + 5},${-h / 2}
              L${x + w - 5},${-h / 2 - 1.5}
              L${x + w},${0}
              L${x + w - 5},${h / 2 + 1}
              L${x + 5},${h / 2}
              L${x},${0} Z`}
          fill={active ? '#f0e3c2' : PALETTE.parchmentMid}
          stroke={PALETTE.ink}
          strokeWidth={active ? 1.6 : 1.1}
          strokeOpacity={0.7}
          filter="url(#wt-rough-soft)"
        />
        {limb.status === 'growing' && (
          <circle cx={x + 11} cy={0} r={3.2} fill={PALETTE.leafMid} opacity={0.9} />
        )}
        {limb.status === 'merged' && (
          <circle cx={x + 11} cy={0} r={3.2} fill={PALETTE.arcane} opacity={0.9} />
        )}
        {limb.status === 'severed' && (
          <circle cx={x + 11} cy={0} r={3.2} fill={PALETTE.danger} opacity={0.9} />
        )}
        <text
          x={x + 20}
          y={4}
          fontSize={11}
          fontWeight={600}
          fill={PALETTE.ink}
          style={{ fontFamily: 'Georgia, "Iowan Old Style", serif', letterSpacing: '0.02em' }}
        >
          {name}
        </text>
        {pr && (
          <g transform={`translate(${x + w - 26} 0)`}>
            <path
              d="M0,-8 L9,-4 L9,5 L0,9 L-9,5 L-9,-4 Z"
              fill={
                pr.state === 'open'
                  ? PALETTE.gold
                  : pr.state === 'merged'
                    ? PALETTE.arcane
                    : PALETTE.danger
              }
              stroke={PALETTE.ink}
              strokeWidth={1}
              strokeOpacity={0.7}
            />
            <text
              x={0}
              y={3}
              fontSize={8}
              textAnchor="middle"
              fill="#2b1d0d"
              fontWeight={700}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {pr.number > 99 ? '!' : pr.number}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

export const BranchMarker = memo(Marker)
