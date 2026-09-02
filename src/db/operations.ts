import type {
  AppSettings,
  BlobAsset,
  Department,
  GameMap,
  Location,
  Mission,
  Person,
  PersonRelationship,
  RelationshipTypeDef,
  Task,
} from '../types'
import { db } from './database'
import { serializeAppData } from './exportFormat'
import { normalizeTask } from '../utils'
import { runWithoutBackup, scheduleBackup } from './backup'

export async function initSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app')
  if (existing) {
    const patch: Partial<AppSettings> = {}
    if (existing.lastDailyBackupDate === undefined) patch.lastDailyBackupDate = null
    if (existing.githubToken === undefined) patch.githubToken = null
    if (existing.githubRepo === undefined) patch.githubRepo = null
    if (existing.jiraSiteUrl === undefined) patch.jiraSiteUrl = null
    if (existing.jiraProjectKey === undefined) patch.jiraProjectKey = null
    if (Object.keys(patch).length > 0) {
      const updated = { ...existing, ...patch }
      await db.settings.put(updated)
      return updated
    }
    return existing
  }

  const defaults: AppSettings = {
    id: 'app',
    soundEnabled: true,
    trackedTaskIds: [],
    lastDailyBackupDate: null,
    githubToken: null,
    githubRepo: null,
    jiraSiteUrl: null,
    jiraProjectKey: null,
  }
  await db.settings.put(defaults)
  return defaults
}

export async function saveBlob(file: File): Promise<string> {
  const id = crypto.randomUUID()
  await db.blobs.put({
    id,
    data: file,
    mimeType: file.type,
    name: file.name,
  })
  return id
}

export async function getBlobUrl(blobId: string): Promise<string | null> {
  const asset = await db.blobs.get(blobId)
  if (!asset) return null
  return URL.createObjectURL(asset.data)
}

export async function deleteBlob(blobId: string): Promise<void> {
  await db.blobs.delete(blobId)
}

export async function exportAllData(): Promise<string> {
  const [departments, missions, people, relationships, relationshipTypes, blobs, maps, locations, tasks, settings] =
    await Promise.all([
      db.departments.toArray(),
      db.missions.toArray(),
      db.people.toArray(),
      db.relationships.toArray(),
      db.relationshipTypes.toArray(),
      db.blobs.toArray(),
      db.maps.toArray(),
      db.locations.toArray(),
      db.tasks.toArray(),
      db.settings.toArray(),
    ])

  // serializeAppData redacts githubToken for every JSON-text export path
  // (this download and the dev-server file backup) — see db/exportFormat.ts.
  return serializeAppData(
    {
      departments,
      missions,
      people,
      relationships,
      relationshipTypes,
      blobs,
      maps,
      locations,
      tasks,
      settings,
    },
    new Date().toISOString(),
  )
}

export async function importAllData(
  json: string,
  mode: 'replace' | 'merge',
): Promise<void> {
  const data = JSON.parse(json)

  await runWithoutBackup(async () => {
    if (mode === 'replace') {
      await db.transaction(
        'rw',
        [db.departments, db.missions, db.people, db.relationships, db.relationshipTypes, db.blobs, db.maps, db.locations, db.tasks, db.settings],
        async () => {
          await Promise.all([
            db.departments.clear(),
            db.missions.clear(),
            db.people.clear(),
            db.relationships.clear(),
            db.relationshipTypes.clear(),
            db.blobs.clear(),
            db.maps.clear(),
            db.locations.clear(),
            db.tasks.clear(),
            db.settings.clear(),
          ])
          await loadImportData(data)
        },
      )
    } else {
      await loadImportData(data)
    }
  })

  scheduleBackup()
}

async function loadImportData(data: {
  departments?: Department[]
  missions?: Mission[]
  people?: Person[]
  relationships?: PersonRelationship[]
  relationshipTypes?: RelationshipTypeDef[]
  blobs?: Array<BlobAsset & { data: string }>
  maps?: GameMap[]
  locations?: Location[]
  tasks?: Task[]
  settings?: AppSettings[]
}): Promise<void> {
  if (data.departments) await db.departments.bulkPut(data.departments)
  if (data.missions) await db.missions.bulkPut(data.missions)
  if (data.people) await db.people.bulkPut(data.people)
  if (data.relationships) await db.relationships.bulkPut(data.relationships)
  if (data.relationshipTypes) await db.relationshipTypes.bulkPut(data.relationshipTypes)
  if (data.maps) await db.maps.bulkPut(data.maps)
  if (data.locations) await db.locations.bulkPut(data.locations)
  if (data.tasks) {
    await db.tasks.bulkPut(data.tasks.map((t) => normalizeTask(t)))
  }
  if (data.settings) {
    const normalized = data.settings.map((s) => ({
      ...s,
      lastDailyBackupDate: s.lastDailyBackupDate ?? null,
      githubToken: s.githubToken ?? null,
      githubRepo: s.githubRepo ?? null,
      jiraSiteUrl: s.jiraSiteUrl ?? null,
      jiraProjectKey: s.jiraProjectKey ?? null,
    }))
    await db.settings.bulkPut(normalized)
  }
  if (data.blobs) {
    const restored = data.blobs.map((b) => ({
      id: b.id,
      name: b.name,
      mimeType: b.mimeType,
      data: base64ToBlob(b.data as unknown as string, b.mimeType),
    }))
    await db.blobs.bulkPut(restored)
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}
