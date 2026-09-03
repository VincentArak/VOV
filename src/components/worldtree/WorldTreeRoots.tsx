import { memo } from 'react'
import type { RootShape } from '../../worldtree/core/layout'
import { PALETTE } from '../../worldtree/theme'

/**
 * Roots are anatomy, not data: they anchor the trunk and give the tree its
 * monumental base. Their number and spread scale with how large the tree is,
 * but they carry no invented Git semantics.
 */
function Roots({
  roots,
  groundY,
  width,
  cx,
  baseHalfWidth,
}: {
  roots: RootShape[]
  groundY: number
  width: number
  cx: number
  baseHalfWidth: number
}) {
  return (
    <g className="wt-roots">
      {/* The mound the tree stands on. Masked at its edges for the same reason
          the distant ranges are: it spans the full viewBox, and on parchment an
          unmasked span reads as the bottom edge of a card. */}
      <g mask="url(#wt-fade-y)">
      <g mask="url(#wt-fade-x)">
      <path
        d={`M${-40},${groundY + 130}
            C${cx * 0.5},${groundY + 34} ${cx - baseHalfWidth * 2.2},${groundY - 30} ${cx},${groundY - 38}
            C${cx + baseHalfWidth * 2.2},${groundY - 30} ${cx + (width - cx) * 0.5},${groundY + 34} ${width + 40},${groundY + 130}
            L${width + 40},${groundY + 300} L${-40},${groundY + 300} Z`}
        fill="#8c7040"
        opacity={0.26}
        filter="url(#wt-rough-soft)"
      />
      </g>
      </g>

      <g filter="url(#wt-rough)">
        {roots.map((root) => (
          <g key={root.id}>
            <path d={root.outline} fill="#2f2113" opacity={0.35} transform="translate(5 8)" />
            <path
              d={root.outline}
              fill="url(#wt-root)"
              stroke={PALETTE.ink}
              strokeWidth={1.5}
              strokeOpacity={0.62}
            />
            <path
              d={root.outline}
              fill="url(#wt-generated-bark)"
              opacity={0.62}
              className="wt-generated-bark-layer"
            />
            {root.bark.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={PALETTE.barkHigh}
                strokeWidth={1.1}
                strokeOpacity={0.32}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
      </g>

      {/* moss and stones settling around the flare */}
      {roots.map((root, i) => (
        <ellipse
          key={`moss-${root.id}`}
          cx={root.tip.x - (i % 2 === 0 ? 18 : -14)}
          cy={root.tip.y + 6}
          rx={26 + (i % 3) * 9}
          ry={7 + (i % 2) * 3}
          fill={PALETTE.leafDeep}
          opacity={0.2}
        />
      ))}
    </g>
  )
}

export const WorldTreeRoots = memo(Roots)
