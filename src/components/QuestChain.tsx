import { Link } from 'react-router-dom'
import { Check, GitBranch, GitMerge, GitPullRequest, Lock, Ticket } from 'lucide-react'
import type { LinkedItem, Task } from '../types'
import { cn } from '../utils'

/**
 * A quest chain, in the game's sense: the prerequisites that unlock this
 * quest, the quest itself, and what it unlocks in turn.
 *
 * The chain already exists in the data as `dependencyIds` — it just had no
 * visual form, so the shape of a piece of work spread across several
 * tickets was invisible unless you clicked through them one at a time.
 * Rendering it with each link's git state attached answers the question
 * that actually blocks people: not "what depends on what", but "how far
 * has the chain physically shipped, and which link is stuck".
 */

type ChainRole = 'prerequisite' | 'current' | 'unlocks'

function gitStateOf(items: LinkedItem[]): {
  label: string
  tone: string
  icon: React.ReactNode
} | null {
  const gh = items.find((i) => i.provider === 'github')
  const jira = items.find((i) => i.provider === 'jira')

  if (gh?.status === 'merged') {
    return { label: 'merged', tone: 'text-q-epic', icon: <GitMerge size={11} aria-hidden="true" /> }
  }
  if (gh?.status === 'closed') {
    return { label: 'closed', tone: 'text-text-dim', icon: <GitPullRequest size={11} aria-hidden="true" /> }
  }
  if (gh?.status === 'draft') {
    return { label: 'draft', tone: 'text-text-muted', icon: <GitPullRequest size={11} aria-hidden="true" /> }
  }
  if (gh?.status === 'open') {
    return { label: 'open', tone: 'text-success', icon: <GitPullRequest size={11} aria-hidden="true" /> }
  }
  if (gh) {
    return { label: gh.externalId.split('#')[1] ? `#${gh.externalId.split('#')[1]}` : 'linked', tone: 'text-text-muted', icon: <GitBranch size={11} aria-hidden="true" /> }
  }
  if (jira) {
    return { label: jira.externalId, tone: 'text-q-heirloom', icon: <Ticket size={11} aria-hidden="true" /> }
  }
  return null
}

function ChainNode({
  task,
  role,
  blocked,
}: {
  task: Task
  role: ChainRole
  /** Waiting on an earlier link — not merely unfinished. */
  blocked: boolean
}) {
  const git = gitStateOf(task.linkedItems)
  const done = task.status === 'completed'
  const current = role === 'current'

  return (
    <div className="flex items-start gap-2.5">
      {/* Marker states are done / blocked / open. The padlock means "an
          earlier link is holding this up", not simply "unfinished" — an
          upstream quest that is merely in progress is not locked, and
          drawing it that way made every node in the chain look stuck. */}
      <div className="relative flex flex-col items-center self-stretch">
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
            done && 'border-success bg-success/25 text-success',
            !done && blocked && 'border-warning/60 bg-warning/10 text-warning',
            !done && !blocked && current && 'border-accent bg-accent/20 text-accent',
            !done && !blocked && !current && 'border-gold-lo bg-surface-overlay text-text-muted',
          )}
        >
          {done ? (
            <Check size={10} strokeWidth={3} />
          ) : blocked ? (
            <Lock size={9} />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1 pb-2">
        <Link
          to={`/quests/${task.id}`}
          className={cn(
            'block truncate text-[13px] hover:text-accent',
            current && 'text-accent',
            !current && done && 'text-ot-complete',
            !current && !done && 'text-ot-normal',
          )}
        >
          {current && <span className="mr-1 text-text-dim">▸</span>}
          {task.title}
        </Link>
        <div className="tabular mt-0.5 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="uppercase tracking-wider text-text-dim">
            {role === 'prerequisite' ? 'Requires' : role === 'unlocks' ? 'Unlocks' : 'This quest'}
          </span>
          {git && (
            <span className={cn('inline-flex items-center gap-1', git.tone)}>
              {git.icon}
              {git.label}
            </span>
          )}
          {!git && <span className="text-text-dim/60">no binding</span>}
        </div>
      </div>
    </div>
  )
}

export function QuestChain({ task, allTasks }: { task: Task; allTasks: Task[] }) {
  const byId = new Map(allTasks.map((t) => [t.id, t]))
  const prerequisites = task.dependencyIds
    .map((id) => byId.get(id))
    .filter((t): t is Task => Boolean(t))
  const unlocks = allTasks.filter((t) => t.dependencyIds.includes(task.id))

  // A quest with nothing either side of it is not a chain; rendering an
  // empty diagram would be noise on every standalone task.
  if (prerequisites.length === 0 && unlocks.length === 0) return null

  const allMet = prerequisites.every((p) => p.status === 'completed')
  const shipped = prerequisites.filter(
    (p) => p.linkedItems.some((l) => l.status === 'merged'),
  ).length

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header">
          Quest Chain
        </h3>
        <span className="tabular text-[11px] text-text-dim">
          ({prerequisites.length + 1 + unlocks.length} links
          {prerequisites.length > 0 && ` · ${shipped}/${prerequisites.length} merged`})
        </span>
        <div className="wow-divider flex-1" />
      </div>

      <div className="relative rounded-sm border border-frame-dark bg-surface-sunken/50 py-3 pl-3 pr-3 shadow-[inset_0_0_14px_rgba(0,0,0,0.5)]">
        {/* The rail every node hangs off — the chain itself. */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-gold-lo/70 via-gold-lo/40 to-gold-lo/70"
        />
        <div className="relative">
          {/* Upstream links are never drawn as blocked: whatever gates them
              lives further up a chain this view does not reach. */}
          {prerequisites.map((p) => (
            <ChainNode key={p.id} task={p} role="prerequisite" blocked={false} />
          ))}
          <ChainNode task={task} role="current" blocked={!allMet} />
          {unlocks.map((u) => (
            <ChainNode key={u.id} task={u} role="unlocks" blocked={task.status !== 'completed'} />
          ))}
        </div>
      </div>

      {!allMet && (
        <p className="mt-1.5 text-[11px] text-warning">
          Blocked — {prerequisites.filter((p) => p.status !== 'completed').length} earlier link
          {prerequisites.filter((p) => p.status !== 'completed').length === 1 ? '' : 's'} still
          open.
        </p>
      )}
    </section>
  )
}
