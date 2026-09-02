import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { db, deleteBlob, saveBlob } from '../db'
import type { GameMap, Location } from '../types'
import { useBlobUrl } from '../hooks/useBlobUrl'
import { MapTree } from '../components/MapTree'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { getMapDescendantIds, wouldCreateMapCycle } from '../utils'

function MapPreviewCard({
  map,
  onOpen,
  onEditHierarchy,
  onAttachExisting,
}: {
  map: GameMap
  onOpen: (map: GameMap) => void
  onEditHierarchy: (map: GameMap) => void
  onAttachExisting: (map: GameMap) => void
}) {
  const imageUrl = useBlobUrl(map.imageId)
  const locations = useLiveQuery(
    () => db.locations.where('mapId').equals(map.id).toArray(),
  ) ?? []
  const childMaps = useLiveQuery(
    () => db.maps.where('parentMapId').equals(map.id).toArray(),
  ) ?? []
  const parentMap = useLiveQuery(
    () => (map.parentMapId ? db.maps.get(map.parentMapId) : undefined),
    [map.parentMapId],
  )
  const anchorLoc = useLiveQuery(
    () => (map.parentLocationId ? db.locations.get(map.parentLocationId) : undefined),
    [map.parentLocationId],
  )

  return (
    <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
      <div className="aspect-video bg-surface-overlay">
        {imageUrl ? (
          <img src={imageUrl} alt={map.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{map.name}</h3>
        {parentMap ? (
          <p className="text-xs text-text-muted mt-1">
            Sub-map of{' '}
            <Link to={`/maps/${parentMap.id}`} className="text-accent hover:underline">
              {parentMap.name}
            </Link>
            {anchorLoc && ` · anchored at "${anchorLoc.name}"`}
          </p>
        ) : (
          <p className="text-xs text-text-muted mt-1">Top-level map</p>
        )}
        <p className="text-xs text-text-muted mt-2">
          {locations.length} location{locations.length !== 1 ? 's' : ''} ·{' '}
          {childMaps.length} sub-map{childMaps.length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-col gap-2 mt-3">
          <Button
            className="w-full"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation()
              onOpen(map)
            }}
          >
            Open Map
          </Button>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEditHierarchy(map)
              }}
            >
              <Settings size={14} />
              Hierarchy
            </Button>
            <Button
              className="flex-1"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAttachExisting(map)
              }}
            >
              <Link2 size={14} />
              Attach Map
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MapsPage() {
  const navigate = useNavigate()
  const maps = useLiveQuery(() => db.maps.toArray()) ?? []
  const allLocations = useLiveQuery(() => db.locations.toArray()) ?? []
  const [selectedMap, setSelectedMap] = useState<GameMap | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showHierarchy, setShowHierarchy] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [editingMap, setEditingMap] = useState<GameMap | null>(null)
  const [attachTargetMap, setAttachTargetMap] = useState<GameMap | null>(null)

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parentMapId, setParentMapId] = useState('')
  const [parentLocationId, setParentLocationId] = useState('')

  const [editParentMapId, setEditParentMapId] = useState('')
  const [editParentLocationId, setEditParentLocationId] = useState('')
  const [attachChildMapId, setAttachChildMapId] = useState('')
  const [attachAnchorLocId, setAttachAnchorLocId] = useState('')

  const parentMapLocations: Location[] = parentMapId
    ? allLocations.filter((l) => l.mapId === parentMapId)
    : []

  const editParentLocations = editParentMapId
    ? allLocations.filter((l) => l.mapId === editParentMapId)
    : []

  const attachTargetLocations = attachTargetMap
    ? allLocations.filter((l) => l.mapId === attachTargetMap.id)
    : []

  const getAttachableMaps = (parent: GameMap) => {
    const excluded = new Set([parent.id, ...getMapDescendantIds(parent.id, maps)])
    return maps.filter((m) => !excluded.has(m.id))
  }

  const getValidParentOptions = (map: GameMap) => {
    const excluded = new Set([map.id, ...getMapDescendantIds(map.id, maps)])
    return maps.filter((m) => !excluded.has(m.id))
  }

  const openCreate = (parentId: string | null = null, anchorLocId: string | null = null) => {
    setName('')
    setFile(null)
    setParentMapId(parentId ?? '')
    setParentLocationId(anchorLocId ?? '')
    setShowCreate(true)
  }

  const openEditHierarchy = (map: GameMap) => {
    setEditingMap(map)
    setEditParentMapId(map.parentMapId ?? '')
    setEditParentLocationId(map.parentLocationId ?? '')
    setShowHierarchy(true)
  }

  const openAttachExisting = (parent: GameMap) => {
    setAttachTargetMap(parent)
    setAttachChildMapId('')
    setAttachAnchorLocId('')
    setShowAttach(true)
  }

  const createMap = async () => {
    if (!name.trim() || !file) return
    const imageId = await saveBlob(file)
    const img = new Image()
    const url = URL.createObjectURL(file)
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.src = url
    })
    const map: GameMap = {
      id: crypto.randomUUID(),
      name: name.trim(),
      imageId,
      width: img.naturalWidth,
      height: img.naturalHeight,
      parentMapId: parentMapId || null,
      parentLocationId: parentLocationId || null,
    }
    URL.revokeObjectURL(url)
    await db.maps.add(map)
    setShowCreate(false)
    setSelectedMap(map)
  }

  const saveHierarchy = async () => {
    if (!editingMap) return
    const newParentId = editParentMapId || null
    if (wouldCreateMapCycle(editingMap.id, newParentId, maps)) {
      alert('Invalid parent: would create a circular hierarchy.')
      return
    }
    await db.maps.put({
      ...editingMap,
      parentMapId: newParentId,
      parentLocationId: newParentId ? editParentLocationId || null : null,
    })
    setShowHierarchy(false)
    setEditingMap(null)
    if (selectedMap?.id === editingMap.id) {
      const updated = await db.maps.get(editingMap.id)
      if (updated) setSelectedMap(updated)
    }
  }

  const attachExistingMap = async () => {
    if (!attachTargetMap || !attachChildMapId) return
    if (wouldCreateMapCycle(attachChildMapId, attachTargetMap.id, maps)) {
      alert('Cannot attach: would create a circular hierarchy.')
      return
    }
    const child = maps.find((m) => m.id === attachChildMapId)
    if (!child) return
    await db.maps.put({
      ...child,
      parentMapId: attachTargetMap.id,
      parentLocationId: attachAnchorLocId || null,
    })
    setShowAttach(false)
    setAttachTargetMap(null)
  }

  const deleteMap = async (map: GameMap) => {
    const children = maps.filter((m) => m.parentMapId === map.id)
    if (children.length > 0) {
      alert('Cannot delete: this map has sub-maps. Remove or re-parent them first.')
      return
    }
    if (!confirm(`Delete map "${map.name}" and all its locations?`)) return
    await db.locations.where('mapId').equals(map.id).delete()
    await deleteBlob(map.imageId)
    await db.maps.delete(map.id)
    if (selectedMap?.id === map.id) setSelectedMap(null)
  }

  const rootMaps = maps.filter((m) => !m.parentMapId)

  return (
    <div className="flex h-full min-h-screen">
      <div className="w-72 shrink-0 border-r border-border p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Map Hierarchy</h2>
          <Button variant="ghost" size="sm" onClick={() => openCreate(null)}>
            <Plus size={14} />
          </Button>
        </div>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Create a parent map, then use <strong>Attach Map</strong> to link an
          existing map as its sub-map.
        </p>
        <MapTree
          selectedId={selectedMap?.id}
          onSelect={setSelectedMap}
          onAddChild={(parentId) => openCreate(parentId)}
          onDelete={deleteMap}
        />
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">World Maps</h1>
            <p className="text-sm text-text-muted mt-1">
              {maps.length} map{maps.length !== 1 ? 's' : ''} · {rootMaps.length} top-level
            </p>
          </div>
          <Button onClick={() => openCreate(null)}>
            <Plus size={16} />
            New Top-Level Map
          </Button>
        </div>

        {maps.length === 0 ? (
          <EmptyState
            title="No maps yet"
            description="Upload a large-scale map (e.g. national) to get started"
            action={
              <Button onClick={() => openCreate(null)}>
                <Plus size={16} />
                New Map
              </Button>
            }
          />
        ) : selectedMap ? (
          <MapPreviewCard
            map={selectedMap}
            onOpen={(m) => navigate(`/maps/${m.id}`)}
            onEditHierarchy={openEditHierarchy}
            onAttachExisting={openAttachExisting}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rootMaps.map((map) => (
              <div key={map.id} onClick={() => setSelectedMap(map)} className="cursor-pointer">
                <MapPreviewCard
                  map={map}
                  onOpen={(m) => navigate(`/maps/${m.id}`)}
                  onEditHierarchy={(m) => {
                    setSelectedMap(m)
                    openEditHierarchy(m)
                  }}
                  onAttachExisting={(m) => {
                    setSelectedMap(m)
                    openAttachExisting(m)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={parentMapId ? 'Create Sub-Map' : 'Create Map'}
      >
        <div className="space-y-4">
          {parentMapId && (
            <p className="text-sm text-text-muted rounded-lg bg-surface-overlay px-3 py-2">
              Parent: <strong>{maps.find((m) => m.id === parentMapId)?.name}</strong>
            </p>
          )}
          <Input
            label="Map Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={parentMapId ? 'e.g. Shanghai Office Floor' : 'e.g. China — National'}
          />
          <div>
            <label className="text-xs text-text-muted font-medium">Map Image</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-surface cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {!parentMapId && (
            <Select
              label="Parent Map (optional)"
              value={parentMapId}
              onChange={(e) => {
                setParentMapId(e.target.value)
                setParentLocationId('')
              }}
              options={[
                { value: '', label: '— Top-level map —' },
                ...maps.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
          )}
          {parentMapId && (
            <Select
              label="Anchor to parent location (optional)"
              value={parentLocationId}
              onChange={(e) => setParentLocationId(e.target.value)}
              options={[
                { value: '', label: '— Not anchored —' },
                ...parentMapLocations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={createMap} disabled={!name.trim() || !file}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showHierarchy}
        onClose={() => setShowHierarchy(false)}
        title="Edit Map Hierarchy"
      >
        {editingMap && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Change parent for <strong>{editingMap.name}</strong>
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
                ...getValidParentOptions(editingMap).map((m) => ({
                  value: m.id,
                  label: m.name,
                })),
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
              <Button variant="ghost" onClick={() => setShowHierarchy(false)}>
                Cancel
              </Button>
              <Button onClick={saveHierarchy}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showAttach}
        onClose={() => setShowAttach(false)}
        title="Attach Existing Map"
      >
        {attachTargetMap && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Make an existing map a sub-map of{' '}
              <strong>{attachTargetMap.name}</strong>
            </p>
            <Select
              label="Existing map to attach"
              value={attachChildMapId}
              onChange={(e) => setAttachChildMapId(e.target.value)}
              options={[
                { value: '', label: '— Select a map —' },
                ...getAttachableMaps(attachTargetMap).map((m) => ({
                  value: m.id,
                  label: m.parentMapId
                    ? `${m.name} (currently sub-map)`
                    : `${m.name} (top-level)`,
                })),
              ]}
            />
            {attachTargetLocations.length > 0 && (
              <Select
                label="Anchor to location on parent map (optional)"
                value={attachAnchorLocId}
                onChange={(e) => setAttachAnchorLocId(e.target.value)}
                options={[
                  { value: '', label: '— Not anchored —' },
                  ...attachTargetLocations.map((l) => ({ value: l.id, label: l.name })),
                ]}
              />
            )}
            <p className="text-xs text-text-muted">
              Tip: create the large-scale parent map first, then attach your
              existing detail map as its child.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAttach(false)}>
                Cancel
              </Button>
              <Button onClick={attachExistingMap} disabled={!attachChildMapId}>
                Attach
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
