import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ExternalLink, ImagePlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db, deleteBlob, saveBlob } from '../../db'
import type { GameMap } from '../../types'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import { MapTree } from '../MapTree'

function ArchiveMapPreview({ map, onOpen }: { map: GameMap; onOpen: () => void }) {
  const imageUrl = useBlobUrl(map.imageId)
  return (
    <button className="atlas-archive-preview" onClick={onOpen}>
      {imageUrl ? <img src={imageUrl} alt="" /> : <span className="atlas-archive-no-image">No image</span>}
      <span><strong>{map.name}</strong><small>Open legacy map <ExternalLink /></small></span>
    </button>
  )
}

export function AtlasArchiveDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const maps = useLiveQuery(() => db.maps.toArray()) ?? []
  const [uploadOpen, setUploadOpen] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const startUpload = (parentMapId: string | null = null) => {
    setName('')
    setFile(null)
    setParentId(parentMapId)
    setUploadOpen(true)
  }

  const createMap = async () => {
    if (!file || !name.trim()) return
    const imageId = await saveBlob(file)
    const url = URL.createObjectURL(file)
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not read this image.'))
      image.src = url
    })
    await db.maps.add({
      id: crypto.randomUUID(),
      name: name.trim(),
      imageId,
      width: image.naturalWidth,
      height: image.naturalHeight,
      parentMapId: parentId,
      parentLocationId: null,
    })
    URL.revokeObjectURL(url)
    setUploadOpen(false)
  }

  const deleteMap = async (map: GameMap) => {
    if (maps.some((item) => item.parentMapId === map.id)) {
      window.alert('This atlas has child maps. Re-parent or remove them first.')
      return
    }
    if (!window.confirm(`Delete map “${map.name}” and all of its locations?`)) return
    await db.transaction('rw', db.maps, db.locations, async () => {
      await db.locations.where('mapId').equals(map.id).delete()
      await db.maps.delete(map.id)
    })
    await deleteBlob(map.imageId)
  }

  return (
    <>
      <div className={`atlas-archive-scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`atlas-archive-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <header>
          <div><Archive /><span><small>Cartographer’s Cabinet</small><strong>Atlas Archive</strong></span></div>
          <button onClick={onClose} aria-label="Close atlas archive"><X /></button>
        </header>
        <p>Your uploaded maps and hierarchy remain here. The workflow world does not replace or delete them.</p>
        <button className="atlas-upload-button" onClick={() => startUpload()}><ImagePlus /> Upload Map</button>
        <div className="atlas-archive-tree">
          <MapTree
            onSelect={(map) => navigate(`/maps/${map.id}`)}
            onAddChild={(id) => startUpload(id)}
            onDelete={deleteMap}
          />
        </div>
        <div className="atlas-archive-grid">
          {maps.map((map) => (
            <ArchiveMapPreview key={map.id} map={map} onOpen={() => navigate(`/maps/${map.id}`)} />
          ))}
        </div>
      </aside>

      {uploadOpen && (
        <div className="world-modal-backdrop" role="presentation" onPointerDown={() => setUploadOpen(false)}>
          <section className="world-modal" role="dialog" aria-modal="true" onPointerDown={(event) => event.stopPropagation()}>
            <header><div><ImagePlus /><h2>{parentId ? 'Create Sub-map' : 'Upload Map'}</h2></div><button onClick={() => setUploadOpen(false)}><X /></button></header>
            <label>Map name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Eastern Kingdom" /></label>
            <label>Map artwork<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
            <footer><button onClick={() => setUploadOpen(false)}>Cancel</button><button className="primary" disabled={!file || !name.trim()} onClick={() => void createMap()}>Add to Archive</button></footer>
          </section>
        </div>
      )}
    </>
  )
}
