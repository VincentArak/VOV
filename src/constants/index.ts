import type { Priority, TaskStatus } from '../types'

export const TASK_STATUSES: TaskStatus[] = [
  'available',
  'in_progress',
  'pending_review',
  'completed',
  'abandoned',
]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  available: 'Available',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  abandoned: 'Abandoned',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  available: 'bg-slate-500',
  in_progress: 'bg-info',
  pending_review: 'bg-warning',
  completed: 'bg-success',
  abandoned: 'bg-danger',
}

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'text-slate-400',
  medium: 'text-info',
  high: 'text-warning',
  urgent: 'text-danger',
}

export const NAV_ITEMS = [
  { path: '/quests', label: 'Quests', icon: 'Scroll' },
  { path: '/maps', label: 'Maps', icon: 'Map' },
  { path: '/departments', label: 'Departments', icon: 'Building2' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
] as const
