import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Scroll,
  Star,
} from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { Task } from '../types'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDate, isDueToday, isOverdue } from '../utils'

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
    <div className="rounded-xl border border-border bg-surface-raised p-4 hover:border-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {label}
        </span>
        <Icon size={16} className={color} />
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

function TaskRow({ task }: { task: Task }) {
  return (
    <Link
      to={`/quests/${task.id}`}
      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-accent/40 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-medium truncate">{task.title}</div>
        {task.dueDate && (
          <div className="text-xs text-text-muted mt-0.5">
            Due {formatDate(task.dueDate)}
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
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <h2
        className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${accent ?? 'text-text-muted'}`}
      >
        <Icon size={14} />
        {title}
        <span className="text-xs font-normal normal-case">({tasks.length})</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 8).map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
          {tasks.length > 8 && (
            <Link to="/quests" className="text-xs text-accent hover:underline block pt-1">
              View all {tasks.length} →
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

export function DashboardPage() {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const { isTracked } = useAppStore()

  const active = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'abandoned',
  )
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const pendingReview = tasks.filter((t) => t.status === 'pending_review')
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status))
  const dueToday = tasks.filter((t) => isDueToday(t.dueDate, t.status))
  const tracked = tasks.filter((t) => isTracked(t.id) && t.status !== 'completed')
  const recentlyUpdated = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{greeting()}</h1>
        <p className="text-sm text-text-muted mt-1">
          Here&apos;s your quest overview for today
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="In Progress"
          value={inProgress.length}
          icon={Clock}
          color="text-info"
          to="/quests"
        />
        <StatCard
          label="Pending Review"
          value={pendingReview.length}
          icon={CheckCircle2}
          color="text-warning"
          to="/quests"
        />
        <StatCard
          label="Due Today"
          value={dueToday.length}
          icon={Calendar}
          color="text-accent"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={AlertTriangle}
          color="text-danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskSection
          title="Due Today"
          icon={Calendar}
          tasks={dueToday}
          emptyText="Nothing due today"
          accent="text-accent"
        />
        <TaskSection
          title="Overdue"
          icon={AlertTriangle}
          tasks={overdue}
          emptyText="No overdue quests"
          accent="text-danger"
        />
        <TaskSection
          title="Tracked Quests"
          icon={Star}
          tasks={tracked}
          emptyText="No tracked quests — star one in the quest log"
          accent="text-accent"
        />
        <TaskSection
          title="Recently Updated"
          icon={Scroll}
          tasks={recentlyUpdated}
          emptyText="No quests yet"
        />
      </div>

      {active.length === 0 && tasks.length === 0 && (
        <div className="mt-8 text-center py-12 rounded-xl border border-dashed border-border">
          <p className="text-text-muted mb-3">No quests yet. Start your adventure!</p>
          <Link to="/quests" className="text-accent text-sm hover:underline">
            Go to Quest Log →
          </Link>
        </div>
      )}
    </div>
  )
}
