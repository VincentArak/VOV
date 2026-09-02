import type { Department, GameMap, Mission, Task, TaskStatus } from '../types'
import { normalizeSubtasks, subtaskProgressFromList } from './subtasks'

export function buildDepartmentTree(
  departments: Department[],
): (Department & { children: Department[] })[] {
  const map = new Map<string, Department & { children: Department[] }>()
  departments.forEach((d) => map.set(d.id, { ...d, children: [] }))

  const roots: (Department & { children: Department[] })[] = []
  map.forEach((dept) => {
    if (dept.parentId && map.has(dept.parentId)) {
      map.get(dept.parentId)!.children.push(dept)
    } else {
      roots.push(dept)
    }
  })

  const sort = (items: (Department & { children: Department[] })[]) => {
    items.sort((a, b) => a.sortOrder - b.sortOrder)
    items.forEach((item) => sort(item.children as (Department & { children: Department[] })[]))
  }
  sort(roots)
  return roots
}

export function areDependenciesMet(
  task: Task,
  allTasks: Task[],
): boolean {
  if (task.dependencyIds.length === 0) return true
  return task.dependencyIds.every((depId) => {
    const dep = allTasks.find((t) => t.id === depId)
    return dep?.status === 'completed'
  })
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed' || status === 'abandoned') return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export function isDueToday(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed' || status === 'abandoned') return false
  const due = new Date(dueDate)
  const today = new Date()
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  )
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return subtaskProgressFromList(normalizeSubtasks(task.subtasks))
}

export function createEmptyTask(sortOrder: number): Task {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: 'New Quest',
    description: '',
    status: 'available',
    priority: 'medium',
    dueDate: null,
    tags: [],
    departmentIds: [],
    missionId: null,
    locationId: null,
    mapId: null,
    publisherIds: [],
    executorIds: [],
    assistantIds: [],
    reviewerIds: [],
    dependencyIds: [],
    subtasks: [],
    attachments: [],
    linkedItems: [],
    sortOrder,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }
}

export function getMissionAncestors(missionId: string, missions: Mission[]): Mission[] {
  const ancestors: Mission[] = []
  let current = missions.find((m) => m.id === missionId)
  while (current?.parentId) {
    const parent = missions.find((m) => m.id === current!.parentId)
    if (!parent) break
    ancestors.unshift(parent)
    current = parent
  }
  return ancestors
}

export function getMissionDescendantIds(missionId: string, missions: Mission[]): Set<string> {
  const descendants = new Set<string>()
  const walk = (id: string) => {
    missions
      .filter((m) => m.parentId === id)
      .forEach((m) => {
        descendants.add(m.id)
        walk(m.id)
      })
  }
  walk(missionId)
  return descendants
}

export function missionLabel(mission: Mission, missions: Mission[]): string {
  const ancestors = getMissionAncestors(mission.id, missions)
  if (ancestors.length === 0) return mission.name
  return `${ancestors.map((a) => a.name).join(' / ')} / ${mission.name}`
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return startOfDay(next)
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

export function isTaskOpen(status: TaskStatus): boolean {
  return status !== 'completed' && status !== 'abandoned'
}

export function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = []
  let cursor = startOfDay(start)
  const last = startOfDay(end)
  while (cursor <= last) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

type LegacyTaskFields = {
  publisherId?: string | null
  executorId?: string | null
  reviewerId?: string | null
}

export function normalizeTask(task: Task & LegacyTaskFields): Task {
  const { publisherId, executorId, reviewerId, ...rest } = task
  return {
    ...rest,
    publisherIds: task.publisherIds ?? (publisherId ? [publisherId] : []),
    executorIds: task.executorIds ?? (executorId ? [executorId] : []),
    reviewerIds: task.reviewerIds ?? (reviewerId ? [reviewerId] : []),
    assistantIds: task.assistantIds ?? [],
    missionId: task.missionId ?? null,
    subtasks: normalizeSubtasks(task.subtasks ?? []),
    linkedItems: task.linkedItems ?? [],
  }
}

export function buildMapTree(
  maps: GameMap[],
): (GameMap & { children: GameMap[] })[] {
  const map = new Map<string, GameMap & { children: GameMap[] }>()
  maps.forEach((m) => map.set(m.id, { ...m, children: [] }))

  const roots: (GameMap & { children: GameMap[] })[] = []
  map.forEach((m) => {
    if (m.parentMapId && map.has(m.parentMapId)) {
      map.get(m.parentMapId)!.children.push(m)
    } else {
      roots.push(m)
    }
  })
  return roots
}

export function getMapAncestors(mapId: string, maps: GameMap[]): GameMap[] {
  const ancestors: GameMap[] = []
  let current = maps.find((m) => m.id === mapId)
  while (current?.parentMapId) {
    const parent = maps.find((m) => m.id === current!.parentMapId)
    if (!parent) break
    ancestors.unshift(parent)
    current = parent
  }
  return ancestors
}

export function getMapDescendantIds(mapId: string, maps: GameMap[]): Set<string> {
  const descendants = new Set<string>()
  const walk = (id: string) => {
    maps
      .filter((m) => m.parentMapId === id)
      .forEach((m) => {
        descendants.add(m.id)
        walk(m.id)
      })
  }
  walk(mapId)
  return descendants
}

export function wouldCreateMapCycle(
  mapId: string,
  newParentId: string | null,
  maps: GameMap[],
): boolean {
  if (!newParentId) return false
  if (newParentId === mapId) return true
  return getMapDescendantIds(mapId, maps).has(newParentId)
}

export function playSound(type: 'accept' | 'complete'): void {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  if (type === 'accept') {
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1)
  } else {
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
  }

  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.4)
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
