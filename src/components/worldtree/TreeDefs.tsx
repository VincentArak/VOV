import { PALETTE } from '../../worldtree/theme'

/**
 * All depth in this visualization comes from SVG: layered gradients, grain
 * filters, masks and stroke variation. No raster art is used anywhere.
 */
export function TreeDefs() {
  return (
    <defs>
      <linearGradient id="wt-bark" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={PALETTE.barkDark} />
        <stop offset="26%" stopColor={PALETTE.barkMid} />
        <stop offset="55%" stopColor={PALETTE.barkLight} />
        <stop offset="78%" stopColor={PALETTE.barkMid} />
        <stop offset="100%" stopColor="#3a2817" />
      </linearGradient>

      <linearGradient id="wt-bark-limb" x1="0" y1="0" x2="1" y2="0.4">
        <stop offset="0%" stopColor="#3f2c1a" />
        <stop offset="40%" stopColor={PALETTE.barkMid} />
        <stop offset="72%" stopColor={PALETTE.barkLight} />
        <stop offset="100%" stopColor="#432f1c" />
      </linearGradient>

      <linearGradient id="wt-bark-merged" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stopColor="#3f2d1a" />
        <stop offset="38%" stopColor="#66512f" />
        <stop offset="68%" stopColor="#7d6640" />
        <stop offset="100%" stopColor="#3c3323" />
      </linearGradient>

      <linearGradient id="wt-bark-severed" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stopColor="#4a3222" />
        <stop offset="55%" stopColor="#6a4630" />
        <stop offset="100%" stopColor="#3c2418" />
      </linearGradient>

      <linearGradient id="wt-root" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor={PALETTE.rootMid} />
        <stop offset="60%" stopColor={PALETTE.rootDark} />
        <stop offset="100%" stopColor="#332415" />
      </linearGradient>

      <radialGradient id="wt-leaf-0" cx="0.38" cy="0.3" r="0.82">
        <stop offset="0%" stopColor={PALETTE.leafLight} />
        <stop offset="55%" stopColor={PALETTE.leafMid} />
        <stop offset="100%" stopColor={PALETTE.leafDeep} />
      </radialGradient>
      <radialGradient id="wt-leaf-1" cx="0.42" cy="0.28" r="0.85">
        <stop offset="0%" stopColor={PALETTE.leafPale} />
        <stop offset="52%" stopColor={PALETTE.leafLight} />
        <stop offset="100%" stopColor={PALETTE.leafMid} />
      </radialGradient>
      <radialGradient id="wt-leaf-2" cx="0.34" cy="0.36" r="0.8">
        <stop offset="0%" stopColor={PALETTE.leafMid} />
        <stop offset="60%" stopColor={PALETTE.leafDeep} />
        <stop offset="100%" stopColor="#33421f" />
      </radialGradient>

      <radialGradient id="wt-hollow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor={PALETTE.arcaneGlow} stopOpacity="0.95" />
        <stop offset="45%" stopColor={PALETTE.arcane} stopOpacity="0.5" />
        <stop offset="100%" stopColor={PALETTE.arcane} stopOpacity="0" />
      </radialGradient>

      <radialGradient id="wt-ember" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#ffe6a8" />
        <stop offset="40%" stopColor={PALETTE.gold} />
        <stop offset="100%" stopColor={PALETTE.ember} stopOpacity="0" />
      </radialGradient>

      <linearGradient id="wt-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e6d7b0" />
        <stop offset="55%" stopColor="#e3d3ab" />
        <stop offset="100%" stopColor="#d6c295" />
      </linearGradient>

      {/* Hand-inked paper grain: fine turbulence displaces the flat fills just
          enough to kill the vector cleanliness. */}
      <filter id="wt-grain" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n" />
        <feColorMatrix in="n" type="saturate" values="0" result="ng" />
        <feComponentTransfer in="ng" result="nc">
          <feFuncA type="linear" slope="0.34" intercept="0" />
        </feComponentTransfer>
        <feComposite in="nc" in2="SourceGraphic" operator="in" result="grain" />
        <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
      </filter>

      <filter id="wt-rough" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="4" seed="19" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      <filter id="wt-rough-soft" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="3" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      <filter id="wt-leaf-rough" x="-16%" y="-16%" width="132%" height="132%">
        <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="11" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="9" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      <filter id="wt-drop" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="6" dy="10" stdDeviation="10" floodColor="#4a3a1e" floodOpacity="0.28" />
      </filter>

      <filter id="wt-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="wt-mist" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="14" />
      </filter>

      <pattern id="wt-parchment-fibre" width="240" height="240" patternUnits="userSpaceOnUse">
        <rect width="240" height="240" fill="none" />
        <g stroke="#a8875220" strokeWidth="0.6">
          <path d="M0,40 C60,32 120,50 240,38" fill="none" />
          <path d="M0,110 C70,120 140,98 240,116" fill="none" />
          <path d="M0,186 C80,176 150,196 240,182" fill="none" />
        </g>
      </pattern>
    </defs>
  )
}
