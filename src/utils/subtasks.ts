import type { Subtask } from '../types'

type LegacySubtask = Subtask & { children?: Subtask[] }

export function normalizeSubtask(sub: LegacySubtask): Subtask {
  return {
    ...sub,
    children: (sub.children ?? []).map(normalizeSubtask),
  }
}

export function normalizeSubtasks(subtasks: LegacySubtask[]): Subtask[] {
  return subtasks.map(normalizeSubtask)
}

export function createEmptySubtask(sortOrder: number): Subtask {
  return {
    id: crypto.randomUUID(),
    title: 'New objective',
    status: 'available',
    sortOrder,
    children: [],
  }
}

export function flattenSubtasks(subtasks: Subtask[]): Subtask[] {
  const result: Subtask[] = []
  const walk = (items: Subtask[]) => {
    for (const item of items) {
      result.push(item)
      walk(item.children)
    }
  }
  walk(subtasks)
  return result
}

export function subtaskProgressFromList(subtasks: Subtask[]): { done: number; total: number } {
  const all = flattenSubtasks(subtasks)
  return {
    done: all.filter((s) => s.status === 'completed').length,
    total: all.length,
  }
}

export function updateSubtaskInTree(
  subtasks: Subtask[],
  id: string,
  patch: Partial<Pick<Subtask, 'title' | 'status' | 'sortOrder'>>,
): Subtask[] {
  return subtasks.map((sub) => {
    if (sub.id === id) {
      return { ...sub, ...patch }
    }
    return {
      ...sub,
      children: updateSubtaskInTree(sub.children, id, patch),
    }
  })
}

export function removeSubtaskFromTree(subtasks: Subtask[], id: string): Subtask[] {
  return subtasks
    .filter((sub) => sub.id !== id)
    .map((sub) => ({
      ...sub,
      children: removeSubtaskFromTree(sub.children, id),
    }))
}

export function addSubtaskToTree(
  subtasks: Subtask[],
  parentId: string | null,
  subtask: Subtask,
): Subtask[] {
  if (!parentId) return [...subtasks, subtask]
  return subtasks.map((sub) => {
    if (sub.id === parentId) {
      return { ...sub, children: [...sub.children, subtask] }
    }
    return {
      ...sub,
      children: addSubtaskToTree(sub.children, parentId, subtask),
    }
  })
}

export function countSubtasks(subtasks: Subtask[]): number {
  return flattenSubtasks(subtasks).length
}
