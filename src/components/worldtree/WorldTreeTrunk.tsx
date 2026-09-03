import { memo } from 'react'
import type { RenderLimb } from '../../worldtree/core/layout'
import { PALETTE } from '../../worldtree/theme'

/**
 * The `main` branch, rendered as the World Tree trunk. Its height is the length
 * of main's history, its width comes from the same history, and its silhouette
 * is an asymmetric tapered ribbon built from the trunk spine — never a
 * rectangle, tube or straight line.
 */
function Trunk({ trunk, dimmed }: { trunk: RenderLimb; dimmed: boolean }) {
  return (
    <g
      className="wt-trunk"
      opacity={dimmed ? 0.35 : 1}
      style={{ transition: 'opacity 220ms ease' }}
    >
      {/* upper boughs, drawn first so the trunk body overlaps their bases */}
      <g filter="url(#wt-rough)">
        {(trunk.crownBoughs ?? []).map((d, i) => (
          <path
            key={i}
            d={d}
            fill="url(#wt-bark-limb)"
            stroke={PALETTE.ink}
            strokeWidth={1.4}
            strokeOpacity={0.6}
          />
        ))}
      </g>

      {/* cast shadow */}
      <path d={trunk.outline} fill="#33240f" opacity={0.3} transform="translate(9 12)" />

      <g filter="url(#wt-rough)">
        <path
          d={trunk.outline}
          fill="url(#wt-bark)"
          stroke={PALETTE.ink}
          strokeWidth={2.4}
          strokeOpacity={0.72}
        />
      </g>

      {/* bark grooves following the trunk's own spine */}
      <g
        fill="none"
        strokeLinecap="round"
        clipPath="url(#wt-trunk-clip)"
        filter="url(#wt-rough-soft)"
      >
        {trunk.bark.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={i % 2 === 0 ? '#33240f' : PALETTE.barkHigh}
            strokeWidth={i % 2 === 0 ? 2.2 : 1.3}
            strokeOpacity={i % 2 === 0 ? 0.42 : 0.3}
          />
        ))}
        <path d={trunk.highlight} stroke={PALETTE.barkPale} strokeWidth={3.4} strokeOpacity={0.24} />
      </g>

      {/* knots and old scars */}
      {trunk.knots.map((k, i) => (
        <g key={i} transform={`translate(${k.x} ${k.y}) rotate(${k.rot})`}>
          <ellipse rx={k.rx} ry={k.ry} fill="#3b2913" opacity={0.55} />
          <ellipse rx={k.rx * 0.62} ry={k.ry * 0.6} fill="#28190a" opacity={0.6} />
          <ellipse
            rx={k.rx * 0.9}
            ry={k.ry * 0.86}
            fill="none"
            stroke={PALETTE.barkHigh}
            strokeWidth={0.9}
            strokeOpacity={0.3}
          />
        </g>
      ))}

      <clipPath id="wt-trunk-clip">
        <path d={trunk.outline} />
      </clipPath>
    </g>
  )
}

export const WorldTreeTrunk = memo(Trunk)
