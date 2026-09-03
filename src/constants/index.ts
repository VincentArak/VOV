import type { Priority, TaskStatus } from '../types'

export const TASK_STATUSES: TaskStatus[] = [
  'available',
  'in_progress',
  'pending_review',
  'completed',
  'abandoned',
]

/**
 * Labels borrow the game's own vocabulary where it already fits the
 * concept — a task waiting on someone else's sign-off is exactly what
 * WoW calls "Ready to Turn In", and "Abandoned" is verbatim.
 */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  available: 'Available',
  in_progress: 'In Progress',
  pending_review: 'Ready to Turn In',
  completed: 'Completed',
  abandoned: 'Abandoned',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  available: 'bg-[#5f5748]',
  in_progress: 'bg-[#355f78]',
  pending_review: 'bg-[#9a571f]',
  completed: 'bg-[#52672f]',
  abandoned: 'bg-[#742d28]',
}

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

/**
 * Priority uses the game's quest-difficulty scale (Constants.lua
 * QuestDifficultyColors). The mapping is semantic, not decorative: grey
 * means "beneath your level, skip it", red means "this will kill you" —
 * which is the same judgement a priority field is asking the reader to
 * make.
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'text-qd-trivial',
  medium: 'text-qd-standard',
  high: 'text-qd-difficult',
  urgent: 'text-qd-impossible',
}

/** Hex equivalents for places that need a raw value (borders, glows). */
export const PRIORITY_HEX: Record<Priority, string> = {
  low: '#6f6759',
  medium: '#586d32',
  high: '#a87821',
  urgent: '#7e2b20',
}

export const NAV_ITEMS = [
  { path: '/quests', label: 'Quests', icon: 'Scroll' },
  { path: '/maps', label: 'Maps', icon: 'Map' },
  { path: '/departments', label: 'Departments', icon: 'Building2' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
] as const
