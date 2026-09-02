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
  PRIORITY_HEX,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
} from '../constants'
import { areDependenciesMet, cn, formatDate, isOverdue, missionLabel, playSound } from '../utils'
import {
  addSubtaskToTree,
  countSubtasks,
  createEmptySubtask,
  removeSubtaskFromTree,
  updateSubtaskInTree,
} from '../utils/subtasks'
import { SubtaskTree } from '../components/SubtaskTree'
import { LinkedItemsSection } from '../components/LinkedItemsSection'
import { QuestChain } from '../components/QuestChain'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'

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
    <div className="max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/quests"
          aria-label="Back to quest log"
          className="rounded p-1.5 text-text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <span className="font-fancy text-[11px] uppercase tracking-[0.2em] text-text-dim">
          Quest Log
        </span>
        <div className="wow-divider flex-1" />
        <button
          onClick={() => toggleTrackTask(task.id)}
          aria-label={isTracked(task.id) ? 'Untrack quest' : 'Track quest'}
          aria-pressed={isTracked(task.id)}
          className="cursor-pointer rounded p-2 text-text-dim transition-colors hover:text-accent"
        >
          <Star
            size={17}
            aria-hidden="true"
            className={isTracked(task.id) ? 'fill-accent text-accent' : ''}
          />
        </button>
        <Button variant="danger" size="sm" onClick={deleteTask} aria-label="Abandon quest">
          <Trash2 size={13} aria-hidden="true" />
          Abandon
        </Button>
      </div>

      {/* The quest sheet itself: dark ink on parchment, ornate title, the
          way the game presents quest text. Everything below the sheet is
          editor chrome and stays on the dark panel. */}
      <div className="wow-parchment mb-4 px-6 py-5">
        <input
          className="paper-title font-fancy w-full border-none bg-transparent text-2xl outline-none placeholder:text-paper-text/40"
          value={task.title}
          onChange={(e) => update({ title: e.target.value })}
          aria-label="Quest title"
          placeholder="Untitled quest"
        />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className="rounded-sm px-1.5 py-0.5 font-medium"
            style={{
              background: `${PRIORITY_HEX[task.priority]}22`,
              color: PRIORITY_HEX[task.priority] === '#ffd100' ? '#6b5200' : PRIORITY_HEX[task.priority],
              border: `1px solid ${PRIORITY_HEX[task.priority]}55`,
            }}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.dueDate && (
            <span className={isOverdue(task.dueDate, task.status) ? 'text-[#8b1a1a]' : 'text-quest-objective'}>
              {isOverdue(task.dueDate, task.status) ? 'Overdue ' : 'Due '}
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Editing happens on the sheet itself rather than in a separate
            field below it — otherwise the same text is on screen twice. */}
        <textarea
          value={task.description}
          onChange={(e) => update({ description: e.target.value })}
          aria-label="Quest description"
          placeholder="Describe the quest…"
          rows={Math.max(2, task.description.split('\n').length)}
          className="mt-3 w-full resize-y border-none bg-transparent text-[13px] leading-relaxed text-paper-text outline-none placeholder:text-paper-text/40 focus:bg-[rgba(64,38,5,0.06)]"
        />

        {task.subtasks.length > 0 && (
          <div className="mt-4">
            <div className="paper-title font-fancy mb-1.5 text-sm">Quest Objectives</div>
            <ul className="space-y-0.5 text-[12px]">
              {task.subtasks.map((s) => {
                const done = s.status === 'completed'
                return (
                  <li
                    key={s.id}
                    className={done ? 'text-[#333333]' : 'text-quest-objective'}
                  >
                    {s.title || 'Untitled objective'}
                    {/* The game marks a finished objective by dimming it and
                        appending the word, never by striking it through. */}
                    {done && ' (Complete)'}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        <div className="flex flex-wrap gap-1">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              aria-pressed={task.status === s}
              className={cn(
                'wow-hilight cursor-pointer rounded-sm border px-2 py-1 text-[11px] transition-colors',
                task.status === s
                  ? 'border-gold-mid bg-gradient-to-b from-gold to-gold-mid font-semibold text-frame-dark'
                  : 'border-frame-dark bg-surface-overlay text-text-muted hover:text-text',
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {task.status === 'completed' && (
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="mb-5 rounded-sm border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success shadow-[0_0_0_1px_rgba(26,255,26,0.15),0_0_20px_rgba(26,255,26,0.12)]"
        >
          <span className="font-fancy">Quest Complete!</span>
          {task.completedAt && (
            <span className="tabular ml-2 text-xs opacity-80">{formatDate(task.completedAt)}</span>
          )}
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Bindings lead the page. A quest here is usually the local face of
            a ticket that ships as a pull request, so where that work stands
            is the first thing worth seeing — it was previously the last
            section, below attachments. */}
        <LinkedItemsSection task={task} onUpdate={update} />

        <QuestChain task={task} allTasks={allTasks} />

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
            <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header">
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
          <h3 className="font-fancy mb-2 text-xs uppercase tracking-[0.15em] text-ot-header">
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
                  <p className="text-sm text-text-muted">Add people under Repositories first</p>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Mission */}
        <section>
          <h3 className="font-fancy mb-2 text-xs uppercase tracking-[0.15em] text-ot-header">
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
          <h3 className="font-fancy mb-2 text-xs uppercase tracking-[0.15em] text-ot-header">
            Repositories
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
          <h3 className="font-fancy mb-2 text-xs uppercase tracking-[0.15em] text-ot-header">
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
          <h3 className="font-fancy mb-2 text-xs uppercase tracking-[0.15em] text-ot-header">
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
          <h3 className="font-fancy mb-2 text-xs uppercase tracking-[0.15em] text-ot-header">
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
            <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header">
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

      </div>
    </div>
  )
}
