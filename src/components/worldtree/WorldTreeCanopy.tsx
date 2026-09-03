import { memo } from 'react'
import type { FoliageCluster } from '../../worldtree/core/layout'

/**
 * Foliage is never one smooth green cloud: every cluster is a stack of
 * irregular blobs at different tones, split across a back layer (behind the
 * branches, building the silhouette) and a sparse translucent front layer
 * (so limbs read *through* the canopy instead of being buried by it).
 */
function CanopyLayer({
  clusters,
  layer,
  dimmedLimbs,
}: {
  clusters: FoliageCluster[]
  layer: 'back' | 'front'
  dimmedLimbs: Set<string> | null
}) {
  const visible = clusters.filter((c) => c.layer === layer)
  if (visible.length === 0) return null

  return (
    <g
      className="wt-canopy"
      filter="url(#wt-leaf-rough)"
      opacity={layer === 'front' ? 0.48 : 1}
    >
      {visible.map((cluster) => {
        const faded = dimmedLimbs?.has(cluster.limbId)
        return (
          <g
            key={cluster.id}
            opacity={(cluster.dim ? 0.5 : 1) * (faded ? 0.28 : 1)}
            style={{ transition: 'opacity 220ms ease' }}
          >
            {cluster.lobes.map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  fill={`url(#wt-leaf-${((cluster.tone + i) % 3) as 0 | 1 | 2})`}
                  stroke="#283416"
                  strokeWidth={i === 0 ? 1.5 : 0.8}
                  strokeOpacity={i === 0 ? 0.52 : 0.28}
                />
                <path
                  d={d}
                  fill="url(#wt-generated-foliage)"
                  opacity={layer === 'front' ? 0.54 : 0.7}
                  className="wt-generated-foliage-layer"
                />
              </g>
            ))}
            {/* a couple of lit leaf flecks to keep the mass from going flat */}
            <path
              d={cluster.lobes[1] ?? cluster.lobes[0]}
              fill="#b9c77c"
              opacity={0.18}
              transform={`translate(${-cluster.r * 0.12} ${-cluster.r * 0.16}) scale(0.72)`}
              style={{ transformOrigin: `${cluster.x}px ${cluster.y}px` }}
            />
          </g>
        )
      })}
    </g>
  )
}

export const WorldTreeCanopy = memo(CanopyLayer)
