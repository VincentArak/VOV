import type { Task, TaskStatus, WorldMapPosition } from '../types'

export const WORLD_WIDTH = 4000
export const WORLD_HEIGHT = 2500

export type Point = readonly [number, number]

export interface WorldContinent {
  id: string
  name: string
  subtitle: string
  lore: string
  status: TaskStatus
  crest: 'shield' | 'crown' | 'rune' | 'tree'
  tone: 'ochre' | 'moss' | 'frost' | 'verdant' | 'custom'
  bounds: { x: number; y: number; width: number; height: number }
  label: { x: number; y: number }
  polygon: Point[]
  custom?: boolean
}

export const DEFAULT_CONTINENTS: WorldContinent[] = [
  {
    id: 'todo',
    name: 'To Do',
    subtitle: 'The Uncharted Wilds',
    lore: 'New adventures await. Many quests yet to be discovered.',
    status: 'available',
    crest: 'shield',
    tone: 'ochre',
    bounds: { x: 190, y: 210, width: 1430, height: 1270 },
    label: { x: 920, y: 355 },
    polygon: [
      [300, 320], [720, 180], [1240, 235], [1510, 470], [1630, 850],
      [1490, 1260], [1160, 1450], [620, 1430], [270, 1160], [170, 730],
    ],
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    subtitle: 'The Great Marches',
    lore: 'Active quests being pursued by heroes.',
    status: 'in_progress',
    crest: 'crown',
    tone: 'moss',
    bounds: { x: 1540, y: 170, width: 1390, height: 1250 },
    label: { x: 2260, y: 345 },
    polygon: [
      [1710, 270], [2100, 150], [2580, 235], [2860, 510], [2940, 840],
      [2770, 1230], [2420, 1410], [1900, 1325], [1580, 1080], [1460, 690],
    ],
  },
  {
    id: 'in-review',
    name: 'In Review',
    subtitle: 'The Council Keep',
    lore: 'Quests under review by the council.',
    status: 'pending_review',
    crest: 'rune',
    tone: 'frost',
    bounds: { x: 2840, y: 190, width: 1040, height: 1320 },
    label: { x: 3380, y: 610 },
    polygon: [
      [3090, 250], [3560, 205], [3850, 455], [3940, 820], [3840, 1260],
      [3510, 1500], [3100, 1390], [2860, 1110], [2810, 620],
    ],
  },
  {
    id: 'done',
    name: 'Done',
    subtitle: 'The Verdant Expanse',
    lore: 'Quests completed. Legends are made.',
    status: 'completed',
    crest: 'tree',
    tone: 'verdant',
    bounds: { x: 610, y: 1390, width: 2860, height: 1010 },
    label: { x: 2140, y: 1660 },
    polygon: [
      [1080, 1490], [1510, 1370], [1960, 1450], [2410, 1370], [3030, 1460],
      [3450, 1740], [3500, 2070], [3180, 2330], [2470, 2440], [1640, 2410],
      [920, 2290], [600, 1990], [710, 1680],
    ],
  },
]

export const VORTEX = { x: 2040, y: 1320, radius: 205 }

const SAFE_SLOTS: Record<string, Point[]> = {
  todo: [[.38, .42], [.66, .52], [.27, .65], [.53, .72], [.76, .76], [.38, .86]],
  'in-progress': [[.31, .44], [.58, .52], [.76, .64], [.39, .72], [.61, .82], [.25, .85]],
  'in-review': [[.48, .42], [.65, .58], [.35, .68], [.58, .79], [.40, .87]],
  done: [[.25, .42], [.43, .48], [.63, .44], [.76, .57], [.34, .68], [.57, .72], [.72, .82]],
}

export function statusContinent(status: TaskStatus): string {
  if (status === 'in_progress') return 'in-progress'
  if (status === 'pending_review') return 'in-review'
  if (status === 'completed') return 'done'
  return 'todo'
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function continentAt(point: Point, continents: WorldContinent[]): WorldContinent | undefined {
  return continents.find((continent) => pointInPolygon(point, continent.polygon))
}

export function pathFromPolygon(polygon: Point[]): string {
  return polygon.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ') + ' Z'
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1])
  const progress = Math.min(1, Math.max(0, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dy
  ) / (dx * dx + dy * dy)))
  return Math.hypot(point[0] - (start[0] + progress * dx), point[1] - (start[1] + progress * dy))
}

function boundaryDistance(point: Point, polygon: Point[]): number {
  let distance = Number.POSITIVE_INFINITY
  for (let index = 0; index < polygon.length; index += 1) {
    distance = Math.min(distance, distanceToSegment(
      point,
      polygon[index],
      polygon[(index + 1) % polygon.length],
    ))
  }
  return distance
}

/** Keeps the full parchment card on land instead of accepting only its centre. */
export function safePointInContinent(
  continent: WorldContinent,
  point: Point,
  coastClearance = 150,
): Point {
  const centroid = continent.polygon.reduce(
    (total, current) => [total[0] + current[0], total[1] + current[1]] as [number, number],
    [0, 0] as [number, number],
  ).map((value) => value / continent.polygon.length) as [number, number]
  let candidate: Point = point
  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (pointInPolygon(candidate, continent.polygon)
      && boundaryDistance(candidate, continent.polygon) >= coastClearance) return candidate
    candidate = [
      candidate[0] * .78 + centroid[0] * .22,
      candidate[1] * .78 + centroid[1] * .22,
    ]
  }
  return centroid
}

export function toLocalPosition(
  continent: WorldContinent,
  point: Point,
): WorldMapPosition {
  const { x, y, width, height } = continent.bounds
  const safePoint = safePointInContinent(continent, point)
  return {
    continentId: continent.id,
    x: Math.min(.9, Math.max(.1, (safePoint[0] - x) / width)),
    y: Math.min(.9, Math.max(.1, (safePoint[1] - y) / height)),
  }
}

export function positionForTask(
  task: Task,
  continents: WorldContinent[],
  indexWithinContinent = 0,
): { x: number; y: number; continent: WorldContinent } | null {
  const saved = task.worldMapPosition
  if (saved?.continentId === 'backlog' && task.status === 'available') return null
  const savedContinent = continents.find((item) => item.id === saved?.continentId)
  const useSavedContinent = savedContinent?.status === task.status
  const desiredId = useSavedContinent ? savedContinent.id : statusContinent(task.status)
  const continent = continents.find((item) => item.id === desiredId)
    ?? continents.find((item) => item.id === statusContinent(task.status))
    ?? continents[0]
  if (!continent) return null

  const slots = SAFE_SLOTS[continent.id]
  let localX = useSavedContinent ? saved?.x : undefined
  let localY = useSavedContinent ? saved?.y : undefined
  if (localX == null || localY == null) {
    const customSlots = slots ?? [[.3, .48], [.58, .57], [.42, .73], [.7, .76]]
    const slot = customSlots[indexWithinContinent % customSlots.length]
    const cycle = Math.floor(indexWithinContinent / customSlots.length)
    const jitter = ((hashString(task.id) % 17) - 8) / 220
    localX = Math.min(.9, Math.max(.1, slot[0] + jitter + cycle * .035))
    localY = Math.min(.91, Math.max(.18, slot[1] - jitter + cycle * .045))
  }
  const safePoint = safePointInContinent(continent, [
    continent.bounds.x + localX * continent.bounds.width,
    continent.bounds.y + localY * continent.bounds.height,
  ])
  return {
    x: safePoint[0],
    y: safePoint[1],
    continent,
  }
}

export function createCustomContinent(
  index: number,
  values: { name: string; subtitle: string; status: TaskStatus },
): WorldContinent {
  const slots = [
    { x: 90, y: 1540, width: 830, height: 610 },
    { x: 3040, y: 1510, width: 850, height: 620 },
    { x: 100, y: 720, width: 760, height: 560 },
  ]
  const bounds = slots[index % slots.length]
  const { x, y, width, height } = bounds
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: values.name,
    subtitle: values.subtitle,
    lore: 'A realm shaped by your own campaign.',
    status: values.status,
    crest: 'rune',
    tone: 'custom',
    bounds,
    label: { x: x + width / 2, y: y + height * .18 },
    polygon: [
      [x + width * .12, y + height * .28], [x + width * .35, y + height * .08],
      [x + width * .69, y + height * .12], [x + width * .93, y + height * .38],
      [x + width * .87, y + height * .73], [x + width * .61, y + height * .94],
      [x + width * .24, y + height * .86], [x + width * .06, y + height * .57],
    ],
    custom: true,
  }
}
