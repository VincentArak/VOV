import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import type { PersonRelationship } from '../types'
import {
  formatRelationshipLabel,
  getTypeColor,
  getTypeDef,
} from '../constants/relationships'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'

export function PersonRelationships({
  personId,
  personName,
}: {
  personId: string
  personName: string
}) {
  const people = useLiveQuery(() => db.people.toArray()) ?? []
  const relationships = useLiveQuery(() => db.relationships.toArray()) ?? []
  const typeDefs =
    useLiveQuery(() => db.relationshipTypes.orderBy('sortOrder').toArray()) ?? []

  const [showAdd, setShowAdd] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [relType, setRelType] = useState('')
  const [notes, setNotes] = useState('')

  const outgoing = relationships.filter((r) => r.fromPersonId === personId)
  const incoming = relationships.filter((r) => r.toPersonId === personId)
  const others = people.filter((p) => p.id !== personId)

  const saveRelationship = async () => {
    if (!targetId || !relType) return

    const existing = outgoing.find((r) => r.toPersonId === targetId)
    if (existing) {
      await db.relationships.put({ ...existing, type: relType, notes })
    } else {
      const rel: PersonRelationship = {
        id: crypto.randomUUID(),
        fromPersonId: personId,
        toPersonId: targetId,
        type: relType,
        notes,
      }
      await db.relationships.add(rel)
    }
    setShowAdd(false)
    setTargetId('')
    setRelType('')
    setNotes('')
  }

  const removeRelationship = async (rel: PersonRelationship) => {
    if (!confirm('Remove this relationship?')) return
    await db.relationships.delete(rel.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Relationships
        </h3>
        <div className="flex gap-2">
          <Link to="/network" className="text-xs text-accent hover:underline">
            View network
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} />
            Add
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {typeDefs.map((type) => (
          <span
            key={type.id}
            className="inline-flex items-center gap-1 text-[10px] text-text-muted"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: type.color }}
            />
            {type.name}
          </span>
        ))}
        <Link to="/settings" className="text-[10px] text-accent hover:underline">
          + customize types
        </Link>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-border bg-surface-overlay p-4 mb-4 space-y-3">
          <Select
            label="Person"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            options={[
              { value: '', label: '— Select person —' },
              ...others.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Select
            label="Relationship (from you)"
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
            options={[
              { value: '', label: '— None (no relationship) —' },
              ...typeDefs.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          {relType && getTypeDef(typeDefs, relType) && (
            <p className="text-xs text-text-muted">
              {getTypeDef(typeDefs, relType)!.description}
            </p>
          )}
          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveRelationship} disabled={!targetId || !relType}>
              Save
            </Button>
          </div>
        </div>
      )}

      {outgoing.length === 0 && incoming.length === 0 ? (
        <p className="text-sm text-text-muted">No relationships yet</p>
      ) : (
        <div className="space-y-2">
          {outgoing.map((rel) => {
            const target = people.find((p) => p.id === rel.toPersonId)
            const typeDef = getTypeDef(typeDefs, rel.type)
            if (!target) return null
            return (
              <div
                key={rel.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: getTypeColor(typeDefs, rel.type),
                }}
              >
                <Avatar blobId={target.avatarId} name={target.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/people/${target.id}`}
                    className="text-sm font-medium hover:text-accent"
                  >
                    {typeDef
                      ? formatRelationshipLabel(typeDef, personName, target.name)
                      : `${personName} → ${target.name}`}
                  </Link>
                  {rel.notes && (
                    <p className="text-xs text-text-muted truncate">{rel.notes}</p>
                  )}
                </div>
                <button
                  className="text-text-muted hover:text-danger cursor-pointer shrink-0"
                  onClick={() => removeRelationship(rel)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
          {incoming.map((rel) => {
            const source = people.find((p) => p.id === rel.fromPersonId)
            const typeDef = getTypeDef(typeDefs, rel.type)
            if (!source) return null
            return (
              <div
                key={rel.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 opacity-80"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: getTypeColor(typeDefs, rel.type),
                }}
              >
                <Avatar blobId={source.avatarId} name={source.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/people/${source.id}`}
                    className="text-sm hover:text-accent"
                  >
                    {typeDef
                      ? formatRelationshipLabel(typeDef, source.name, personName)
                      : `${source.name} → ${personName}`}
                  </Link>
                  <p className="text-[10px] text-text-muted">incoming</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
