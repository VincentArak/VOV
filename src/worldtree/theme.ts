/** Parchment / ancient-atlas palette. Scoped to the World Tree page. */

export const PALETTE = {
  parchment: '#e9dcbb',
  parchmentMid: '#ddcda4',
  parchmentDeep: '#c9b485',

  ink: '#3b2a17',
  inkSoft: '#5a442a',

  barkDark: '#4a3520',
  barkMid: '#6d5030',
  barkLight: '#8d6b41',
  barkHigh: '#b28f5d',
  barkPale: '#cbab77',

  rootDark: '#43301d',
  rootMid: '#5f4527',

  leafDeep: '#42542a',
  leafMid: '#65783a',
  leafLight: '#8d9f54',
  leafPale: '#aab86e',

  ochre: '#9f7433',
  gold: '#b47b27',
  bronze: '#765127',
  ember: '#a74618',

  arcane: '#4d8178',
  arcaneGlow: '#77b3a8',

  danger: '#7c3023',
} as const

export const STATUS_COLOR: Record<string, string> = {
  trunk: PALETTE.barkMid,
  growing: PALETTE.leafMid,
  merged: PALETTE.arcane,
  severed: PALETTE.danger,
}

export const STATUS_LABEL: Record<string, string> = {
  trunk: 'World Trunk',
  growing: 'Still growing',
  merged: 'Returned to the trunk',
  severed: 'Severed limb',
}
