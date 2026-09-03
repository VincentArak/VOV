import { Link } from 'react-router-dom'
import { ChevronRight, GitMerge, Layers, Target } from 'lucide-react'
import type { Mission, Task } from '../types'
import { getMissionAncestors } from '../utils'
import { ProgressBar } from './ui/ProgressBar'
import { cn } from '../utils'

/**
 * The epic a quest belongs to, and how far that epic has shipped.
 *
 * Missions are already a nestable tree in the data model, which makes them
 * this project's equivalent of a Jira epic — but a quest only ever showed
 * the flat name of its immediate mission, so you could not see where the
 * work sat in the wider effort or how much of that effort was actually
 * merged. This renders the full ancestry as a trail and rolls the sibling
 * quests' git state up to the epic level.
 */
export function QuestEpic({
  task,
  missions,
  allTasks,
}: {
  task: Task
  missions: Mission[]
  allTasks: Task[]
}) {
  if (!task.missionId) return null
  const mission = missions.find((m) => m.id === task.missionId)
  if (!mission) return null

  const ancestors = getMissionAncestors(mission.id, missions)
  const trail = [...ancestors, mission]

  // Roll up every quest under this mission, including quests on missions
  // nested beneath it — an epic's progress is the whole subtree, not just
  // the leaf its siblings happen to sit on.
  const descendantIds = new Set<string>([mission.id])
  let grew = true
  while (grew) {
    grew = false
    for (const m of missions) {
      if (m.parentId && descendantIds.has(m.parentId) && !descendantIds.has(m.id)) {
        descendantIds.add(m.id)
        grew = true
      }
    }
  }

  const siblings = allTasks.filter((t) => t.missionId && descendantIds.has(t.missionId))
  const done = siblings.filter((t) => t.status === 'completed').length
  const merged = siblings.filter((t) =>
    t.linkedItems.some((l) => l.provider === 'github' && l.status === 'merged'),
  ).length
  const unbound = siblings.filter((t) => t.linkedItems.length === 0).length

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header">Epic</h3>
        <div className="wow-divider flex-1" />
      </div>

      <div className="rounded-sm border border-frame-dark bg-surface-sunken/50 p-3 shadow-[inset_0_0_14px_rgba(0,0,0,0.5)]">
        {/* Ancestry trail: the outermost epic first, this quest last. */}
        <nav aria-label="Epic ancestry" className="mb-2.5 flex flex-wrap items-center gap-1">
          {trail.map((m, i) => {
            const last = i === trail.length - 1
            return (
              <span key={m.id} className="inline-flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight size={11} className="text-text-dim" aria-hidden="true" />
                )}
                <Link
                  to="/missions"
                  className={cn(
                    'inline-flex items-center gap-1 text-[12px] hover:text-accent',
                    last ? 'text-accent' : 'text-text-muted',
                  )}
                >
                  {i === 0 ? (
                    <Layers size={11} aria-hidden="true" />
                  ) : (
                    <Target size={10} aria-hidden="true" />
                  )}
                  {m.name}
                </Link>
              </span>
            )
          })}
          <ChevronRight size={11} className="text-text-dim" aria-hidden="true" />
          <span className="truncate text-[12px] text-text-dim">{task.title}</span>
        </nav>

        {/* The roll-up covers the quest's immediate epic and anything nested
            under it — naming it stops the bar reading as progress on the
            outermost epic in the trail. */}
        <ProgressBar done={done} total={siblings.length} label={`in ${mission.name}`} />

        <div className="tabular mt-2 flex flex-wrap items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-q-epic">
            <GitMerge size={11} aria-hidden="true" />
            {merged}/{siblings.length} merged
          </span>
          {unbound > 0 && (
            <span className="text-text-dim">
              {unbound} not bound to a PR or ticket
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
