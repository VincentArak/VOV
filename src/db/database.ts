import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  BlobAsset,
  DataSnapshot,
  Department,
  GameMap,
  Location,
  Mission,
  Person,
  PersonRelationship,
  RelationshipTypeDef,
  Subtask,
  Task,
} from '../types'
import type { GitConfig, GitRepoRecord } from '../types/git'
import { DEFAULT_RELATIONSHIP_TYPES, SYSTEM_TYPE_IDS } from '../constants/relationships'

class VovDatabase extends Dexie {
  departments!: EntityTable<Department, 'id'>
  missions!: EntityTable<Mission, 'id'>
  people!: EntityTable<Person, 'id'>
  relationships!: EntityTable<PersonRelationship, 'id'>
  relationshipTypes!: EntityTable<RelationshipTypeDef, 'id'>
  blobs!: EntityTable<BlobAsset, 'id'>
  maps!: EntityTable<GameMap, 'id'>
  locations!: EntityTable<Location, 'id'>
  tasks!: EntityTable<Task, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  snapshots!: EntityTable<DataSnapshot, 'id'>
  gitRepos!: EntityTable<GitRepoRecord, 'id'>
  gitConfig!: EntityTable<GitConfig, 'id'>

  constructor() {
    super('vov-db')
    this.version(1).stores({
      departments: 'id, parentId, sortOrder',
      people: 'id',
      blobs: 'id',
      maps: 'id',
      locations: 'id, mapId',
      tasks: 'id, status, dueDate',
      settings: 'id',
    })
    this.version(2).stores({
      snapshots: 'id',
    })
    this.version(3)
      .stores({
        tasks: 'id, status, dueDate, sortOrder',
      })
      .upgrade(async (tx) => {
        const tasks = await tx.table('tasks').toArray()
        await Promise.all(
          tasks.map((task: Task, index: number) =>
            tx.table('tasks').update(task.id, {
              sortOrder: task.sortOrder ?? index,
            }),
          ),
        )
      })
    this.version(4)
      .stores({
        maps: 'id, parentMapId',
        locations: 'id, mapId, parentLocationId',
      })
      .upgrade(async (tx) => {
        const maps = await tx.table('maps').toArray()
        await Promise.all(
          maps.map((m: GameMap) =>
            tx.table('maps').update(m.id, {
              parentMapId: m.parentMapId ?? null,
              parentLocationId: m.parentLocationId ?? null,
            }),
          ),
        )
        const locations = await tx.table('locations').toArray()
        await Promise.all(
          locations.map((l: Location) =>
            tx.table('locations').update(l.id, {
              parentLocationId: l.parentLocationId ?? null,
            }),
          ),
        )
      })
    this.version(5).stores({
      relationships: 'id, fromPersonId, toPersonId, type',
    })
    this.version(6)
      .stores({
        relationshipTypes: 'id, sortOrder',
      })
      .upgrade(async (tx) => {
        const existing = await tx.table('relationshipTypes').count()
        if (existing === 0) {
          await tx.table('relationshipTypes').bulkAdd(
            DEFAULT_RELATIONSHIP_TYPES.map((t, i) => ({
              ...t,
              id: SYSTEM_TYPE_IDS[i],
            })),
          )
        }
      })
    this.version(7)
      .stores({
        missions: 'id, parentId, sortOrder, status',
        tasks: 'id, status, dueDate, sortOrder, missionId',
      })
      .upgrade(async (tx) => {
        const tasks = await tx.table('tasks').toArray()
        await Promise.all(
          tasks.map((task: Task) =>
            tx.table('tasks').update(task.id, {
              missionId: task.missionId ?? null,
            }),
          ),
        )
      })
    this.version(8)
      .stores({
        tasks: 'id, status, dueDate, sortOrder, missionId',
      })
      .upgrade(async (tx) => {
        const tasks = await tx.table('tasks').toArray()
        await Promise.all(
          tasks.map((task: Task & {
            publisherId?: string | null
            executorId?: string | null
            reviewerId?: string | null
          }) => {
            const {
              publisherId,
              executorId,
              reviewerId,
              ...rest
            } = task as Task & {
              publisherId?: string | null
              executorId?: string | null
              reviewerId?: string | null
            }
            return tx.table('tasks').put({
              ...rest,
              publisherIds:
                task.publisherIds ??
                (publisherId ? [publisherId] : []),
              executorIds:
                task.executorIds ??
                (executorId ? [executorId] : []),
              reviewerIds:
                task.reviewerIds ??
                (reviewerId ? [reviewerId] : []),
            })
          }),
        )
      })
    this.version(9)
      .stores({
        tasks: 'id, status, dueDate, sortOrder, missionId',
      })
      .upgrade(async (tx) => {
        const tasks = await tx.table('tasks').toArray()
        const normalizeSubs = (subs: Subtask[]): Subtask[] =>
          (subs ?? []).map((s) => ({
            ...s,
            children: normalizeSubs(s.children ?? []),
          }))
        await Promise.all(
          tasks.map((task: Task) =>
            tx.table('tasks').update(task.id, {
              subtasks: normalizeSubs(task.subtasks),
            }),
          ),
        )
      })
    this.version(10).upgrade(async (tx) => {
      const tasks = await tx.table('tasks').toArray()
      await Promise.all(
        tasks.map((task: Task) =>
          tx.table('tasks').update(task.id, {
            linkedItems: task.linkedItems ?? [],
          }),
        ),
      )
      const settings = await tx.table('settings').toArray()
      await Promise.all(
        settings.map((s: AppSettings) =>
          tx.table('settings').update(s.id, {
            githubToken: s.githubToken ?? null,
            githubRepo: s.githubRepo ?? null,
            jiraSiteUrl: s.jiraSiteUrl ?? null,
            jiraProjectKey: s.jiraProjectKey ?? null,
          }),
        ),
      )
    })
    this.version(11).upgrade(async (tx) => {
      const departments = await tx.table('departments').toArray()
      await Promise.all(
        departments.map((d: Department) =>
          tx.table('departments').update(d.id, { githubRepo: d.githubRepo ?? null }),
        ),
      )
    })
    // v12 — World Tree: cached Git topology for the /world-tree visualization.
    // Derived data only; deliberately excluded from snapshots and exports.
    this.version(12).stores({
      gitRepos: 'id, fetchedAt',
      gitConfig: 'id',
    })
  }
}

export const db = new VovDatabase()
