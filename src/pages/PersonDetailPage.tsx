import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Pencil, Save, Trash2 } from 'lucide-react'
import { db, deleteBlob, saveBlob } from '../db'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PersonRelationships } from '../components/PersonRelationships'
import { Textarea } from '../components/ui/Textarea'

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const person = useLiveQuery(() => (id ? db.people.get(id) : undefined), [id])
  const departments = useLiveQuery(() => db.departments.toArray()) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    role: '',
    title: '',
    contact: '',
    bio: '',
    notes: '',
    avatarFile: null as File | null,
  })

  if (!person) {
    return (
      <div className="p-6">
        <p className="text-text-muted">Person not found</p>
        <Link to="/departments" className="text-accent text-sm mt-2 inline-block">
          ← Back to Departments
        </Link>
      </div>
    )
  }

  const startEdit = () => {
    setForm({
      name: person.name,
      role: person.role,
      title: person.title,
      contact: person.contact,
      bio: person.bio,
      notes: person.notes,
      avatarFile: null,
    })
    setEditing(true)
  }

  const save = async () => {
    let avatarId = person.avatarId
    if (form.avatarFile) {
      if (person.avatarId) await deleteBlob(person.avatarId)
      avatarId = await saveBlob(form.avatarFile)
    }

    await db.people.put({
      ...person,
      name: form.name.trim(),
      role: form.role,
      title: form.title,
      contact: form.contact,
      bio: form.bio,
      notes: form.notes,
      avatarId,
    })
    setEditing(false)
  }

  const deletePerson = async () => {
    if (!confirm(`Delete ${person.name}?`)) return
    if (person.avatarId) await deleteBlob(person.avatarId)
    const rels = await db.relationships.toArray()
    await Promise.all(
      rels
        .filter((r) => r.fromPersonId === person.id || r.toPersonId === person.id)
        .map((r) => db.relationships.delete(r.id)),
    )
    await db.people.delete(person.id)
    navigate('/departments')
  }

  const toggleDept = async (deptId: string) => {
    const has = person.departmentIds.includes(deptId)
    await db.people.put({
      ...person,
      departmentIds: has
        ? person.departmentIds.filter((id) => id !== deptId)
        : [...person.departmentIds, deptId],
    })
  }

  const relatedTasks = tasks.filter(
    (t) =>
      t.publisherIds.includes(person.id) ||
      t.executorIds.includes(person.id) ||
      t.reviewerIds.includes(person.id) ||
      t.assistantIds.includes(person.id),
  )

  const roleInTask = (taskId: string): string[] => {
    const t = tasks.find((t) => t.id === taskId)!
    const roles: string[] = []
    if (t.publisherIds.includes(person.id)) roles.push('Publisher')
    if (t.executorIds.includes(person.id)) roles.push('Executor')
    if (t.reviewerIds.includes(person.id)) roles.push('Reviewer')
    if (t.assistantIds.includes(person.id)) roles.push('Assistant')
    return roles
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/departments"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-text text-sm"
        >
          <ArrowLeft size={16} />
          Back to Departments
        </Link>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save}>
                <Save size={14} />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={startEdit}>
                <Pencil size={14} />
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={deletePerson}>
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised overflow-hidden">
        <div className="bg-gradient-to-br from-accent/10 to-surface-overlay px-8 py-10 flex flex-col items-center text-center">
          <Avatar blobId={person.avatarId} name={person.name} size="xl" />
          {editing ? (
            <div className="w-full max-w-sm mt-4 space-y-3">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <Input
                  label="Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-text-muted font-medium">Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-surface cursor-pointer"
                  onChange={(e) =>
                    setForm({ ...form, avatarFile: e.target.files?.[0] ?? null })
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mt-4">{person.name}</h1>
              {person.title && (
                <p className="text-accent text-sm font-medium mt-1">{person.title}</p>
              )}
              {person.role && (
                <p className="text-text-muted text-sm mt-0.5">{person.role}</p>
              )}
            </>
          )}
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            <>
              <Input
                label="Contact"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
              <Textarea
                label="Bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </>
          ) : (
            <>
              {person.contact && (
                <div>
                  <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-1">
                    Contact
                  </h3>
                  <p className="text-sm">{person.contact}</p>
                </div>
              )}
              {person.bio && (
                <div>
                  <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-1">
                    Bio
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">{person.bio}</p>
                </div>
              )}
              {person.notes && (
                <div>
                  <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-1">
                    Notes
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                    {person.notes}
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-2">
              Departments
            </h3>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const selected = person.departmentIds.includes(dept.id)
                return (
                  <button
                    key={dept.id}
                    onClick={() => editing && toggleDept(dept.id)}
                    disabled={!editing}
                    className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                      selected
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border text-text-muted'
                    } ${editing ? 'cursor-pointer hover:border-accent/50' : 'cursor-default'}`}
                  >
                    {dept.name}
                  </button>
                )
              })}
            </div>
            {editing && (
              <p className="text-xs text-text-muted mt-2">Click departments to toggle membership</p>
            )}
          </div>

          <PersonRelationships personId={person.id} personName={person.name} />

          <div>
            <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-3">
              Related Quests ({relatedTasks.length})
            </h3>
            {relatedTasks.length === 0 ? (
              <p className="text-sm text-text-muted">No quests assigned</p>
            ) : (
              <div className="space-y-2">
                {relatedTasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/quests/${t.id}`}
                    className="flex items-center justify-between rounded-sm border border-frame-dark px-3 py-2 text-sm hover:border-accent/40 transition-colors"
                  >
                    <div>
                      <span className="font-medium">{t.title}</span>
                      <span className="text-xs text-text-muted ml-2">
                        {roleInTask(t.id).join(', ')}
                      </span>
                    </div>
                    <StatusBadge status={t.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
