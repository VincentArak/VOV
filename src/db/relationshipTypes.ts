import { DEFAULT_RELATIONSHIP_TYPES, SYSTEM_TYPE_IDS } from '../constants/relationships'
import type { RelationshipTypeDef } from '../types'
import { db } from './database'

export async function initRelationshipTypes(): Promise<void> {
  const count = await db.relationshipTypes.count()
  if (count > 0) return

  const types: RelationshipTypeDef[] = DEFAULT_RELATIONSHIP_TYPES.map((t, i) => ({
    ...t,
    id: SYSTEM_TYPE_IDS[i],
  }))
  await db.relationshipTypes.bulkAdd(types)
}

export async function seedRelationshipTypesIfEmpty(): Promise<void> {
  await initRelationshipTypes()
}
