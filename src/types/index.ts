export type TaskStatus =
  | 'available'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'abandoned'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Department {
  id: string
  name: string
  parentId: string | null
  description: string
  sortOrder: number
}

export type MissionStatus = 'planned' | 'active' | 'completed' | 'archived'

export interface Mission {
  id: string
  name: string
  parentId: string | null
  description: string
  vision: string
  status: MissionStatus
  startDate: string | null
  endDate: string | null
  notes: string
  sortOrder: number
}

export interface Person {
  id: string
  name: string
  role: string
  avatarId: string | null
  title: string
  contact: string
  bio: string
  notes: string
  departmentIds: string[]
}

export interface RelationshipTypeDef {
  id: string
  name: string
  color: string
  description: string
  isSystem: boolean
  isSymmetric: boolean
  sortOrder: number
}

export interface PersonRelationship {
  id: string
  fromPersonId: string
  toPersonId: string
  type: string
  notes: string
}

export interface BlobAsset {
  id: string
  data: Blob
  mimeType: string
  name: string
}

export interface GameMap {
  id: string
  name: string
  imageId: string
  width: number
  height: number
  parentMapId: string | null
  parentLocationId: string | null
}

export interface Location {
  id: string
  mapId: string
  name: string
  x: number
  y: number
  departmentId: string | null
  parentLocationId: string | null
}

export interface Subtask {
  id: string
  title: string
  status: TaskStatus
  sortOrder: number
  children: Subtask[]
}

export interface TaskAttachment {
  id: string
  name: string
  blobId: string
  mimeType: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  tags: string[]
  departmentIds: string[]
  missionId: string | null
  locationId: string | null
  mapId: string | null
  publisherIds: string[]
  executorIds: string[]
  assistantIds: string[]
  reviewerIds: string[]
  dependencyIds: string[]
  subtasks: Subtask[]
  attachments: TaskAttachment[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface AppSettings {
  id: string
  soundEnabled: boolean
  trackedTaskIds: string[]
  lastDailyBackupDate: string | null
}

export type SnapshotId = 'on_save' | 'daily_primary' | 'daily_save'

export interface DataSnapshot {
  id: SnapshotId
  savedAt: string
  departments: Department[]
  missions: Mission[]
  people: Person[]
  relationships: PersonRelationship[]
  relationshipTypes: RelationshipTypeDef[]
  blobs: BlobAsset[]
  maps: GameMap[]
  locations: Location[]
  tasks: Task[]
  settings: AppSettings[]
}
