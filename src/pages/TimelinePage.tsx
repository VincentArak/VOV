import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import { QuestTimeline } from '../components/QuestTimeline'
import { Select } from '../components/ui/Select'
import { isTaskOpen } from '../utils'

export function TimelinePage() {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const [pastDays, setPastDays] = useState('7')
  const [futureDays, setFutureDays] = useState('28')

  const openTasks = tasks.filter((t) => isTaskOpen(t.status))
  const withDue = openTasks.filter((t) => t.dueDate)
  const overdue = withDue.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString()),
  )

  return (
    <div className="p-6 max-w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarRange size={24} className="text-accent" />
            Timeline
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Open quests as lines pointing toward their due dates · {withDue.length} on timeline
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            label="Past"
            value={pastDays}
            onChange={(e) => setPastDays(e.target.value)}
            options={[
              { value: '3', label: '3 days' },
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
            ]}
            className="w-32"
          />
          <Select
            label="Future"
            value={futureDays}
            onChange={(e) => setFutureDays(e.target.value)}
            options={[
              { value: '14', label: '14 days' },
              { value: '28', label: '28 days' },
              { value: '60', label: '60 days' },
              { value: '90', label: '90 days' },
            ]}
            className="w-32"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="rounded-lg border border-border bg-surface-raised px-4 py-2">
          <span className="text-text-muted">Open </span>
          <span className="font-semibold">{openTasks.length}</span>
        </div>
        <div className="rounded-lg border border-border bg-surface-raised px-4 py-2">
          <span className="text-text-muted">With deadline </span>
          <span className="font-semibold">{withDue.length}</span>
        </div>
        <div className="rounded-lg border border-border bg-surface-raised px-4 py-2">
          <span className="text-text-muted">Overdue </span>
          <span className="font-semibold text-danger">{overdue.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-accent rounded" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-info rounded" /> Line → due date
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-danger" /> Overdue
        </span>
      </div>

      <QuestTimeline
        tasks={tasks}
        pastDays={Number(pastDays)}
        futureDays={Number(futureDays)}
      />
    </div>
  )
}
