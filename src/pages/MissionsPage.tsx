import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { db } from '../db'
import type { Mission, MissionStatus } from '../types'
import { MISSION_STATUSES, MISSION_STATUS_LABELS, MISSION_STATUS_COLORS } from '../constants/missions'
import { MissionTree } from '../components/MissionTree'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { cn, formatDate, getMissionAncestors, getMissionDescendantIds } from '../utils'

function missionMatchesTask(
  taskMissionId: string | null,
  filterMissionId: string,
  missions: Mission[],
): boolean {
  if (!taskMissionId) return false
  if (taskMissionId === filterMissionId) return true
  return getMissionDescendantIds(filterMissionId, missions).has(taskMissionId)
}

export function MissionsPage() {
  const missions = useLiveQuery(() => db.missions.toArray()) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [vision, setVision] = useState('')
  const [status, setStatus] = useState<MissionStatus>('planned')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const linkedTasks = selectedMission
    ? tasks.filter((t) => missionMatchesTask(t.missionId, selectedMission.id, missions))
    : []

  const childMissions = selectedMission
    ? missions.filter((m) => m.parentId === selectedMission.id)
    : []

  const openCreate = (parentId: string | null = null) => {
    setEditingMission(null)
    setParentIdForNew(parentId)
    setName('')
    setDescription('')
    setVision('')
    setStatus('planned')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setShowModal(true)
  }

  const openEdit = (mission: Mission) => {
    setEditingMission(mission)
    setName(mission.name)
    setDescription(mission.description)
    setVision(mission.vision)
    setStatus(mission.status)
    setStartDate(mission.startDate ?? '')
    setEndDate(mission.endDate ?? '')
    setNotes(mission.notes)
    setShowModal(true)
  }

  const saveMission = async () => {
    if (!name.trim()) return
    if (editingMission) {
      await db.missions.put({
        ...editingMission,
        name: name.trim(),
        description,
        vision,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        notes,
      })
      setSelectedMission((prev) =>
        prev?.id === editingMission.id
          ? {
              ...editingMission,
              name: name.trim(),
              description,
              vision,
              status,
              startDate: startDate || null,
              endDate: endDate || null,
              notes,
            }
          : prev,
      )
    } else {
      const mission: Mission = {
        id: crypto.randomUUID(),
        name: name.trim(),
        parentId: parentIdForNew,
        description,
        vision,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        notes,
        sortOrder: missions.length,
      }
      await db.missions.add(mission)
      setSelectedMission(mission)
    }
    setShowModal(false)
  }

  const deleteMission = async (mission: Mission) => {
    if (!confirm(`Delete mission "${mission.name}"?`)) return
    const children = missions.filter((m) => m.parentId === mission.id)
    if (children.length > 0) {
      alert('Cannot delete: has sub-missions. Remove them first.')
      return
    }
    await db.missions.delete(mission.id)
    for (const t of tasks.filter((t) => t.missionId === mission.id)) {
      await db.tasks.put({ ...t, missionId: null, updatedAt: new Date().toISOString() })
    }
    if (selectedMission?.id === mission.id) setSelectedMission(null)
  }

  const updateSelectedField = async (patch: Partial<Mission>) => {
    if (!selectedMission) return
    const updated = { ...selectedMission, ...patch }
    await db.missions.put(updated)
    setSelectedMission(updated)
  }

  const ancestors = selectedMission ? getMissionAncestors(selectedMission.id, missions) : []

  return (
    <div className="flex h-full min-h-screen">
      <div className="w-72 shrink-0 border-r border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Missions</h2>
          <Button variant="ghost" size="sm" onClick={() => openCreate(null)}>
            <Plus size={14} />
          </Button>
        </div>
        <MissionTree
          selectedId={selectedMission?.id}
          onSelect={setSelectedMission}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={deleteMission}
        />
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {selectedMission ? (
          <div className="max-w-2xl">
            {ancestors.length > 0 && (
              <p className="text-xs text-text-muted mb-2">
                {ancestors.map((a) => a.name).join(' / ')} /{' '}
                <span className="text-text">{selectedMission.name}</span>
              </p>
            )}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-fancy text-2xl text-accent">{selectedMission.name}</h1>
                <p className="text-sm text-text-muted mt-1">
                  {linkedTasks.length} linked quest{linkedTasks.length !== 1 ? 's' : ''}
                  {childMissions.length > 0 &&
                    ` · ${childMissions.length} sub-mission${childMissions.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEdit(selectedMission)}>
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Select
                label="Status"
                value={selectedMission.status}
                onChange={(e) =>
                  updateSelectedField({ status: e.target.value as MissionStatus })
                }
                options={MISSION_STATUSES.map((s) => ({
                  value: s,
                  label: MISSION_STATUS_LABELS[s],
                }))}
              />
              <div />
              <Input
                label="Start date"
                type="date"
                value={selectedMission.startDate ?? ''}
                onChange={(e) =>
                  updateSelectedField({ startDate: e.target.value || null })
                }
              />
              <Input
                label="End date"
                type="date"
                value={selectedMission.endDate ?? ''}
                onChange={(e) => updateSelectedField({ endDate: e.target.value || null })}
              />
            </div>

            {selectedMission.vision && (
              <section className="mb-6">
                <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-2">
                  Vision
                </h3>
                <p className="text-text leading-relaxed whitespace-pre-wrap">
                  {selectedMission.vision}
                </p>
              </section>
            )}

            {selectedMission.description && (
              <section className="mb-6">
                <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-2">
                  Description
                </h3>
                <p className="text-text-muted leading-relaxed whitespace-pre-wrap">
                  {selectedMission.description}
                </p>
              </section>
            )}

            {selectedMission.notes && (
              <section className="mb-6">
                <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-2">
                  Notes
                </h3>
                <p className="text-text-muted leading-relaxed whitespace-pre-wrap">
                  {selectedMission.notes}
                </p>
              </section>
            )}

            {childMissions.length > 0 && (
              <section className="mb-6">
                <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-3">
                  Sub-missions
                </h3>
                <div className="space-y-2">
                  {childMissions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMission(m)}
                      className="w-full text-left rounded-sm border border-frame-dark px-4 py-3 hover:border-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{m.name}</span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white',
                            MISSION_STATUS_COLORS[m.status],
                          )}
                        >
                          {MISSION_STATUS_LABELS[m.status]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-3">
                Linked Quests
              </h3>
              {linkedTasks.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No quests linked yet. Assign this mission on a quest detail page.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedTasks.map((t) => (
                    <Link
                      key={t.id}
                      to={`/quests/${t.id}`}
                      className="flex items-center justify-between rounded-sm border border-frame-dark px-4 py-3 hover:border-accent/50 transition-colors"
                    >
                      <span>{t.title}</span>
                      <span className="text-xs text-text-muted">
                        {t.dueDate ? formatDate(t.dueDate) : 'No due date'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <EmptyState
            title="Select a mission"
            description="Missions represent major company visions and initiatives. Create one or pick from the tree."
            action={
              <Button onClick={() => openCreate(null)}>
                <Plus size={16} />
                New Mission
              </Button>
            }
          />
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingMission ? 'Edit Mission' : 'New Mission'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Expand to APAC"
            autoFocus
          />
          <Textarea
            label="Vision"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="The big-picture goal or north star..."
            rows={3}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Scope, context, success criteria..."
            rows={3}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MissionStatus)}
            options={MISSION_STATUSES.map((s) => ({
              value: s,
              label: MISSION_STATUS_LABELS[s],
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveMission}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
