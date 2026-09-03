import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CircleGauge,
  GitBranch,
  Hand,
  Scroll,
  Star,
  SunMedium,
} from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { Task } from '../types'
import { PRIORITY_HEX } from '../constants'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDate, isDueToday, isOverdue } from '../utils'
import { cn } from '../utils'

/**
 * Character overview rendered as an old quest ledger. The query and all links
 * deliberately stay on the existing data model; only the presentation changes.
 */
export function DashboardPage() {
  const tasksQuery = useLiveQuery(() => db.tasks.toArray())
  const isLoading = tasksQuery === undefined
  const tasks = tasksQuery ?? []
  const { isTracked } = useAppStore()

  const active = tasks.filter((task) => task.status !== 'completed' && task.status !== 'abandoned')
  const inProgress = tasks.filter((task) => task.status === 'in_progress')
  const pendingReview = tasks.filter((task) => task.status === 'pending_review')
  const completed = tasks.filter((task) => task.status === 'completed')
  const overdue = tasks.filter((task) => isOverdue(task.dueDate, task.status))
  const dueToday = tasks.filter((task) => isDueToday(task.dueDate, task.status))
  const tracked = tasks.filter((task) => isTracked(task.id) && task.status !== 'completed')
  const linkedCount = tasks.reduce((count, task) => count + task.linkedItems.length, 0)
  const recentlyUpdated = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const completionPct = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'

  return (
    <div className="dashboard-shell">
      <div className="frame-overlay" aria-hidden="true">
        <span className="frame-edge frame-edge-top" />
        <span className="frame-edge frame-edge-right" />
        <span className="frame-edge frame-edge-bottom" />
        <span className="frame-edge frame-edge-left" />
        <span className="frame-wax">
          <img src="/wax-seal-v3.png" alt="" />
        </span>
      </div>

      <div className="dashboard-ledger">
        <header className="ledger-header">
          <div className="illuminated-initial" aria-hidden="true">G</div>
          <div className="ledger-greeting">
            <h1>Good {greeting}</h1>
            <p>
              {active.length > 0
                ? `${active.length} quest${active.length === 1 ? '' : 's'} await your attention`
                : 'No active quests'}
              <span className="header-flourish" aria-hidden="true">◆ ── ◇</span>
            </p>
          </div>
        </header>

        <section className="parchment-panel progress-panel" aria-label="Quest completion progress">
          <div className="progress-heading">
            <span>Progress</span>
            <span className="tabular">
              {completed.length} / {tasks.length} completed · {completionPct}%
            </span>
          </div>
          <div className="ledger-progress-track">
            <div
              className="ledger-progress-fill"
              data-empty={completionPct === 0 || undefined}
              style={{ width: `${completionPct}%` }}
            >
              <span className="ledger-progress-flame" aria-hidden="true" />
            </div>
          </div>
        </section>

        <div className="stats-grid">
          <StatCard label="In Progress" value={inProgress.length} icon={CircleGauge} to="/quests" />
          <StatCard label="Turn In" value={pendingReview.length} icon={Hand} to="/quests" />
          <StatCard label="Due Today" value={dueToday.length} icon={SunMedium} to="/quests" />
          <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} tone="danger" to="/quests" />
        </div>

        <div className="task-sections-grid">
          <TaskSection title="Due Today" icon={Calendar} tasks={dueToday} emptyText="Nothing due today" />
          <TaskSection
            title="Overdue"
            icon={AlertTriangle}
            tasks={overdue}
            emptyText="No overdue quests"
            tone="danger"
          />
          <TaskSection title="Tracked" icon={Star} tasks={tracked} emptyText="Star a quest to track it here" />
          <TaskSection title="Recent Activity" icon={Scroll} tasks={recentlyUpdated} emptyText="No quests yet" />
        </div>

        <section className="parchment-panel journey-panel">
          <div className="journey-copy">
            <h2>{tasks.length === 0 ? 'Your journey begins' : 'The chronicle continues'}</h2>
            <p>
              {tasks.length === 0
                ? 'No quests logged yet.'
                : `${active.length} active · ${completed.length} completed`}
            </p>
            <Link to="/quests" className="quest-log-link">
              Open the Quest Log <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </div>
          {linkedCount > 0 && (
            <Link to="/integrations" className="portal-link">
              <GitBranch size={14} aria-hidden="true" />
              {linkedCount} bound portal{linkedCount === 1 ? '' : 's'}
            </Link>
          )}
        </section>

        {isLoading && <p className="ledger-loading" role="status">Opening the ledger…</p>}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  tone?: 'danger'
  to: string
}) {
  return (
    <Link to={to} className={cn('parchment-panel stat-card', tone === 'danger' && 'ink-danger')}>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="tabular">{value}</strong>
      </div>
      <Icon size={50} strokeWidth={1.15} className="stat-icon" aria-hidden="true" />
    </Link>
  )
}

function TaskRow({ task }: { task: Task }) {
  const done = task.status === 'completed'
  return (
    <Link to={`/quests/${task.id}`} className="ledger-task-row">
      <span
        aria-hidden="true"
        className="task-priority-mark"
        style={{ background: PRIORITY_HEX[task.priority] }}
      />
      <div className="min-w-0 flex-1">
        <div className={cn('truncate', done && 'task-title-complete')}>{task.title}</div>
        {task.dueDate && <div className="tabular task-date">{formatDate(task.dueDate)}</div>}
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
  tone,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  tasks: Task[]
  emptyText: string
  tone?: 'danger'
}) {
  return (
    <section className={cn('parchment-panel task-section', tone === 'danger' && 'ink-danger')}>
      <div className="task-section-title">
        <Icon size={23} strokeWidth={1.55} aria-hidden="true" />
        <h2>{title}</h2>
        <span className="tabular">({tasks.length})</span>
      </div>
      <div className="ornament-rule" aria-hidden="true"><span /></div>
      {tasks.length === 0 ? (
        <p className="task-empty">{emptyText}</p>
      ) : (
        <div className="task-list">
          {tasks.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} />)}
          {tasks.length > 6 && (
            <Link to="/quests" className="task-view-all">View all {tasks.length} quests →</Link>
          )}
        </div>
      )}
    </section>
  )
}
