import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Layers, Link2, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { db, saveBlob } from '../db'
import type { GameMap, Location } from '../types'
import { useBlobUrl } from '../hooks/useBlobUrl'
import { MapCanvas } from '../components/MapCanvas'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { createEmptyTask, getMapAncestors, getMapDescendantIds, wouldCreateMapCycle } from '../utils'

const EMPTY_LIST: never[] = []

export function MapDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const map = useLiveQuery(() => (id ? db.maps.get(id) : undefined), [id])
  const allMaps = useLiveQuery(() => db.maps.toArray()) ?? EMPTY_LIST
  const locations = useLiveQuery(
    () => (id ? db.locations.where('mapId').equals(id).toArray() : []),
    [id],
  ) ?? EMPTY_LIST
  const allLocations = useLiveQuery(() => db.locations.toArray()) ?? EMPTY_LIST
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? EMPTY_LIST
  const departments = useLiveQuery(() => db.departments.toArray()) ?? EMPTY_LIST
  const imageUrl = useBlobUrl(map?.imageId ?? null)

  const childMaps = useMemo(
    () => allMaps.filter((m) => m.parentMapId === id),
    [allMaps, id],
  )
  const parentMap = useMemo(
    () => (map?.parentMapId ? allMaps.find((m) => m.id === map.parentMapId) : null),
    [map, allMaps],
  )
  const anchorLocation = useMemo(
    () =>
      map?.parentLocationId
        ? allLocations.find((l) => l.id === map.parentLocationId)
        : null,
    [map, allLocations],
  )
  const parentMapLocations = useMemo(
    () => (parentMap ? allLocations.filter((l) => l.mapId === parentMap.id) : []),
    [parentMap, allLocations],
  )
  const ancestors = useMemo(
    () => (map ? getMapAncestors(map.id, allMaps) : []),
    [map, allMaps],
  )

  const [editMode, setEditMode] = useState(false)
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null)
  const [showLocModal, setShowLocModal] = useState(false)
  const [showSubMapModal, setShowSubMapModal] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [showHierarchyModal, setShowHierarchyModal] = useState(false)
  const [locName, setLocName] = useState('')
  const [locDept, setLocDept] = useState('')
  const [locParentId, setLocParentId] = useState('')
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null)
  const [deptFilter, setDeptFilter] = useState('')
  const [subMapName, setSubMapName] = useState('')
  const [subMapFile, setSubMapFile] = useState<File | null>(null)
  const [attachChildMapId, setAttachChildMapId] = useState('')
  const [attachAnchorLocId, setAttachAnchorLocId] = useState('')
  const [editParentMapId, setEditParentMapId] = useState('')
  const [editParentLocationId, setEditParentLocationId] = useState('')

  const taskCountByLocation = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) {
      if (t.locationId && t.status !== 'completed' && t.status !== 'abandoned') {
        counts[t.locationId] = (counts[t.locationId] ?? 0) + 1
      }
    }
    return counts
  }, [tasks])

  const highlightIds = useMemo(() => {
    if (selectedLoc) return [selectedLoc.id]
    if (!deptFilter) return []
    return locations.filter((l) => l.departmentId === deptFilter).map((l) => l.id)
  }, [selectedLoc, deptFilter, locations])

  const attachableMaps = useMemo(() => {
    if (!map) return []
    const excluded = new Set([map.id, ...getMapDescendantIds(map.id, allMaps)])
    return allMaps.filter((m) => !excluded.has(m.id))
  }, [map, allMaps])

  const validParentOptions = useMemo(() => {
    if (!map) return []
    const excluded = new Set([map.id, ...getMapDescendantIds(map.id, allMaps)])
    return allMaps.filter((m) => !excluded.has(m.id))
  }, [map, allMaps])

  if (map === undefined) {
    return (
      <div className="p-6">
        <p className="text-text-muted">Loading map…</p>
      </div>
    )
  }

  if (!map) {
    return (
      <div className="p-6">
        <p className="text-text-muted">Map not found</p>
        <Link to="/maps" className="text-accent text-sm mt-2 inline-block">
          ← Back to Maps
        </Link>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="p-6">
        <p className="text-text-muted">Loading map image…</p>
        <Link to="/maps" className="text-accent text-sm mt-2 inline-block">
          ← Back to Maps
        </Link>
      </div>
    )
  }

  const locationTasks = (locId: string) => tasks.filter((t) => t.locationId === locId)

  const getChildMapsForLocation = (locId: string) =>
    childMaps.filter((m) => m.parentLocationId === locId)

  const getChildLocations = (locId: string) =>
    allLocations.filter((l) => l.parentLocationId === locId && l.mapId !== map.id)

  const resetLocForm = () => {
    setLocName('')
    setLocDept('')
    setLocParentId('')
    setPendingCoords(null)
    setSelectedLoc(null)
  }

  const handleAddLocation = (x: number, y: number) => {
    resetLocForm()
    setPendingCoords({ x, y })
    setShowLocModal(true)
  }

  const saveLocation = async () => {
    if (!locName.trim()) return

    if (selectedLoc && !pendingCoords) {
      await db.locations.put({
        ...selectedLoc,
        name: locName.trim(),
        departmentId: locDept || null,
        parentLocationId: locParentId || null,
      })
    } else if (pendingCoords) {
      const loc: Location = {
        id: crypto.randomUUID(),
        mapId: map.id,
        name: locName.trim(),
        x: pendingCoords.x,
        y: pendingCoords.y,
        departmentId: locDept || null,
        parentLocationId: locParentId || null,
      }
      await db.locations.add(loc)
    }

    setShowLocModal(false)
    resetLocForm()
  }

  const editLocation = (loc: Location) => {
    setSelectedLoc(loc)
    setLocName(loc.name)
    setLocDept(loc.departmentId ?? '')
    setLocParentId(loc.parentLocationId ?? '')
    setPendingCoords(null)
    setShowLocModal(true)
  }

  const deleteLocation = async (loc: Location) => {
    const linkedChildMaps = getChildMapsForLocation(loc.id)
    if (linkedChildMaps.length > 0) {
      alert(`Cannot delete: ${linkedChildMaps.length} sub-map(s) are anchored here.`)
      return
    }
    if (!confirm(`Delete location "${loc.name}"?`)) return
    await db.locations.delete(loc.id)
    for (const t of tasks.filter((t) => t.locationId === loc.id)) {
      await db.tasks.put({ ...t, locationId: null })
    }
    for (const l of allLocations.filter((l) => l.parentLocationId === loc.id)) {
      await db.locations.put({ ...l, parentLocationId: null })
    }
    setSelectedLoc(null)
  }

  const moveLocation = async (locId: string, x: number, y: number) => {
    const loc = locations.find((l) => l.id === locId)
    if (!loc) return
    await db.locations.put({ ...loc, x, y })
  }

  const createSubMap = async () => {
    if (!subMapName.trim() || !subMapFile || !selectedLoc) return
    const imageId = await saveBlob(subMapFile)
    const img = new Image()
    const url = URL.createObjectURL(subMapFile)
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.src = url
    })
    const subMap: GameMap = {
      id: crypto.randomUUID(),
      name: subMapName.trim(),
      imageId,
      width: img.naturalWidth,
      height: img.naturalHeight,
      parentMapId: map.id,
      parentLocationId: selectedLoc.id,
    }
    URL.revokeObjectURL(url)
    await db.maps.add(subMap)
    setShowSubMapModal(false)
    setSubMapName('')
    setSubMapFile(null)
    navigate(`/maps/${subMap.id}`)
  }

  const createQuestAtLocation = async (loc: Location) => {
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), -1)
    const task = createEmptyTask(maxOrder + 1)
    task.mapId = map.id
    task.locationId = loc.id
    if (loc.departmentId) task.departmentIds = [loc.departmentId]
    await db.tasks.add(task)
    navigate(`/quests/${task.id}`)
  }

  const attachExistingMap = async () => {
    if (!attachChildMapId) return
    if (wouldCreateMapCycle(attachChildMapId, map.id, allMaps)) {
      alert('Cannot attach: would create a circular hierarchy.')
      return
    }
    const child = allMaps.find((m) => m.id === attachChildMapId)
    if (!child) return
    await db.maps.put({
      ...child,
      parentMapId: map.id,
      parentLocationId: attachAnchorLocId || null,
    })
    setShowAttachModal(false)
    setAttachChildMapId('')
    setAttachAnchorLocId('')
  }

  const openHierarchyModal = () => {
    setEditParentMapId(map.parentMapId ?? '')
    setEditParentLocationId(map.parentLocationId ?? '')
    setShowHierarchyModal(true)
  }

  const saveHierarchy = async () => {
    const newParentId = editParentMapId || null
    if (wouldCreateMapCycle(map.id, newParentId, allMaps)) {
      alert('Invalid parent: would create a circular hierarchy.')
      return
    }
    await db.maps.put({
      ...map,
      parentMapId: newParentId,
      parentLocationId: newParentId ? editParentLocationId || null : null,
    })
    setShowHierarchyModal(false)
  }

  const editParentLocations = editParentMapId
    ? allLocations.filter((l) => l.mapId === editParentMapId)
    : []

  const sidebarLoc = selectedLoc

  return (
    <div className="flex h-full min-h-screen">
      <div className="flex-1 p-6">
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-3 flex-wrap">
          <Link to="/maps" className="hover:text-text">
            Maps
          </Link>
          {ancestors.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5">
              <ChevronRight size={12} />
              <Link to={`/maps/${a.id}`} className="hover:text-text">
                {a.name}
              </Link>
            </span>
          ))}
          <ChevronRight size={12} />
          <span className="text-text">{map.name}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={parentMap ? `/maps/${parentMap.id}` : '/maps'} className="text-text-muted hover:text-text">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{map.name}</h1>
              {anchorLocation && parentMap && (
                <p className="text-xs text-text-muted mt-0.5">
                  Anchored at{' '}
                  <Link
                    to={`/maps/${parentMap.id}`}
                    className="text-accent hover:underline"
                  >
                    {parentMap.name} → {anchorLocation.name}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value)
                setSelectedLoc(null)
              }}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
              className="w-44"
            />
            <Button variant="secondary" onClick={openHierarchyModal}>
              <Settings size={14} />
              Hierarchy
            </Button>
            <Button
              variant={editMode ? 'primary' : 'secondary'}
              onClick={() => setEditMode(!editMode)}
            >
              <Pencil size={14} />
              {editMode ? 'Done Editing' : 'Edit Locations'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {childMaps.map((cm) => (
            <Link
              key={cm.id}
              to={`/maps/${cm.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs hover:border-accent/40 transition-colors"
            >
              <Layers size={12} className="text-accent" />
              {cm.name}
              {cm.parentLocationId && (
                <span className="text-text-muted">
                  @ {allLocations.find((l) => l.id === cm.parentLocationId)?.name}
                </span>
              )}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAttachChildMapId('')
              setAttachAnchorLocId('')
              setShowAttachModal(true)
            }}
          >
            <Link2 size={14} />
            Attach Existing Map
          </Button>
        </div>

        {editMode && (
          <p className="text-sm text-text-muted mb-4">
            Click to add a location. On sub-maps, link each pin to a parent-map location
            (e.g. office → city).
          </p>
        )}

        <MapCanvas
          imageUrl={imageUrl}
          locations={locations}
          editMode={editMode}
          selectedLocationId={selectedLoc?.id}
          onLocationClick={(loc) => {
            setSelectedLoc(loc)
            setEditMode(false)
          }}
          onAddLocation={handleAddLocation}
          onMoveLocation={moveLocation}
          highlightIds={highlightIds}
          dimUnhighlighted={!!deptFilter && !selectedLoc}
          taskCountByLocation={taskCountByLocation}
          hasChildMap={(locId) => getChildMapsForLocation(locId).length > 0}
        />
      </div>

      {sidebarLoc && (
        <aside className="w-80 shrink-0 border-l border-border bg-surface-raised p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{sidebarLoc.name}</h2>
            <div className="flex gap-1">
              <button
                className="text-text-muted hover:text-info cursor-pointer"
                onClick={() => editLocation(sidebarLoc)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="text-text-muted hover:text-danger cursor-pointer"
                onClick={() => deleteLocation(sidebarLoc)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {sidebarLoc.departmentId && (
            <p className="text-sm text-text-muted mb-3">
              Dept: {departments.find((d) => d.id === sidebarLoc.departmentId)?.name}
            </p>
          )}

          {sidebarLoc.parentLocationId && (
            <p className="text-sm text-text-muted mb-3">
              Parent pin:{' '}
              <span className="text-accent">
                {allLocations.find((l) => l.id === sidebarLoc.parentLocationId)?.name ?? '—'}
              </span>
              {parentMap && (
                <Link
                  to={`/maps/${parentMap.id}`}
                  className="text-xs text-accent ml-1 hover:underline"
                >
                  on {parentMap.name}
                </Link>
              )}
            </p>
          )}

          <div className="space-y-2 mb-4">
            <Button className="w-full" onClick={() => createQuestAtLocation(sidebarLoc)}>
              <Plus size={16} />
              New Quest Here
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                setSubMapName(`${sidebarLoc.name} — Detail`)
                setShowSubMapModal(true)
              }}
            >
              <Layers size={16} />
              Create Sub-Map
            </Button>
          </div>

          {getChildMapsForLocation(sidebarLoc.id).length > 0 && (
            <section className="mb-4">
              <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-2">
                Sub-Maps (zoom in)
              </h3>
              <div className="space-y-1">
                {getChildMapsForLocation(sidebarLoc.id).map((cm) => (
                  <Link
                    key={cm.id}
                    to={`/maps/${cm.id}`}
                    className="flex items-center gap-2 rounded-sm border border-frame-dark px-3 py-2 text-sm hover:border-accent/40"
                  >
                    <Layers size={14} className="text-accent shrink-0" />
                    {cm.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {getChildLocations(sidebarLoc.id).length > 0 && (
            <section className="mb-4">
              <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-2">
                Linked child locations
              </h3>
              <div className="space-y-1">
                {getChildLocations(sidebarLoc.id).map((cl) => {
                  const childMap = allMaps.find((m) => m.id === cl.mapId)
                  return (
                    <div key={cl.id} className="text-sm px-3 py-1.5 rounded-lg bg-surface-overlay">
                      {cl.name}
                      {childMap && (
                        <Link
                          to={`/maps/${childMap.id}`}
                          className="text-xs text-accent ml-2 hover:underline"
                        >
                          on {childMap.name}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header mb-3">
            Quests at this location
          </h3>
          {locationTasks(sidebarLoc.id).length === 0 ? (
            <p className="text-sm text-text-muted">No quests here</p>
          ) : (
            <div className="space-y-2">
              {locationTasks(sidebarLoc.id).map((t) => (
                <Link
                  key={t.id}
                  to={`/quests/${t.id}`}
                  className="flex items-center justify-between rounded-sm border border-frame-dark px-3 py-2 text-sm hover:border-accent/40 transition-colors"
                >
                  <span className="truncate">{t.title}</span>
                  <StatusBadge status={t.status} />
                </Link>
              ))}
            </div>
          )}
        </aside>
      )}

      <Modal
        open={showLocModal}
        onClose={() => {
          setShowLocModal(false)
          resetLocForm()
        }}
        title={pendingCoords ? 'New Location' : 'Edit Location'}
      >
        <div className="space-y-4">
          <Input
            label="Location Name"
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
            placeholder={parentMap ? 'e.g. My Office' : 'e.g. Shanghai'}
            autoFocus
          />
          <Select
            label="Department (optional)"
            value={locDept}
            onChange={(e) => setLocDept(e.target.value)}
            options={[
              { value: '', label: '— None —' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          {parentMap && parentMapLocations.length > 0 && (
            <Select
              label="Parent location on larger map"
              value={locParentId}
              onChange={(e) => setLocParentId(e.target.value)}
              options={[
                { value: '', label: '— None —' },
                ...parentMapLocations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          )}
          {parentMap && (
            <p className="text-xs text-text-muted">
              Links this fine-grained pin to a coarse pin on{' '}
              <strong>{parentMap.name}</strong> (e.g. office belongs to a city).
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowLocModal(false); resetLocForm() }}>
              Cancel
            </Button>
            <Button onClick={saveLocation} disabled={!locName.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showSubMapModal}
        onClose={() => setShowSubMapModal(false)}
        title="Create Sub-Map"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Create a zoomed-in map anchored at <strong>{sidebarLoc?.name}</strong>.
          </p>
          <Input
            label="Sub-Map Name"
            value={subMapName}
            onChange={(e) => setSubMapName(e.target.value)}
            placeholder="e.g. Office Floor Plan"
          />
          <div>
            <label className="text-xs text-text-muted font-medium">Map Image</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-surface cursor-pointer"
              onChange={(e) => setSubMapFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowSubMapModal(false)}>
              Cancel
            </Button>
            <Button onClick={createSubMap} disabled={!subMapName.trim() || !subMapFile}>
              Create &amp; Open
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        title="Attach Existing Map"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Make an existing map a sub-map of <strong>{map.name}</strong>
          </p>
          <Select
            label="Existing map to attach"
            value={attachChildMapId}
            onChange={(e) => setAttachChildMapId(e.target.value)}
            options={[
              { value: '', label: '— Select a map —' },
              ...attachableMaps.map((m) => ({
                value: m.id,
                label: m.parentMapId
                  ? `${m.name} (currently sub-map)`
                  : `${m.name} (top-level)`,
              })),
            ]}
          />
          {locations.length > 0 && (
            <Select
              label="Anchor to location on this map (optional)"
              value={attachAnchorLocId}
              onChange={(e) => setAttachAnchorLocId(e.target.value)}
              options={[
                { value: '', label: '— Not anchored —' },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAttachModal(false)}>
              Cancel
            </Button>
            <Button onClick={attachExistingMap} disabled={!attachChildMapId}>
              Attach
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showHierarchyModal}
        onClose={() => setShowHierarchyModal(false)}
        title="Edit Map Hierarchy"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Change parent for <strong>{map.name}</strong>
          </p>
          <Select
            label="Parent Map"
            value={editParentMapId}
            onChange={(e) => {
              setEditParentMapId(e.target.value)
              setEditParentLocationId('')
            }}
            options={[
              { value: '', label: '— Top-level (no parent) —' },
              ...validParentOptions.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          {editParentMapId && (
            <Select
              label="Anchor to parent location (optional)"
              value={editParentLocationId}
              onChange={(e) => setEditParentLocationId(e.target.value)}
              options={[
                { value: '', label: '— Not anchored —' },
                ...editParentLocations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowHierarchyModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveHierarchy}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
