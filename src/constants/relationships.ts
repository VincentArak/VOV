import type { RelationshipTypeDef } from '../types'

/**
 * Relationship colours are drawn from the game's class palette
 * (RAID_CLASS_COLORS / ChrClasses.db2) rather than a generic ramp, so the
 * realm graph reads like a party frame: each bond type has a distinct,
 * saturated identity that stays legible against the dark map.
 */
export const DEFAULT_RELATIONSHIP_TYPES: Omit<RelationshipTypeDef, 'id'>[] = [
  {
    name: 'Collaborator',
    color: '#3fc7eb', // Mage cyan
    description: 'Works together on tasks',
    isSystem: true,
    isSymmetric: true,
    sortOrder: 0,
  },
  {
    name: 'Reports To',
    color: '#aad372', // Hunter green
    description: 'From person reports to target',
    isSystem: true,
    isSymmetric: false,
    sortOrder: 1,
  },
  {
    name: 'Mentor Of',
    color: '#a330c9', // Demon Hunter purple
    description: 'From person mentors target',
    isSystem: true,
    isSymmetric: false,
    sortOrder: 2,
  },
  {
    name: 'Assists',
    color: '#ff7c0a', // Druid orange
    description: 'From person assists target',
    isSystem: true,
    isSymmetric: false,
    sortOrder: 3,
  },
  {
    name: 'Peer',
    color: '#c69b6d', // Warrior tan
    description: 'Colleague / peer relationship',
    isSystem: true,
    isSymmetric: true,
    sortOrder: 4,
  },
]

export const SYSTEM_TYPE_IDS = [
  'collaborator',
  'reports_to',
  'mentor',
  'assists',
  'peer',
] as const

export function formatRelationshipLabel(
  typeDef: RelationshipTypeDef,
  fromName: string,
  toName: string,
): string {
  if (typeDef.isSymmetric) {
    return `${fromName} ↔ ${toName} (${typeDef.name})`
  }
  return `${fromName} → ${typeDef.name} → ${toName}`
}

export function getTypeDef(
  types: RelationshipTypeDef[],
  typeId: string,
): RelationshipTypeDef | undefined {
  return types.find((t) => t.id === typeId)
}

export function getTypeColor(types: RelationshipTypeDef[], typeId: string): string {
  return getTypeDef(types, typeId)?.color ?? '#a8a8a8'
}

export function getTypeName(types: RelationshipTypeDef[], typeId: string): string {
  return getTypeDef(types, typeId)?.name ?? typeId
}
