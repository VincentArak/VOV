import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import type { RelationshipTypeDef } from '../types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'
import { Textarea } from './ui/Textarea'

export function RelationshipTypeManager() {
  const types =
    useLiveQuery(() => db.relationshipTypes.orderBy('sortOrder').toArray()) ?? []
  const relationships = useLiveQuery(() => db.relationships.toArray()) ?? []

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RelationshipTypeDef | null>(null)
  const [form, setForm] = useState({
    name: '',
    color: '#6366f1',
    description: '',
    isSymmetric: true,
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', color: '#6366f1', description: '', isSymmetric: true })
    setShowModal(true)
  }

  const openEdit = (type: RelationshipTypeDef) => {
    setEditing(type)
    setForm({
      name: type.name,
      color: type.color,
      description: type.description,
      isSymmetric: type.isSymmetric,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return

    if (editing) {
      await db.relationshipTypes.put({
        ...editing,
        name: form.name.trim(),
        color: form.color,
        description: form.description,
        isSymmetric: form.isSymmetric,
      })
    } else {
      const maxOrder = types.reduce((max, t) => Math.max(max, t.sortOrder), -1)
      const type: RelationshipTypeDef = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        color: form.color,
        description: form.description,
        isSystem: false,
        isSymmetric: form.isSymmetric,
        sortOrder: maxOrder + 1,
      }
      await db.relationshipTypes.add(type)
    }
    setShowModal(false)
  }

  const remove = async (type: RelationshipTypeDef) => {
    const inUse = relationships.some((r) => r.type === type.id)
    if (inUse) {
      alert(`Cannot delete "${type.name}": it is used by existing relationships.`)
      return
    }
    if (type.isSystem) {
      alert('Built-in types cannot be deleted. You can change their name and color instead.')
      return
    }
    if (!confirm(`Delete relationship type "${type.name}"?`)) return
    await db.relationshipTypes.delete(type.id)
  }

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Relationship Types</h2>
          <p className="text-sm text-text-muted mt-1">
            Customize labels and colors. Built-in types can be edited but not deleted.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} />
          New Type
        </Button>
      </div>

      <div className="space-y-2">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <span
              className="w-4 h-4 rounded-full shrink-0 border border-white/20"
              style={{ backgroundColor: type.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{type.name}</div>
              <div className="text-xs text-text-muted truncate">
                {type.description || 'No description'}
                {type.isSymmetric ? ' · bidirectional' : ' · directional'}
                {type.isSystem && ' · built-in'}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                className="p-1 text-text-muted hover:text-info cursor-pointer"
                onClick={() => openEdit(type)}
              >
                <Pencil size={14} />
              </button>
              {!type.isSystem && (
                <button
                  className="p-1 text-text-muted hover:text-danger cursor-pointer"
                  onClick={() => remove(type)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Relationship Type' : 'New Relationship Type'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Business Partner"
            autoFocus
          />
          <div>
            <label className="text-xs text-text-muted font-medium">Color</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
              />
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isSymmetric}
              onChange={(e) => setForm({ ...form, isSymmetric: e.target.checked })}
              className="rounded"
            />
            Bidirectional (no arrow in network graph)
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!form.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
