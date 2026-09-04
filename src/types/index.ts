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
  /**
   * "owner/repo". A department in this project is a codebase, so binding one
   * to a real repository is what lets the branch/PR/issue panel know what to
   * fetch. Null means the department is an organisational grouping only.
   */
  githubRepo: string | null
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

/** Position on the pannable workflow atlas. x/y are normalized within the
 * owning continent, so cards remain anchored if a continent is resized. */
export interface WorldMapPosition {
  continentId: string
  x: number
  y: number
}

export type LinkedItemProvider = 'github' | 'jira'

export interface LinkedItem {
  id: string
  provider: LinkedItemProvider
  /** e.g. "owner/repo#123" for GitHub, "PROJ-123" for Jira */
  externalId: string
  title: string
  url: string
  /** GitHub: "open"/"closed" from the API. Jira: always null (no API access, see services/jira.ts). */
  status: string | null
  lastSyncedAt: string | null
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
  worldMapPosition: WorldMapPosition | null
  publisherIds: string[]
  executorIds: string[]
  assistantIds: string[]
  reviewerIds: string[]
  dependencyIds: string[]
  subtasks: Subtask[]
  attachments: TaskAttachment[]
  linkedItems: LinkedItem[]
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
  /** Stored in plaintext (no crypto lib in this app) — excluded from JSON export, see db/operations.ts */
  githubToken: string | null
  /** "owner/repo" */
  githubRepo: string | null
  jiraSiteUrl: string | null
  jiraProjectKey: string | null
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
