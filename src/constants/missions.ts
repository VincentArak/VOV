import type { MissionStatus } from '../types'

export const MISSION_STATUSES: MissionStatus[] = [
  'planned',
  'active',
  'completed',
  'archived',
]

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  planned: 'bg-slate-500',
  active: 'bg-info',
  completed: 'bg-success',
  archived: 'bg-surface-overlay text-text-muted',
}
