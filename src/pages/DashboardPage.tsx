import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  GitBranch,
  Scroll,
  Star,
} from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { Task } from '../types'
import { PRIORITY_HEX } from '../constants'
import { Card, CardTitle } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDate, isDueToday, isOverdue } from '../utils'
import { cn } from '../utils'

/**
 * The character sheet.
 *
 * WoW opens on a panel that answers "what shape am I in, and what am I
 * meant to be doing" — stats on the left, tracked objectives down the
 * side. This page does the same job for a task list, so it borrows the
 * shape rather than inventing a dashboard grammar.
 */
export function DashboardPage() {
  const tasksQuery = useLiveQuery(() => db.tasks.toArray())
  const isLoading = tasksQuery === undefined
  const tasks = tasksQuery ?? []
  const { isTracked } = useAppStore()

  const active = tasks.filter((t) => t.status !== 'completed' && t.status !== 'abandoned')
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const pendingReview = tasks.filter((t) => t.status === 'pending_review')
  const completed = tasks.filter((t) => t.status === 'completed')
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status))
  const dueToday = tasks.filter((t) => isDueToday(t.dueDate, t.status))
  const tracked = tasks.filter((t) => isTracked(t.id) && t.status !== 'completed')
  const linkedCount = tasks.reduce((n, t) => n + t.linkedItems.length, 0)
  const recentlyUpdated = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // Completion ratio drives the XP bar. Purple is WoW's unrested XP
  // colour (#94008C) — the bar reads as progress toward a level, which
  // is exactly what "share of quests done" means here.
  const completionPct = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Morning'
    if (h < 18) return 'Afternoon'
    return 'Evening'
  }

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-5">
        <h1 className="font-fancy text-3xl text-accent [text-shadow:0_0_14px_rgba(255,209,0,0.25),1px_1px_0_#000]">
          Good {greeting()}
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          {active.length > 0
            ? `${active.length} quest${active.length === 1 ? '' : 's'} await your attention`
            : 'No active quests'}
        </p>
      </div>

      {/* Experience bar — quests completed out of all quests logged */}
      <Card className="mb-5 p-4">
        <div className="tabular mb-1.5 flex items-end justify-between text-[11px]">
          <span className="font-fancy uppercase tracking-[0.15em] text-accent-dim">Progress</span>
          <span className="text-text-muted">
            <span className="text-accent">{completed.length}</span> / {tasks.length} completed ·{' '}
            {completionPct}%
          </span>
        </div>
        <div className="wow-bar h-4 rounded-sm">
          <div
            className="wow-bar-fill rounded-sm"
            data-empty={completionPct === 0}
            style={{
              ['--fill' as string]: completionPct,
              background: 'linear-gradient(180deg,#b81fae,#94008c 55%,#6a0064)',
            }}
          />
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In Progress" value={inProgress.length} icon={Clock} color="text-q-rare" to="/quests" />
        <StatCard label="Turn In" value={pendingReview.length} icon={CheckCircle2} color="text-warning" to="/quests" />
        <StatCard label="Due Today" value={dueToday.length} icon={Calendar} color="text-accent" />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} color="text-danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TaskSection title="Due Today" icon={Calendar} tasks={dueToday} emptyText="Nothing due today" />
        <TaskSection title="Overdue" icon={AlertTriangle} tasks={overdue} emptyText="No overdue quests" accent="text-danger" />
        <TaskSection title="Tracked" icon={Star} tasks={tracked} emptyText="Star a quest to track it here" />
        <TaskSection title="Recent Activity" icon={Scroll} tasks={recentlyUpdated} emptyText="No quests yet" />
      </div>

      {linkedCount > 0 && (
        <Link to="/integrations" className="mt-4 block">
          <Card interactive className="flex items-center gap-3 p-4">
            <div className="wow-slot flex h-9 w-9 items-center justify-center rounded text-accent">
              <GitBranch size={16} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="font-fancy text-sm text-text">Portals</div>
              <div className="text-[11px] text-text-dim">
                {linkedCount} quest{linkedCount === 1 ? '' : 's'} bound to GitHub or Jira
              </div>
            </div>
            <span className="text-accent">→</span>
          </Card>
        </Link>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-text-muted" role="status">
          Loading character…
        </p>
      ) : (
        tasks.length === 0 && (
          <Card className="mt-6 py-12 text-center" variant="ornate">
            <p className="font-fancy mb-3 text-lg text-accent-dim">Your journey begins</p>
            <p className="mb-4 text-sm text-text-dim">No quests logged yet.</p>
            <Link to="/quests" className="text-sm text-accent hover:underline">
              Open the Quest Log →
            </Link>
          </Card>
        )
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  to,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  to?: string
}) {
  const content = (
    <Card interactive={Boolean(to)} className="p-3.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-fancy text-[10px] uppercase tracking-[0.15em] text-text-dim">
          {label}
        </span>
        <Icon size={15} className={color} aria-hidden="true" />
      </div>
      <div className={cn('tabular text-3xl leading-none', value > 0 ? color : 'text-text-dim')}>
        {value}
      </div>
    </Card>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function TaskRow({ task }: { task: Task }) {
  const done = task.status === 'completed'
  return (
    <Link
      to={`/quests/${task.id}`}
      className="wow-hilight flex items-center gap-2 rounded-sm border border-frame-dark bg-surface-raised/60 px-2.5 py-1.5 text-sm shadow-[0_0_0_1px_rgba(107,74,24,0.35)]"
    >
      <span
        aria-hidden="true"
        className="h-5 w-0.5 shrink-0 rounded-full"
        style={{ background: PRIORITY_HEX[task.priority] }}
      />
      <div className="min-w-0 flex-1">
        <div className={cn('truncate', done ? 'text-ot-complete' : 'text-ot-normal')}>
          {task.title}
        </div>
        {task.dueDate && (
          <div className="tabular mt-0.5 text-[10px] text-text-dim">
            {formatDate(task.dueDate)}
          </div>
        )}
      </div>
      <StatusBadge status={task.status} />
    </Link>
  )
}

function TaskSection({
  title,
  icon: Icon,
  tasks,
  emptyText,
  accent,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  tasks: Task[]
  emptyText: string
  accent?: string
}) {
  return (
    <Card className="p-4">
      <CardTitle>
        <span className="inline-flex items-center gap-1.5">
          <Icon size={13} className={accent ?? 'text-accent-dim'} aria-hidden="true" />
          {title}
          <span className="tabular text-[11px] text-text-dim">({tasks.length})</span>
        </span>
      </CardTitle>
      {tasks.length === 0 ? (
        <p className="text-xs text-text-dim">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.slice(0, 6).map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
          {tasks.length > 6 && (
            <Link to="/quests" className="block pt-1 text-[11px] text-accent hover:underline">
              View all {tasks.length} →
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}
