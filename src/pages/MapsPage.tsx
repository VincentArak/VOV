import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Compass,
  Filter,
  MapPlus,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react'
import { db } from '../db'
import type { Priority, Task, TaskStatus, WorldMapPosition } from '../types'
import { createEmptyTask } from '../utils'
import { AtlasArchiveDrawer } from '../components/worldmap/AtlasArchiveDrawer'
import { WorkflowWorldMap } from '../components/worldmap/WorkflowWorldMap'
import { createCustomContinent, type WorldContinent } from '../worldmap/model'
import '../worldmap/worldmap.css'

const CUSTOM_CONTINENTS_KEY = 'vov:world-map-continents:v1'
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const EMPTY_TASKS: Task[] = []

function loadCustomContinents(): WorldContinent[] {
  try {
    const value = window.localStorage.getItem(CUSTOM_CONTINENTS_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as WorldContinent[]
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.custom && item.id && item.name && Array.isArray(item.polygon))
      : []
  } catch {
    return []
  }
}

export function MapsPage() {
  const navigate = useNavigate()
  const tasks = useLiveQuery(() => db.tasks.orderBy('sortOrder').toArray()) ?? EMPTY_TASKS
  const [customContinents, setCustomContinents] = useState<WorldContinent[]>(loadCustomContinents)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [continentModalOpen, setContinentModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [priorities, setPriorities] = useState<Set<Priority>>(new Set())
  const [continentName, setContinentName] = useState('')
  const [continentSubtitle, setContinentSubtitle] = useState('The Unnamed Reach')
  const [continentStatus, setContinentStatus] = useState<TaskStatus>('available')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_CONTINENTS_KEY, JSON.stringify(customContinents))
  }, [customContinents])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const statusCounts = useMemo(() => ({
    active: tasks.filter((task) => task.status !== 'completed' && task.status !== 'abandoned').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    backlog: tasks.filter((task) => task.status === 'available' && task.worldMapPosition?.continentId === 'backlog').length,
  }), [tasks])

  const createQuest = async () => {
    const task = createEmptyTask(tasks.length)
    task.worldMapPosition = { continentId: 'todo', x: .5, y: .58 }
    await db.tasks.add(task)
    navigate(`/quests/${task.id}`)
  }

  const moveTask = async (
    task: Task,
    status: TaskStatus,
    worldMapPosition: WorldMapPosition,
  ) => {
    const now = new Date().toISOString()
    await db.tasks.put({
      ...task,
      status,
      worldMapPosition,
      updatedAt: now,
      completedAt: status === 'completed' ? task.completedAt ?? now : null,
    })
  }

  const addContinent = () => {
    if (!continentName.trim()) return
    setCustomContinents((current) => [
      ...current,
      createCustomContinent(current.length, {
        name: continentName.trim(),
        subtitle: continentSubtitle.trim() || 'The Unnamed Reach',
        status: continentStatus,
      }),
    ])
    setContinentName('')
    setContinentSubtitle('The Unnamed Reach')
    setContinentModalOpen(false)
  }

  const deleteCustomContinent = async (continent: WorldContinent) => {
    const inhabitants = tasks.filter((task) => task.worldMapPosition?.continentId === continent.id)
    if (inhabitants.length && !window.confirm(
      `Remove “${continent.name}”? Its ${inhabitants.length} quest${inhabitants.length === 1 ? '' : 's'} will return to To Do.`,
    )) return
    if (inhabitants.length) {
      await db.transaction('rw', db.tasks, async () => {
        await Promise.all(inhabitants.map((task, index) => db.tasks.put({
          ...task,
          status: 'available',
          worldMapPosition: { continentId: 'todo', x: .35 + (index % 3) * .16, y: .55 + Math.floor(index / 3) * .1 },
          updatedAt: new Date().toISOString(),
          completedAt: null,
        })))
      })
    }
    setCustomContinents((current) => current.filter((item) => item.id !== continent.id))
  }

  const togglePriority = (priority: Priority) => {
    setPriorities((current) => {
      const next = new Set(current)
      if (next.has(priority)) next.delete(priority)
      else next.add(priority)
      return next
    })
  }

  return (
    <div className="world-map-page">
      <header className="world-map-header">
        <div className="world-map-heading">
          <span className="world-map-compass" aria-hidden="true"><Compass /></span>
          <div>
            <h1>World Map</h1>
            <p>Drag quests across the realms. Explore, plan, and conquer.</p>
          </div>
        </div>

        <div className="world-map-summary" aria-label="Quest map summary">
          <span><strong>{statusCounts.active}</strong> active</span>
          <span><strong>{statusCounts.completed}</strong> legends</span>
          <button onClick={() => setBacklogOpen(true)}><strong>{statusCounts.backlog}</strong> backlog</button>
        </div>

        <div className="world-map-actions">
          <button className="world-map-action" onClick={() => setContinentModalOpen(true)}><MapPlus /> Add Continent</button>
          <button className="world-map-action primary" onClick={() => void createQuest()}><Plus /> New Quest</button>
          <div className="world-map-popover-wrap">
            <button className={`world-map-icon-action ${searchOpen ? 'active' : ''}`} onClick={() => setSearchOpen((value) => !value)} aria-label="Search quests"><Search /></button>
            {searchOpen && (
              <div className="world-map-search-popover">
                <Search />
                <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the realms…" />
                {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X /></button>}
              </div>
            )}
          </div>
          <div className="world-map-popover-wrap">
            <button className={`world-map-icon-action ${filterOpen || priorities.size ? 'active' : ''}`} onClick={() => setFilterOpen((value) => !value)} aria-label="Filter quests"><Filter /></button>
            {filterOpen && (
              <div className="world-map-filter-popover">
                <strong>Quest Difficulty</strong>
                {PRIORITIES.map((priority) => (
                  <label key={priority} className={`priority-${priority}`}>
                    <input type="checkbox" checked={priorities.has(priority)} onChange={() => togglePriority(priority)} />
                    <span>{priority}</span>
                  </label>
                ))}
                <button onClick={() => setPriorities(new Set())}>Show all quests</button>
              </div>
            )}
          </div>
          <button className="world-map-icon-action" onClick={() => setArchiveOpen(true)} aria-label="Open atlas archive"><Settings /></button>
        </div>
      </header>

      <WorkflowWorldMap
        tasks={tasks}
        customContinents={customContinents}
        search={search}
        priorities={priorities}
        backlogOpen={backlogOpen}
        onBacklogOpen={setBacklogOpen}
        onOpenTask={(task) => navigate(`/quests/${task.id}`)}
        onMoveTask={moveTask}
        onDeleteCustomContinent={(continent) => void deleteCustomContinent(continent)}
      />

      <AtlasArchiveDrawer open={archiveOpen} onClose={() => setArchiveOpen(false)} />

      {continentModalOpen && (
        <div className="world-modal-backdrop" role="presentation" onPointerDown={() => setContinentModalOpen(false)}>
          <section className="world-modal" role="dialog" aria-modal="true" aria-labelledby="new-continent-title" onPointerDown={(event) => event.stopPropagation()}>
            <header>
              <div><MapPlus /><h2 id="new-continent-title">Chart a New Continent</h2></div>
              <button onClick={() => setContinentModalOpen(false)} aria-label="Close"><X /></button>
            </header>
            <p>A generated island will become another literal landmass and quest drop zone.</p>
            <label>Continent name<input autoFocus value={continentName} onChange={(event) => setContinentName(event.target.value)} placeholder="e.g. The Ember Coast" /></label>
            <label>Realm subtitle<input value={continentSubtitle} onChange={(event) => setContinentSubtitle(event.target.value)} /></label>
            <label>Workflow stage
              <select value={continentStatus} onChange={(event) => setContinentStatus(event.target.value as TaskStatus)}>
                <option value="available">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">In Review</option>
                <option value="completed">Done</option>
              </select>
            </label>
            <footer><button onClick={() => setContinentModalOpen(false)}>Cancel</button><button className="primary" disabled={!continentName.trim()} onClick={addContinent}>Raise Landmass</button></footer>
          </section>
        </div>
      )}
    </div>
  )
}
