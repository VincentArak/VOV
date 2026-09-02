import type { RelationshipTypeDef } from '../types'

export const DEFAULT_RELATIONSHIP_TYPES: Omit<RelationshipTypeDef, 'id'>[] = [
  {
    name: 'Collaborator',
    color: '#3b82f6',
    description: 'Works together on tasks',
    isSystem: true,
    isSymmetric: true,
    sortOrder: 0,
  },
  {
    name: 'Reports To',
    color: '#22c55e',
    description: 'From person reports to target',
    isSystem: true,
    isSymmetric: false,
    sortOrder: 1,
  },
  {
    name: 'Mentor Of',
    color: '#a855f7',
    description: 'From person mentors target',
    isSystem: true,
    isSymmetric: false,
    sortOrder: 2,
  },
  {
    name: 'Assists',
    color: '#f59e0b',
    description: 'From person assists target',
    isSystem: true,
    isSymmetric: false,
    sortOrder: 3,
  },
  {
    name: 'Peer',
    color: '#94a3b8',
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
  return getTypeDef(types, typeId)?.color ?? '#64748b'
}

export function getTypeName(types: RelationshipTypeDef[], typeId: string): string {
  return getTypeDef(types, typeId)?.name ?? typeId
}
