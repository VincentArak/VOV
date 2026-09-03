import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db, deleteBlob, saveBlob } from '../db'
import type { Department, Person } from '../types'
import { DepartmentTree } from '../components/DepartmentTree'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { RepoGitPanel } from '../components/RepoGitPanel'
import { CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Textarea } from '../components/ui/Textarea'

export function DepartmentsPage() {
  const departments = useLiveQuery(() => db.departments.toArray()) ?? []
  const people = useLiveQuery(() => db.people.toArray()) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []

  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null)

  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')
  const [deptRepo, setDeptRepo] = useState('')

  const [personForm, setPersonForm] = useState({
    name: '',
    role: '',
    title: '',
    contact: '',
    bio: '',
    notes: '',
    avatarFile: null as File | null,
  })

  const deptPeople = selectedDept
    ? people.filter((p) => p.departmentIds.includes(selectedDept.id))
    : []

  const deptTaskCount = selectedDept
    ? tasks.filter((t) => t.departmentIds.includes(selectedDept.id)).length
    : 0

  const openCreateDept = (parentId: string | null = null) => {
    setEditingDept(null)
    setParentIdForNew(parentId)
    setDeptName('')
    setDeptDesc('')
    setDeptRepo('')
    setShowDeptModal(true)
  }

  const openEditDept = (dept: Department) => {
    setEditingDept(dept)
    setDeptName(dept.name)
    setDeptDesc(dept.description)
    setDeptRepo(dept.githubRepo ?? '')
    setShowDeptModal(true)
  }

  const saveDept = async () => {
    if (!deptName.trim()) return
    if (editingDept) {
      await db.departments.put({
        ...editingDept,
        name: deptName.trim(),
        description: deptDesc,
        githubRepo: deptRepo.trim() || null,
      })
    } else {
      const dept: Department = {
        id: crypto.randomUUID(),
        name: deptName.trim(),
        parentId: parentIdForNew,
        description: deptDesc,
        sortOrder: departments.length,
        githubRepo: deptRepo.trim() || null,
      }
      await db.departments.add(dept)
      setSelectedDept(dept)
    }
    setShowDeptModal(false)
  }

  const deleteDept = async (dept: Department) => {
    if (!confirm(`Delete repository "${dept.name}"?`)) return
    const children = departments.filter((d) => d.parentId === dept.id)
    if (children.length > 0) {
      alert('Cannot delete: this has children. Remove them first.')
      return
    }
    await db.departments.delete(dept.id)
    for (const p of people.filter((p) => p.departmentIds.includes(dept.id))) {
      await db.people.put({
        ...p,
        departmentIds: p.departmentIds.filter((id) => id !== dept.id),
      })
    }
    if (selectedDept?.id === dept.id) setSelectedDept(null)
  }

  const openCreatePerson = () => {
    setEditingPerson(null)
    setPersonForm({
      name: '',
      role: '',
      title: '',
      contact: '',
      bio: '',
      notes: '',
      avatarFile: null,
    })
    setShowPersonModal(true)
  }

  const openEditPerson = (person: Person) => {
    setEditingPerson(person)
    setPersonForm({
      name: person.name,
      role: person.role,
      title: person.title,
      contact: person.contact,
      bio: person.bio,
      notes: person.notes,
      avatarFile: null,
    })
    setShowPersonModal(true)
  }

  const savePerson = async () => {
    if (!personForm.name.trim()) return

    let avatarId = editingPerson?.avatarId ?? null
    if (personForm.avatarFile) {
      if (editingPerson?.avatarId) await deleteBlob(editingPerson.avatarId)
      avatarId = await saveBlob(personForm.avatarFile)
    }

    const deptIds = editingPerson
      ? editingPerson.departmentIds
      : selectedDept
        ? [selectedDept.id]
        : []

    if (editingPerson) {
      await db.people.put({
        ...editingPerson,
        name: personForm.name.trim(),
        role: personForm.role,
        title: personForm.title,
        contact: personForm.contact,
        bio: personForm.bio,
        notes: personForm.notes,
        avatarId,
      })
    } else {
      const person: Person = {
        id: crypto.randomUUID(),
        name: personForm.name.trim(),
        role: personForm.role,
        title: personForm.title,
        contact: personForm.contact,
        bio: personForm.bio,
        notes: personForm.notes,
        avatarId,
        departmentIds: deptIds,
      }
      await db.people.add(person)
    }
    setShowPersonModal(false)
  }

  const deletePerson = async (person: Person) => {
    if (!confirm(`Delete ${person.name}?`)) return
    if (person.avatarId) await deleteBlob(person.avatarId)
    await db.people.delete(person.id)
  }

  const togglePersonDept = async (person: Person) => {
    if (!selectedDept) return
    const has = person.departmentIds.includes(selectedDept.id)
    const departmentIds = has
      ? person.departmentIds.filter((id) => id !== selectedDept.id)
      : [...person.departmentIds, selectedDept.id]
    await db.people.put({ ...person, departmentIds })
  }

  return (
    <div className="flex h-full min-h-screen">
      <div className="w-72 shrink-0 border-r border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-fancy text-sm uppercase tracking-[0.15em] text-accent">Repositories</h2>
          <Button variant="ghost" size="sm" onClick={() => openCreateDept(null)}>
            <Plus size={14} />
          </Button>
        </div>
        <DepartmentTree
          selectedId={selectedDept?.id}
          onSelect={setSelectedDept}
          onAdd={openCreateDept}
          onEdit={openEditDept}
          onDelete={deleteDept}
        />
      </div>

      <div className="flex-1 p-6">
        {!selectedDept ? (
          <EmptyState
            title="Select a repository"
            description="Pick one from the tree to see its branches, pull requests, issues and members"
            action={
              departments.length === 0 ? (
                <Button onClick={() => openCreateDept(null)}>
                  <Plus size={16} />
                  Create Repository
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-fancy text-2xl text-accent">{selectedDept.name}</h1>
                {selectedDept.description && (
                  <p className="text-sm text-text-muted mt-1">{selectedDept.description}</p>
                )}
                <p className="text-xs text-text-muted mt-1">
                  {deptPeople.length} member{deptPeople.length !== 1 ? 's' : ''} ·{' '}
                  {deptTaskCount} quest{deptTaskCount !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={openCreatePerson}>
                <Plus size={16} />
                Add Member
              </Button>
            </div>

            {selectedDept.githubRepo && (
              <section className="mb-6">
                <CardTitle>
                  <span className="inline-flex items-center gap-1.5">
                    Repository
                    <code className="font-body text-[11px] normal-case tracking-normal text-text-muted">
                      {selectedDept.githubRepo}
                    </code>
                  </span>
                </CardTitle>
                <RepoGitPanel repo={selectedDept.githubRepo} />
              </section>
            )}

            {deptPeople.length === 0 ? (
              <EmptyState
                title="No members yet"
                description="Add people to this repository"
                action={
                  <Button onClick={openCreatePerson}>
                    <Plus size={16} />
                    Add Member
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptPeople.map((person) => (
                  <div
                    key={person.id}
                    className="wow-frame p-4 hover:border-accent/40 transition-colors group"
                  >
                    <Link to={`/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar blobId={person.avatarId} name={person.name} size="lg" />
                      <div className="min-w-0">
                        <h3 className="font-medium truncate group-hover:text-accent transition-colors">
                          {person.name}
                        </h3>
                        <p className="text-xs text-text-muted truncate">
                          {person.title || person.role || '—'}
                        </p>
                      </div>
                    </Link>
                    <div className="flex justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditPerson(person)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deletePerson(person)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {people.filter((p) => !p.departmentIds.includes(selectedDept.id)).length > 0 && (
              <section className="mt-8">
                <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-3">
                  Add Existing Members
                </h3>
                <div className="flex flex-wrap gap-2">
                  {people
                    .filter((p) => !p.departmentIds.includes(selectedDept.id))
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => togglePersonDept(p)}
                        className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:border-accent/50 cursor-pointer"
                      >
                        <Avatar blobId={p.avatarId} name={p.name} size="sm" />
                        {p.name}
                      </button>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Modal
        open={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editingDept ? 'Edit Repository' : 'New Repository'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Description"
            value={deptDesc}
            onChange={(e) => setDeptDesc(e.target.value)}
          />
          <Input
            label="GitHub repository (optional)"
            placeholder="owner/repo"
            value={deptRepo}
            onChange={(e) => setDeptRepo(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowDeptModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveDept}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showPersonModal}
        onClose={() => setShowPersonModal(false)}
        title={editingPerson ? 'Edit Member' : 'New Member'}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={personForm.name}
            onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role"
              value={personForm.role}
              onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })}
            />
            <Input
              label="Title"
              value={personForm.title}
              onChange={(e) => setPersonForm({ ...personForm, title: e.target.value })}
            />
          </div>
          <Input
            label="Contact"
            value={personForm.contact}
            onChange={(e) => setPersonForm({ ...personForm, contact: e.target.value })}
          />
          <Textarea
            label="Bio"
            value={personForm.bio}
            onChange={(e) => setPersonForm({ ...personForm, bio: e.target.value })}
          />
          <Textarea
            label="Notes"
            value={personForm.notes}
            onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
          />
          <div>
            <label className="text-xs text-text-muted font-medium">Avatar</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-surface cursor-pointer"
              onChange={(e) =>
                setPersonForm({ ...personForm, avatarFile: e.target.files?.[0] ?? null })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowPersonModal(false)}>
              Cancel
            </Button>
            <Button onClick={savePerson} disabled={!personForm.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
