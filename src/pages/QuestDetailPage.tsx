import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Paperclip,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import { db, deleteBlob, saveBlob } from '../db'
import { useAppStore } from '../store'
import type { Task, TaskAttachment, TaskStatus } from '../types'
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
} from '../constants'
import { areDependenciesMet, formatDate, missionLabel, playSound } from '../utils'
import {
  addSubtaskToTree,
  countSubtasks,
  createEmptySubtask,
  removeSubtaskFromTree,
  updateSubtaskInTree,
} from '../utils/subtasks'
import { SubtaskTree } from '../components/SubtaskTree'
import { LinkedItemsSection } from '../components/LinkedItemsSection'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Textarea } from '../components/ui/Textarea'

export function QuestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings, toggleTrackTask, isTracked } = useAppStore()

  const task = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id])
  const allTasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const departments = useLiveQuery(() => db.departments.toArray()) ?? []
  const people = useLiveQuery(() => db.people.toArray()) ?? []
  const missions = useLiveQuery(() => db.missions.toArray()) ?? []
  const maps = useLiveQuery(() => db.maps.toArray()) ?? []
  const locations = useLiveQuery(() => db.locations.toArray()) ?? []

  const [tagInput, setTagInput] = useState('')

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-text-muted">Quest not found</p>
        <Link to="/quests" className="text-accent text-sm mt-2 inline-block">
          ← Back to Quest Log
        </Link>
      </div>
    )
  }

  const update = async (patch: Partial<Task>) => {
    const updated = { ...task, ...patch, updatedAt: new Date().toISOString() }
    if (patch.status === 'completed' && !task.completedAt) {
      updated.completedAt = new Date().toISOString()
      if (settings?.soundEnabled) playSound('complete')
    }
    if (patch.status === 'in_progress' && task.status === 'available') {
      if (settings?.soundEnabled) playSound('accept')
    }
    await db.tasks.put(updated)
  }

  const changeStatus = async (status: TaskStatus) => {
    if (status === 'in_progress' && !areDependenciesMet(task, allTasks)) {
      alert('Dependencies not met. Complete prerequisite quests first.')
      return
    }
    await update({ status })
  }

  const deleteTask = async () => {
    if (!confirm('Delete this quest permanently?')) return
    for (const att of task.attachments) {
      await deleteBlob(att.blobId)
    }
    await db.tasks.delete(task.id)
    navigate('/quests')
  }

  const addSubtask = async (parentId: string | null = null) => {
    const subtask = createEmptySubtask(countSubtasks(task.subtasks))
    await update({ subtasks: addSubtaskToTree(task.subtasks, parentId, subtask) })
  }

  const updateSubtask = async (
    subId: string,
    patch: Parameters<typeof updateSubtaskInTree>[2],
  ) => {
    await update({ subtasks: updateSubtaskInTree(task.subtasks, subId, patch) })
  }

  const removeSubtask = async (subId: string) => {
    await update({ subtasks: removeSubtaskFromTree(task.subtasks, subId) })
  }

  const addTag = async () => {
    const tag = tagInput.trim()
    if (!tag || task.tags.includes(tag)) return
    await update({ tags: [...task.tags, tag] })
    setTagInput('')
  }

  const removeTag = async (tag: string) => {
    await update({ tags: task.tags.filter((t) => t !== tag) })
  }

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobId = await saveBlob(file)
    const attachment: TaskAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      blobId,
      mimeType: file.type,
    }
    await update({ attachments: [...task.attachments, attachment] })
    e.target.value = ''
  }

  const removeAttachment = async (att: TaskAttachment) => {
    await deleteBlob(att.blobId)
    await update({
      attachments: task.attachments.filter((a) => a.id !== att.id),
    })
  }

  const downloadAttachment = async (att: TaskAttachment) => {
    const blob = await db.blobs.get(att.blobId)
    if (!blob) return
    const url = URL.createObjectURL(blob.data)
    const a = document.createElement('a')
    a.href = url
    a.download = att.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const mapLocations = locations.filter((l) => l.mapId === task.mapId)
  const deps = task.dependencyIds
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter(Boolean) as Task[]

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/quests" className="text-text-muted hover:text-text transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <input
            className="text-2xl font-bold bg-transparent border-none outline-none w-full text-text"
            value={task.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>
        <button
          onClick={() => toggleTrackTask(task.id)}
          className="text-text-muted hover:text-accent cursor-pointer"
        >
          <Star
            size={20}
            className={isTracked(task.id) ? 'fill-accent text-accent' : ''}
          />
        </button>
        <Button variant="danger" size="sm" onClick={deleteTask}>
          <Trash2 size={14} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusBadge status={task.status} />
        <div className="flex gap-1">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                task.status === s
                  ? 'bg-accent text-surface font-medium'
                  : 'bg-surface-overlay text-text-muted hover:text-text'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {task.status === 'completed' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-success text-sm font-medium"
        >
          ✓ Quest Complete!
          {task.completedAt && ` — ${formatDate(task.completedAt)}`}
        </motion.div>
      )}

      <div className="space-y-6">
        <Textarea
          label="Description"
          value={task.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={task.priority}
            onChange={(e) => update({ priority: e.target.value as Task['priority'] })}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          />
          <Input
            label="Due Date"
            type="date"
            value={task.dueDate?.split('T')[0] ?? ''}
            onChange={(e) =>
              update({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </div>

        {/* Subtasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Objectives
            </h3>
            <Button variant="ghost" size="sm" onClick={() => addSubtask(null)}>
              <Plus size={14} />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            <SubtaskTree
              subtasks={task.subtasks}
              onUpdate={updateSubtask}
              onRemove={removeSubtask}
              onAddChild={addSubtask}
            />
            {task.subtasks.length === 0 && (
              <p className="text-sm text-text-muted">No objectives yet</p>
            )}
          </div>
        </section>

        {/* People roles */}
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Quest Givers &amp; Party
          </h3>
          {(
            [
              ['publisherIds', 'Publishers'],
              ['executorIds', 'Executors'],
              ['reviewerIds', 'Reviewers'],
              ['assistantIds', 'Assistants'],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="mb-4 last:mb-0">
              <label className="text-xs text-text-muted font-medium">{label}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {people.map((p) => {
                  const selected = task[field].includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const ids = selected
                          ? task[field].filter((id) => id !== p.id)
                          : [...task[field], p.id]
                        update({ [field]: ids })
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors cursor-pointer ${
                        selected
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border text-text-muted hover:border-accent/50'
                      }`}
                    >
                      <Avatar blobId={p.avatarId} name={p.name} size="sm" />
                      {p.name}
                    </button>
                  )
                })}
                {people.length === 0 && (
                  <p className="text-sm text-text-muted">Add people in Departments first</p>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Mission */}
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Mission
          </h3>
          <Select
            value={task.missionId ?? ''}
            onChange={(e) => update({ missionId: e.target.value || null })}
            options={[
              { value: '', label: 'No mission' },
              ...missions.map((m) => ({ value: m.id, label: missionLabel(m, missions) })),
            ]}
          />
        </section>

        {/* Departments */}
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Departments
          </h3>
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => {
              const selected = task.departmentIds.includes(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    const ids = selected
                      ? task.departmentIds.filter((id) => id !== d.id)
                      : [...task.departmentIds, d.id]
                    update({ departmentIds: ids })
                  }}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors cursor-pointer ${
                    selected
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border text-text-muted hover:border-accent/50'
                  }`}
                >
                  {d.name}
                </button>
              )
            })}
          </div>
        </section>

        {/* Map & Location */}
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Location
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Map"
              value={task.mapId ?? ''}
              onChange={(e) =>
                update({ mapId: e.target.value || null, locationId: null })
              }
              options={[
                { value: '', label: '— None —' },
                ...maps.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
            <Select
              label="Location Node"
              value={task.locationId ?? ''}
              onChange={(e) => update({ locationId: e.target.value || null })}
              options={[
                { value: '', label: '— None —' },
                ...mapLocations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>
          {task.mapId && task.locationId && (
            <Link
              to={`/maps/${task.mapId}`}
              className="text-sm text-accent mt-2 inline-block hover:underline"
            >
              View on map →
            </Link>
          )}
        </section>

        {/* Dependencies */}
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Prerequisites
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {allTasks
              .filter((t) => t.id !== task.id)
              .map((t) => {
                const selected = task.dependencyIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      const ids = selected
                        ? task.dependencyIds.filter((id) => id !== t.id)
                        : [...task.dependencyIds, t.id]
                      update({ dependencyIds: ids })
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                      selected
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border text-text-muted hover:border-accent/50'
                    }`}
                  >
                    {t.title}
                    {t.status === 'completed' ? ' ✓' : ''}
                  </button>
                )
              })}
          </div>
          {deps.length > 0 && !areDependenciesMet(task, allTasks) && (
            <p className="text-xs text-warning">
              🔒 Waiting on: {deps.filter((d) => d.status !== 'completed').map((d) => d.title).join(', ')}
            </p>
          )}
        </section>

        {/* Tags */}
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs"
              >
                {tag}
                <button
                  className="text-text-muted hover:text-danger cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              className="flex-1"
            />
            <Button variant="secondary" onClick={addTag}>
              Add
            </Button>
          </div>
        </section>

        {/* Attachments */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Attachments
            </h3>
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleAttachment} />
              <span className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <Upload size={14} />
                Upload
              </span>
            </label>
          </div>
          {task.attachments.length === 0 ? (
            <p className="text-sm text-text-muted">No attachments</p>
          ) : (
            <div className="space-y-2">
              {task.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm"
                >
                  <Paperclip size={14} className="text-text-muted shrink-0" />
                  <span className="flex-1 truncate">{att.name}</span>
                  <button
                    className="text-text-muted hover:text-accent cursor-pointer"
                    onClick={() => downloadAttachment(att)}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="text-text-muted hover:text-danger cursor-pointer"
                    onClick={() => removeAttachment(att)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <LinkedItemsSection task={task} onUpdate={update} />
      </div>
    </div>
  )
}
