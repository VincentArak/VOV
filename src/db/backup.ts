import type { AppSettings, DataSnapshot, SnapshotId } from '../types'
import { db } from './database'
import { syncLocalFileBackup } from './localFileBackup'
import { normalizeTask } from '../utils'

let suppressBackup = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let backupInFlight = false
let pendingBackup = false

type SaveStatusListener = (status: {
  state: 'idle' | 'saving' | 'saved'
  lastSavedAt: string | null
}) => void

const listeners = new Set<SaveStatusListener>()

export function onSaveStatusChange(listener: SaveStatusListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyStatus(state: 'idle' | 'saving' | 'saved', lastSavedAt: string | null = null) {
  listeners.forEach((l) => l({ state, lastSavedAt }))
}

export function runWithoutBackup<T>(fn: () => Promise<T>): Promise<T> {
  suppressBackup = true
  return fn().finally(() => {
    suppressBackup = false
  })
}

export function scheduleBackup(): void {
  if (suppressBackup) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void executeBackupCycle()
  }, 500)
}

export async function executeBackupCycle(): Promise<void> {
  if (backupInFlight) {
    pendingBackup = true
    return
  }

  backupInFlight = true
  notifyStatus('saving')

  try {
    const live = await collectLiveData()
    await writeSnapshot('on_save', live)
    await runDailyBackupsIfNeeded(live)
    await syncLocalFileBackup(live)
    const now = new Date().toISOString()
    notifyStatus('saved', now)
  } catch (err) {
    console.error('Backup failed:', err)
    notifyStatus('idle')
  } finally {
    backupInFlight = false
    if (pendingBackup) {
      pendingBackup = false
      void executeBackupCycle()
    }
  }
}

export async function collectLiveData(): Promise<Omit<DataSnapshot, 'id' | 'savedAt'>> {
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

  const copiedBlobs = await Promise.all(
    blobs.map(async (b) => ({
      ...b,
      data: new Blob([await b.data.arrayBuffer()], { type: b.mimeType }),
    })),
  )

  return {
    departments,
    missions,
    people,
    relationships,
    relationshipTypes,
    blobs: copiedBlobs,
    maps,
    locations,
    tasks,
    settings,
  }
}

async function writeSnapshot(
  id: SnapshotId,
  data: Omit<DataSnapshot, 'id' | 'savedAt'>,
): Promise<void> {
  const snapshot: DataSnapshot = {
    id,
    savedAt: new Date().toISOString(),
    ...data,
  }
  await db.snapshots.put(snapshot)
}

function localDateKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function runDailyBackupsIfNeeded(
  live: Omit<DataSnapshot, 'id' | 'savedAt'>,
): Promise<void> {
  const settings = await db.settings.get('app')
  const today = localDateKey()
  if (settings?.lastDailyBackupDate === today) return

  await writeSnapshot('daily_primary', live)

  const onSave = await db.snapshots.get('on_save')
  if (onSave) {
    await writeSnapshot('daily_save', {
      departments: onSave.departments,
      missions: onSave.missions ?? [],
      people: onSave.people,
      relationships: onSave.relationships ?? [],
      relationshipTypes: onSave.relationshipTypes ?? [],
      blobs: onSave.blobs,
      maps: onSave.maps,
      locations: onSave.locations,
      tasks: onSave.tasks,
      settings: onSave.settings,
    })
  }

  const updated: AppSettings = {
    ...(settings ?? { id: 'app', soundEnabled: true, trackedTaskIds: [] }),
    lastDailyBackupDate: today,
  }
  await runWithoutBackup(() => db.settings.put(updated))
}

export async function getSnapshotInfo(): Promise<
  Array<{ id: SnapshotId | 'primary'; label: string; savedAt: string | null }>
> {
  const [onSave, dailyPrimary, dailySave] = await Promise.all([
    db.snapshots.get('on_save'),
    db.snapshots.get('daily_primary'),
    db.snapshots.get('daily_save'),
  ])

  const tasks = await db.tasks.toArray()
  const latestTask = tasks.reduce<string | null>((latest, t) => {
    if (!latest || t.updatedAt > latest) return t.updatedAt
    return latest
  }, null)

  return [
    { id: 'primary', label: 'Primary (Live)', savedAt: latestTask },
    { id: 'on_save', label: 'On-Save Backup', savedAt: onSave?.savedAt ?? null },
    {
      id: 'daily_primary',
      label: 'Daily Primary Backup',
      savedAt: dailyPrimary?.savedAt ?? null,
    },
    { id: 'daily_save', label: 'Daily Save Backup', savedAt: dailySave?.savedAt ?? null },
  ]
}

export async function restoreFromSnapshot(id: SnapshotId): Promise<void> {
  const snapshot = await db.snapshots.get(id)
  if (!snapshot) throw new Error('Snapshot not found')

  await runWithoutBackup(async () => {
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

        await db.departments.bulkPut(snapshot.departments)
        await db.missions.bulkPut(snapshot.missions ?? [])
        await db.people.bulkPut(snapshot.people)
        await db.relationships.bulkPut(snapshot.relationships ?? [])
        await db.relationshipTypes.bulkPut(snapshot.relationshipTypes ?? [])
        await db.blobs.bulkPut(snapshot.blobs)
        await db.maps.bulkPut(snapshot.maps)
        await db.locations.bulkPut(snapshot.locations)
        await db.tasks.bulkPut(snapshot.tasks.map((t) => normalizeTask(t)))
        await db.settings.bulkPut(snapshot.settings)
      },
    )
  })

  scheduleBackup()
}

export function installBackupHooks(): void {
  const tables = [
    db.departments,
    db.missions,
    db.people,
    db.relationships,
    db.relationshipTypes,
    db.blobs,
    db.maps,
    db.locations,
    db.tasks,
    db.settings,
  ]

  for (const table of tables) {
    table.hook('creating', () => scheduleBackup())
    table.hook('updating', () => scheduleBackup())
    table.hook('deleting', () => scheduleBackup())
  }
}

export async function initBackupSystem(): Promise<void> {
  installBackupHooks()
  const onSave = await db.snapshots.get('on_save')
  if (!onSave) {
    await executeBackupCycle()
  } else {
    await runDailyBackupsIfNeeded(await collectLiveData())
  }
}
